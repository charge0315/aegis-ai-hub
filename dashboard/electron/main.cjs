const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// サービスのインポート (TypeScriptファイルの動的読み込み)
const SettingsManager = require('./services/SettingsManager').default;
const { GeminiService } = require('./services/GeminiService');
const { FeedManager } = require('./services/FeedManager');
const { DiscoveryService } = require('./services/DiscoveryService');
const { EnrichmentService } = require('./services/EnrichmentService');
const { RSSFetcher } = require('./services/RSSFetcher');
const { ScoringService } = require('./services/ScoringService');

let mainWindow;
let tray;
let geminiService;
let feedManager;
let rssFetcher;
let discoveryService;
let enrichmentService;

async function initBackend() {
  console.log('[Main] Backend services initializing...');
  
  // 1. 設定マネージャーの初期化（ディレクトリ作成など）
  await SettingsManager.init();
  
  // 2. インスタンス生成
  const apiKey = await SettingsManager.getApiKey();
  geminiService = new GeminiService(apiKey);
  
  const feedConfigPath = path.join(app.getPath('userData'), 'data', 'feed_config.json');
  feedManager = new FeedManager(feedConfigPath);
  rssFetcher = new RSSFetcher();
  
  discoveryService = new DiscoveryService(geminiService, rssFetcher, feedManager);
  enrichmentService = new EnrichmentService(geminiService);

  console.log('[Main] Backend services ready.');
}

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const startMinimized = process.argv.includes('--hidden');
  
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    // FancyZones対応のため不透明(false)に設定
    transparent: false, 
    frame: false,
    hasShadow: true,
    resizable: true,
    thickFrame: true,
    titleBarStyle: 'hidden', 
    // Windows 11 の透過素材を Acrylic に設定
    backgroundMaterial: 'acrylic', 
    icon: path.join(__dirname, '../public/app-icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 閉じるボタンが押されたときに終了せず隠す設定（オプション）
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

// トレイアイコンの設定
function createTray() {
  const iconPath = path.join(__dirname, '../public/app-icon.png');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Aegis Nexus を表示', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: '終了', click: () => {
      app.isQuitting = true;
      app.quit();
    }}
  ]);
  tray.setToolTip('Aegis AI Hub');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow.show());
}

// IPC ハンドラの登録
function registerIpcHandlers() {
  // 設定取得
  ipcMain.handle('get-settings', async () => {
    const interests = await SettingsManager.getInterests();
    const feedConfig = await SettingsManager.getFeedConfig();
    return { interests, feedConfig };
  });

  // 設定同期
  ipcMain.handle('sync-settings', async (event, settings) => {
    try {
      const result = await SettingsManager.syncSettings(settings);
      // 同期後にFeedManagerの設定もリロード
      const feedConfigPath = path.join(app.getPath('userData'), 'data', 'feed_config.json');
      feedManager = new FeedManager(feedConfigPath);
      return result;
    } catch (error) {
      console.error('Failed to sync settings:', error);
      throw error;
    }
  });

  // 記事取得
  ipcMain.handle('get-articles', async (event, options) => {
    console.log('[Main] Fetching articles with options:', options);
    try {
      const interests = await SettingsManager.getInterests();
      const scoringService = new ScoringService(interests);
      const activeFeeds = feedManager.getAllActiveFeeds();
      
      let allArticles = [];
      
      for (const feed of activeFeeds) {
        try {
          const items = await rssFetcher.fetch(feed.url);
          for (const item of items) {
            const category = scoringService.detectCategory(item.title || '', item.contentSnippet || '', feed.category);
            const score = scoringService.calculateScore(item.title || '', item.contentSnippet || '', category);
            const brand = scoringService.extractBrand(item.title || '');
            const img = enrichmentService.extractBasicImage(item);

            allArticles.push({
              title: item.title,
              link: item.link,
              desc: item.contentSnippet,
              date: item.isoDate || item.pubDate,
              brand,
              category,
              score,
              img
            });
          }
        } catch (err) {
          console.error(`Failed to fetch feed ${feed.url}:`, err);
        }
      }

      // スコア順にソートして上位100件を返す
      return allArticles.sort((a, b) => b.score - a.score).slice(0, 100);
    } catch (error) {
      console.error('Failed to get articles:', error);
      throw error;
    }
  });

  // オーケストレーション実行
  ipcMain.handle('trigger-orchestration', async () => {
    console.log('[Main] Triggering orchestration...');
    try {
      const interests = await SettingsManager.getInterests();
      const newFeeds = await discoveryService.run(interests);
      return { success: true, newFeedsCount: newFeeds.length };
    } catch (error) {
      console.error('Orchestration failed:', error);
      throw error;
    }
  });

  // カテゴリー提案
  ipcMain.handle('suggest-category', async (event, categoryName) => {
    console.log('[Main] Suggesting details for category:', categoryName);
    try {
      return await geminiService.suggestCategoryDetails(categoryName);
    } catch (error) {
      console.error('Failed to suggest category:', error);
      throw error;
    }
  });

  // APIキー取得
  ipcMain.handle('get-api-key', async () => {
    return await SettingsManager.getApiKey();
  });

  // APIキー保存
  ipcMain.handle('save-api-key', async (event, apiKey) => {
    try {
      await SettingsManager.saveApiKey(apiKey);
      geminiService.updateApiKey(apiKey);
      return { success: true };
    } catch (error) {
      console.error('Failed to save API key:', error);
      throw error;
    }
  });

  // ウィンドウコントロール
  ipcMain.on('window-control', (event, action) => {
    if (!mainWindow) return;
    switch (action) {
      case 'minimize': mainWindow.minimize(); break;
      case 'maximize': 
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        else mainWindow.maximize();
        break;
      case 'close': mainWindow.close(); break;
    }
  });
}

app.whenReady().then(async () => {
  await initBackend();
  registerIpcHandlers();
  createWindow();
  createTray();

  // Windows起動時の自動実行設定
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  app.setLoginItemSettings({
    openAtLogin: true,
    path: isDev ? process.execPath : app.getPath('exe'),
    args: isDev ? [path.resolve(process.argv[1]), '--hidden'] : ['--hidden']
  });

  // Ctrl+Q でアプリを終了するショートカットを登録
  globalShortcut.register('CommandOrControl+Q', () => {
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
