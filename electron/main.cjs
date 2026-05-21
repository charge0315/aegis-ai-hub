const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fastify = require('fastify');
const cors = require('@fastify/cors');

// アプリケーションの基本設定
app.setName('Aegis Nexus');

// サービスを動的にインポート
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

// [ユーティリティ: データディレクトリの取得と初期化]
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

async function startBackend() {
  console.log('[Main] Starting backend services...');
  
  settingsManager = new ElectronSettingsManager({ dataDir, isDev });
  await settingsManager.init();

  const apiKey = await settingsManager.getApiKey();
  geminiService = new GeminiService(apiKey);
  
  const feedConfigPath = path.join(dataDir, 'feed_config.json');
  feedManager = new FeedManager(feedConfigPath);
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 400,
    minHeight: 300,
    useContentSize: true,
    frame: false,
    icon: path.join(__dirname, '../public/app-icon.png'),
 // カスタムタイトルバーを使用
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

  // OrchestratorにwebContentsをセット（IPC通知用）
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
    
    // 初回フェッチ
    settingsManager.getInterests().then(interests => {
      scraper.fetchAndProcessArticlesWithFallback(interests).then(articles => {
        console.log(`[Main] Initial fetch completed: ${articles.length} articles.`);
      });
    });
  });
}

// [IPC ハンドラー]
function setupIpcHandlers() {
  ipcMain.handle('get-articles', async () => {
    const interests = await settingsManager.getInterests();
    const dashboardData = await scraper.getDashboard(interests);
    // 既存の frontend 実装と互換性を持たせるため、フラットな配列として返す
    const allArticles = [];
    Object.values(dashboardData).forEach(group => {
      if (group?.articles) allArticles.push(...group.articles);
    });
    return allArticles.sort((a, b) => b.score - a.score).slice(0, 500);
  });

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

  ipcMain.handle('suggest-category', async (event, name) => {
    return await geminiService.suggestCategoryDetails(name);
  });

  ipcMain.handle('discover-trends', async () => {
    const interests = await settingsManager.getInterests();
    const suggestions = await scraper.discoverTrends(interests);
    return { suggestions };
  });

  ipcMain.handle('restructure-categories', async (event, count, language) => {
    const interests = await settingsManager.getInterests();
    return await discoveryService.getRestructureProposal(interests, count, language || 'ja');
  });

  ipcMain.handle('translate-interests', async (event, settings) => {
    return await discoveryService.translateInterests(settings);
  });

  ipcMain.handle('get-api-key', async () => {
    return await settingsManager.getApiKey();
  });

  ipcMain.handle('save-api-key', async (event, key) => {
    await settingsManager.saveApiKey(key);
    geminiService.updateApiKey(key);
    return { success: true };
  });

  ipcMain.handle('get-ui-settings', async () => {
    return await settingsManager.getUiSettings();
  });

  ipcMain.handle('save-ui-settings', async (event, settings) => {
    await settingsManager.saveUiSettings(settings);
    
    // 自動起動設定の反映
    if (app.isPackaged) {
      app.setLoginItemSettings({
        openAtLogin: settings.autoLaunch,
        path: app.getPath('exe')
      });
    }

    return { success: true };
  });

  ipcMain.handle('get-usage-stats', async () => {
    return await settingsManager.getUsageStats();
  });

  ipcMain.handle('reset-to-defaults', async (event, lang) => {
    const success = await settingsManager.resetToDefaults(lang || 'ja');
    return { success };
  });

  ipcMain.on('window-control', (event, action) => {
    if (!mainWindow) return;
    switch (action) {
      case 'minimize': mainWindow.minimize(); break;
      case 'maximize': mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); break;
      case 'close': mainWindow.close(); break;
      case 'quit': app.quit(); break;
    }
  });

  // 外部リンクをブラウザで開く
  ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
  });
}

// [ライフサイクル]
app.whenReady().then(async () => {
  await startBackend();
  setupIpcHandlers();

  // 起動時に自動起動設定を反映
  const uiSettings = await settingsManager.getUiSettings();
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: uiSettings.autoLaunch,
      path: app.getPath('exe')
    });
  }

  createWindow();

  globalShortcut.register('CommandOrControl+Shift+I', () => {
    mainWindow?.webContents.toggleDevTools();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
