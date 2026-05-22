/**
 * Aegis Nexus - Electron Main Process
 * 
 * 役割:
 * - アプリケーションのライフサイクル管理（起動、終了、OS統合）。
 * - バックエンドサービス（Fastify, GeminiService, RSSFetcher等）の初期化と統括。
 * - レンダラープロセス（Frontend）とのIPC通信の仲介。
 * - ウィンドウ管理およびOSネイティブ機能（通知領域、自動起動等）の提供。
 * 
 * 設計思想:
 * - ハイブリッド構成: Electronのメインプロセス内で軽量なFastifyサーバーを稼働させ、
 *   REST APIとIPCの両面から堅牢なデータアクセスを提供。
 * - OS統合の最適化: FancyZones対応のウィンドウ設定、ログイン時自動起動、カスタムタイトルバーの実装により、
 *   デスクトップアプリとしてのネイティブな体験を追求。
 * - 回復性: ユーザーデータディレクトリの自動初期化と、デフォルト設定の自動復元機能を搭載。
 */

const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const fastify = require('fastify');
const cors = require('@fastify/cors');

// アプリケーションの表示名をOSレベルで設定
app.setName('Aegis Nexus');

// サービスを動的にインポート（CommonJS環境）
const { ElectronSettingsManager } = require('./ElectronSettingsManager');
const { GeminiService } = require('../src/services/GeminiService');
const { FeedManager } = require('../src/services/FeedManager');
const { DiscoveryService } = require('../src/services/DiscoveryService');
const { EnrichmentService } = require('../src/services/EnrichmentService');
const { RSSFetcher } = require('../src/services/RSSFetcher');
const { ScoringService } = require('../src/services/ScoringService');
const { nexusRouter } = require('../src/api/server/NexusRouter');
const { ScraperFacade } = require('../src/ScraperFacade');
const { NexusOrchestrator } = require('../src/core/NexusOrchestrator');

let mainWindow;
let tray;
let settingsManager;
let scraper;
let discoveryService;
let orchestrator;
let geminiService;
let rssFetcher;
let feedManager;
let enrichmentService;

const isDev = !app.isPackaged;

/**
 * [ユーティリティ: データディレクトリの取得と初期化]
 * 
 * 設計意図:
 * - OSごとに異なる「ユーザーデータ保存場所」を抽象化。
 * - 初回起動時や設定破損時に、パッケージ内のデフォルト設定(interests.json等)を自動コピーし、
 *   アプリが常に正常な状態で起動できるようにする。
 */
function setupDataDirectory() {
  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');
  
  if (!fs.existsSync(dataDir)) {
    console.log('[Main] Creating data directory...');
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // パッケージ内のデフォルトデータを取得
  const defaultDataDir = isDev 
    ? path.join(__dirname, '..', 'data')
    : path.join(process.resourcesPath, 'default-data');

  if (fs.existsSync(defaultDataDir)) {
    const requiredFiles = ['interests.json', 'feed_config.json'];
    for (const file of requiredFiles) {
      const destPath = path.join(dataDir, file);
      const srcPath = path.join(defaultDataDir, file);
      
      // ファイルが存在しないか、サイズが極端に小さい（壊れている）場合のみコピー
      if (fs.existsSync(srcPath) && (!fs.existsSync(destPath) || fs.statSync(destPath).size < 5)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`[Main] Restored default ${file} to user data directory.`);
      }
    }
  }
  return dataDir;
}

const dataDir = setupDataDirectory();

/**
 * バックエンドサービス群の初期化と内部APIサーバーの起動。
 * 
 * 背景:
 * - フロントエンドからの重い処理要求（AI解析、大量フィード取得）を、
 *   メインプロセスのバックグラウンドで効率的に処理するために、独立したサービスインスタンスを生成。
 */
async function startBackend() {
  console.log('[Main] Starting backend services...');
  
  settingsManager = new ElectronSettingsManager({ dataDir, isDev });
  await settingsManager.init();

  const apiKey = await settingsManager.getApiKey();
  geminiService = new GeminiService(apiKey);
  
  const feedConfigPath = path.join(dataDir, 'feed_config.json');
  feedManager = new FeedManager(feedConfigPath);
  // SettingsManagerの安全な書き込み機能を共有する
  feedManager.setSaveHandler(async (config) => {
    await settingsManager.saveFeedConfig(config);
  });
  await feedManager.loadConfig(); // 重要: 設定を読み込む
  
  rssFetcher = new RSSFetcher();
  
  discoveryService = new DiscoveryService(geminiService, rssFetcher, feedManager);
  enrichmentService = new EnrichmentService(geminiService, dataDir);
  scraper = new ScraperFacade('', feedConfigPath, dataDir);
  // ScraperFacade内部のサービスを共有インスタンスに差し替え
  scraper.rssFetcher = rssFetcher;
  scraper.geminiService = geminiService;
  scraper.enrichmentService = enrichmentService;
  scraper.feedManager = feedManager;

  orchestrator = new NexusOrchestrator(geminiService);

  // 内部サーバー (Browser Fallback / SSE 用)
  const server = fastify({ logger: isDev });
  await server.register(cors, { origin: '*' });
  
  await server.register(nexusRouter, {
    prefix: '/api/v5',
    scraper,
    evolution: discoveryService,
    orchestrator,
    settingsManager
  });

  server.get('/api/dashboard', async () => {
    const interests = await settingsManager.getInterests();
    return await scraper.getDashboard(interests);
  });

  try {
    await server.listen({ port: 3005, host: '127.0.0.1' });
    console.log('[Main] Internal Fastify server listening on http://127.0.0.1:3005');
  } catch (err) {
    console.error('[Main] Failed to start internal Fastify server:', err);
  }
}

