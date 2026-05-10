const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu } = require('electron');
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
let geminiService;
let feedManager;
let rssFetcher;
let discoveryService;
let enrichmentService;
let scraper;
let orchestrator;

// [ユーティリティ: データディレクトリの取得]
function getDataDir() {
  if (!app.isPackaged) {
    return path.join(__dirname, '..', 'data');
  } else {
    return path.join(app.getPath('userData'), 'data');
  }
}

async function startInternalServer(settingsManager) {
  const server = fastify({ logger: false });
  await server.register(cors, { origin: '*' });

  const dataDir = getDataDir();
  scraper = new ScraperFacade(
    path.join(dataDir, 'interests.json'),
    path.join(dataDir, 'feed_config.json'),
    dataDir
  );

  const apiKey = await settingsManager.getApiKey();
  if (apiKey) {
    scraper.updateApiKey(apiKey);
  }

  orchestrator = new NexusOrchestrator(geminiService);

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

async function ensureDefaultData(dataDir) {
  const interestsPath = path.join(dataDir, 'interests.json');
  const feedConfigPath = path.join(dataDir, 'feed_config.json');

  const isFileEmpty = (filePath) => {
    if (!fs.existsSync(filePath)) return true;
    try {
      const stats = fs.statSync(filePath);
      if (stats.size === 0) return true;
      const content = fs.readFileSync(filePath, 'utf8').trim();
      return content === '{}' || content === '';
    } catch {
      return true;
    }
  };

  const needsInit = isFileEmpty(interestsPath) || isFileEmpty(feedConfigPath);

  if (needsInit) {
    console.log('[Main] Initializing data with defaults (missing or empty configuration detected)...');
    const resourcesPath = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');
    const defaultDataDir = path.join(resourcesPath, 'default-data');
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const files = ['interests.json', 'feed_config.json'];
    for (const file of files) {
      const src = path.join(defaultDataDir, file);
      const dest = path.join(dataDir, file);
      
      // 既存のファイルが空でない場合は上書きしない（片方だけ空の場合の保護）
      if (fs.existsSync(dest) && !isFileEmpty(dest)) {
        console.log(`[Main] Skipping default copy for ${file} (already has content).`);
        continue;
      }

      if (fs.existsSync(src)) {
        try {
          fs.copyFileSync(src, dest);
          console.log(`[Main] Copied default ${file}`);
        } catch (e) {
          console.error(`[Main] Failed to copy default ${file}:`, e);
        }
      }
    }
  }
}

async function initBackend() {
  console.log('[Main] Backend services initializing...');
  const dataDir = getDataDir();
  await ensureDefaultData(dataDir);

  const settingsManager = new ElectronSettingsManager({ dataDir });
  await settingsManager.init();

  const apiKey = await settingsManager.getApiKey();
  geminiService = new GeminiService(apiKey);

  const feedConfigPath = path.join(dataDir, 'feed_config.json');
  feedManager = new FeedManager(feedConfigPath);
  rssFetcher = new RSSFetcher();

  discoveryService = new DiscoveryService(geminiService, rssFetcher, feedManager);
  enrichmentService = new EnrichmentService(geminiService, dataDir);

  await startInternalServer(settingsManager);
  console.log('[Main] Backend services ready.');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    transparent: false, 
    frame: false,
    hasShadow: true,
    resizable: true,
    thickFrame: true,
    titleBarStyle: 'hidden', 
    backgroundMaterial: 'acrylic', 
    icon: path.join(__dirname, '../public/app-icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/app-icon.png');
  if (!fs.existsSync(iconPath)) return;
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Aegis Nexus 表示', click: () => mainWindow.show() },
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

function registerIpcHandlers() {
  ipcMain.handle('get-settings', async () => {
    const dataDir = getDataDir();
    const settingsManager = new ElectronSettingsManager({ dataDir });
    const interests = await settingsManager.getInterests();
    const feedConfig = await settingsManager.getFeedConfig();
    return { interests, feed_urls: feedConfig };
  });

  ipcMain.handle('sync-settings', async (event, settings) => {
    try {
      const dataDir = getDataDir();
      const settingsManager = new ElectronSettingsManager({ dataDir });
      const result = await settingsManager.syncSettings(settings, rssFetcher);
      if (feedManager) feedManager.config = result.validatedFeedConfig;
      if (scraper && scraper.feedManager) scraper.feedManager.config = result.validatedFeedConfig;
      return result;
    } catch (error) {
      console.error('Failed to sync settings:', error);
      throw error;
    }
  });

  ipcMain.handle('get-articles', async (event, options) => {
    console.log('[Main] IPC: get-articles invoked.');
    try {
      const dataDir = getDataDir();
      const settingsManager = new ElectronSettingsManager({ dataDir });
      const interests = await settingsManager.getInterests();

      // 修正: 記事取得の実処理（fetchAndProcessArticlesWithFallback）が欠落していたのを復旧
      const articles = await scraper.fetchAndProcessArticlesWithFallback(interests);

      console.log(`[Main] IPC: Returning top 500 articles.`);
      return articles.map(a => a.toJSON()).sort((a, b) => b.score - a.score).slice(0, 500);
    } catch (error) {
      console.error('[Main] IPC Error: get-articles failed:', error);
      return [];
    }
  });

  ipcMain.handle('trigger-orchestration', async () => {
    try {
      const dataDir = getDataDir();
      const settingsManager = new ElectronSettingsManager({ dataDir });
      const interests = await settingsManager.getInterests();
      const newFeeds = await discoveryService.run(interests);
      return { success: true, newFeedsCount: newFeeds.length };
    } catch (error) {
      console.error('Orchestration failed:', error);
      throw error;
    }
  });

  ipcMain.handle('suggest-category', async (event, categoryName) => {
    try {
      const dataDir = getDataDir();
      const settingsManager = new ElectronSettingsManager({ dataDir });
      await settingsManager.init();
      const apiKey = await settingsManager.getApiKey();
      geminiService.updateApiKey(apiKey);
      return await geminiService.suggestCategoryDetails(categoryName);
    } catch (error) {
      console.error('Failed to suggest category:', error);
      throw error;
    }
  });

  ipcMain.handle('get-proposals', async () => {
    try {
      const dataDir = getDataDir();
      const settingsManager = new ElectronSettingsManager({ dataDir });
      const interests = await settingsManager.getInterests();
      return await discoveryService.getProposals(interests);
    } catch (error) {
      console.error('Failed to get proposals:', error);
      throw error;
    }
  });

  ipcMain.handle('restructure-categories', async () => {
    try {
      const dataDir = getDataDir();
      const settingsManager = new ElectronSettingsManager({ dataDir });
      await settingsManager.init();
      const apiKey = await settingsManager.getApiKey();
      geminiService.updateApiKey(apiKey);
      
      const interests = await settingsManager.getInterests();
      const currentFeeds = await settingsManager.getFeedConfig();
      const restructured = await geminiService.getRestructureProposal(interests, currentFeeds);

      const validationTasks = Object.entries(restructured.feedConfig).map(async ([catName, config]) => {
        const sitesToValidate = config.active.map(url => ({ url, name: 'Suggested Feed', category: catName }));
        const validatedSites = await discoveryService.validateSuggestedFeeds(sitesToValidate);
        restructured.feedConfig[catName].active = validatedSites.map(s => s.url);

        if (restructured.feedConfig[catName].active.length === 0) {
          const fallbackUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(catName)}&hl=ja&gl=JP&ceid=JP:ja`;
          restructured.feedConfig[catName].active.push(fallbackUrl);
        }
      });

      await Promise.all(validationTasks);
      return restructured;
    } catch (error) {
      console.error('Failed to restructure categories:', error);
      throw error;
    }
  });

  ipcMain.handle('discover-trends', async () => {
    try {
      const dataDir = getDataDir();
      const settingsManager = new ElectronSettingsManager({ dataDir });
      await settingsManager.init();
      const apiKey = await settingsManager.getApiKey();
      scraper.updateApiKey(apiKey);
      
      const interests = await settingsManager.getInterests();
      const suggestions = await scraper.discoverTrends(interests);
      return { suggestions };
    } catch (error) {
      console.error('Failed to discover trends:', error);
      throw error;
    }
  });

  ipcMain.handle('get-api-key', async () => {
    const dataDir = getDataDir();
    const settingsManager = new ElectronSettingsManager({ dataDir });
    return await settingsManager.getApiKey();
  });

  ipcMain.handle('save-api-key', async (event, apiKey) => {
    try {
      const dataDir = getDataDir();
      const settingsManager = new ElectronSettingsManager({ dataDir });
      await settingsManager.saveApiKey(apiKey);
      geminiService.updateApiKey(apiKey);
      return { success: true };
    } catch (error) {
      console.error('Failed to save API key:', error);
      throw error;
    }
  });

  ipcMain.handle('reset-to-defaults', async () => {
    try {
      const dataDir = getDataDir();
      const resourcesPath = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');
      const defaultDataDir = path.join(resourcesPath, 'default-data');
      const files = ['interests.json', 'feed_config.json'];
      for (const file of files) {
        const src = path.join(defaultDataDir, file);
        const dest = path.join(dataDir, file);
        if (fs.existsSync(src)) await fs.promises.copyFile(src, dest);
      }
      const settingsManager = new ElectronSettingsManager({ dataDir });
      await settingsManager.init();
      const feedConfig = await settingsManager.getFeedConfig();
      if (feedManager) feedManager.config = feedConfig;
      if (scraper && scraper.feedManager) scraper.feedManager.config = feedConfig;
      return { success: true };
    } catch (error) {
      console.error('Failed to reset to defaults:', error);
      throw error;
    }
  });

  ipcMain.handle('get-ui-settings', async () => {
    const dataDir = getDataDir();
    const settingsManager = new ElectronSettingsManager({ dataDir });
    return await settingsManager.getUiSettings();
  });

  ipcMain.handle('save-ui-settings', async (event, settings) => {
    try {
      const dataDir = getDataDir();
      const settingsManager = new ElectronSettingsManager({ dataDir });
      await settingsManager.saveUiSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('Failed to save UI settings:', error);
      throw error;
    }
  });

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
  try {
    await initBackend();
    registerIpcHandlers();
    
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    const isHidden = process.argv.includes('--hidden');

    createWindow();
    createTray();

    // ウィンドウの状態に関わらず常にコンテンツをロード
    if (isDev) {
      mainWindow.loadURL('http://localhost:5173');
    } else {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // 起動時にバックグラウンドでフィード取得を開始
    if (scraper) {
      console.log('[Main] Starting background initial fetch...');
      const dataDir = getDataDir();
      const settingsManager = new ElectronSettingsManager({ dataDir });
      settingsManager.getInterests().then(interests => {
        scraper.fetchAndProcessArticlesWithFallback(interests).then(articles => {
          console.log(`[Main] Initial fetch completed. ${articles.length} articles found.`);
        }).catch(err => {
          console.error('[Main] Initial background fetch failed:', err);
        });
      });
    }

    if (!isDev) {
      app.setLoginItemSettings({ 
        openAtLogin: true, 
        path: app.getPath('exe'), 
        args: ['--hidden'] 
      });
    }

    // 表示制御
    if (isHidden && mainWindow) {
      console.log('[Main] App started with --hidden. Keeping window hidden.');
    } else if (mainWindow) {
      mainWindow.once('ready-to-show', () => {
        mainWindow.show();
      });
    }

    globalShortcut.register('CommandOrControl+Q', () => {
      app.isQuitting = true;
      app.quit();
    });
  } catch (err) {
    console.error('[Main] CRITICAL ERROR during startup:', err);
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