/**
 * メインウィンドウの作成。
 * 
 * 設計意図:
 * - `frame: false`: OS標準の枠を消し、独自のUIデザインを統一。
 * - `thickFrame: true`: WindowsのFancyZonesやスナップレイアウトを有効化するための設定。
 * - `backgroundColor`: 読み込み中のチラつきを防ぐため、テーマ色と一致させる。
 */
function createWindow() {
  const iconPath = path.join(__dirname, '../public/app-icon-192.png');
  const icon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 400,
    minHeight: 300,
    useContentSize: true,
    frame: false,
    icon: icon,
    transparent: false, // FancyZones対応のため透明度はオフ
    backgroundColor: '#0f172a',
    resizable: true, // 明示的に有効化
    hasShadow: true,
    thickFrame: true, // Windowsでのスナップ(FancyZones)対応に必須
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // OrchestratorにwebContentsをセット（バックグラウンドからUIへの通知用）
  if (orchestrator && typeof orchestrator.setWebContents === 'function') {
    orchestrator.setWebContents(mainWindow.webContents);
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 起動時の初期フェッチ（即座にコンテンツを表示）
    settingsManager.getInterests().then(interests => {
      scraper.fetchAndProcessArticlesWithFallback(interests).then(articles => {
        console.log(`[Main] Initial fetch completed: ${articles.length} articles.`);
      });
    });
  });
}

/**
 * [IPC ハンドラー]
 * 
 * 設計思想:
 * - プリロードスクリプトを介して、安全にフロントエンドへバックエンド機能（AI, 設定管理）を露出させる。
 */
function setupIpcHandlers() {
  // 記事データの取得
  ipcMain.handle('get-articles', async () => {
    const interests = await settingsManager.getInterests();
    const dashboardData = await scraper.getDashboard(interests);
    const allArticles = [];
    Object.values(dashboardData).forEach(group => {
      if (group?.articles) allArticles.push(...group.articles);
    });
    return allArticles.sort((a, b) => b.score - a.score).slice(0, 500);
  });

  // 設定情報の同期
  ipcMain.handle('get-settings', async () => {
    const interests = await settingsManager.getInterests();
    const feedConfig = await settingsManager.getFeedConfig();
    return { interests, feedConfig };
  });

  ipcMain.handle('sync-settings', async (event, settings) => {
    const result = await settingsManager.syncSettings(settings, rssFetcher);
    if (feedManager) feedManager.config = result.validatedFeedConfig;
    return result;
  });

  // AIによるカテゴリ詳細（ブランド、キーワード）の提案
  ipcMain.handle('suggest-category', async (event, name) => {
    return await geminiService.suggestCategoryDetails(name);
  });

  // 最新記事からのトレンド発見
  ipcMain.handle('discover-trends', async () => {
    const interests = await settingsManager.getInterests();
    const suggestions = await scraper.discoverTrends(interests);
    return { suggestions };
  });

  // カテゴリ再構築（大規模整理）
  ipcMain.handle('restructure-categories', async (event, count, language) => {
    const interests = await settingsManager.getInterests();
    return await discoveryService.getRestructureProposal(interests, count, language || 'ja');
  });

  // 設定の全翻訳
  ipcMain.handle('translate-interests', async (event, settings) => {
    return await discoveryService.translateInterests(settings);
  });

  // APIキー管理
  ipcMain.handle('get-api-key', async () => {
    return await settingsManager.getApiKey();
  });

  ipcMain.handle('save-api-key', async (event, key) => {
    await settingsManager.saveApiKey(key);
    geminiService.updateApiKey(key);
    return { success: true };
  });

  // UI設定（テーマ、自動起動等）
  ipcMain.handle('get-ui-settings', async () => {
    return await settingsManager.getUiSettings();
  });

  ipcMain.handle('save-ui-settings', async (event, settings) => {
    await settingsManager.saveUiSettings(settings);
    
    // OSレベルでの自動起動設定の反映
    if (app.isPackaged) {
      app.setLoginItemSettings({
        openAtLogin: settings.autoLaunch,
        path: app.getPath('exe')
      });
    }

    return { success: true };
  });

  // AI使用統計
  ipcMain.handle('get-usage-stats', async () => {
    return await settingsManager.getUsageStats();
  });

  // 初期状態へのリセット
  ipcMain.handle('reset-to-defaults', async (event, lang) => {
    const success = await settingsManager.resetToDefaults(lang || 'ja');
    return { success };
  });

  // カスタムタイトルバーからのウィンドウ操作
  ipcMain.on('window-control', (event, action) => {
    if (!mainWindow) return;
    switch (action) {
      case 'minimize': mainWindow.minimize(); break;
      case 'maximize': mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); break;
      case 'close': mainWindow.close(); break;
      case 'quit': app.quit(); break;
    }
  });

  // 外部リンクをデフォルトブラウザで開く
  ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
  });
}

/**
 * アプリケーションの起動ライフサイクル。
 */
app.whenReady().then(async () => {
  await startBackend();
  setupIpcHandlers();

  // 起動時に最新の自動起動設定をOSに同期
  const uiSettings = await settingsManager.getUiSettings();
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: uiSettings.autoLaunch,
      path: app.getPath('exe')
    });
  }

  createWindow();

  // 開発者用ショートカット
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    mainWindow?.webContents.toggleDevTools();
  });
});

app.on('window-all-closed', () => {
  // macOS以外ではウィンドウが閉じられたらアプリを終了
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  // macOSのドックアイコンクリック時の挙動
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
