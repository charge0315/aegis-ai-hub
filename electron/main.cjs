const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const fastify = require('fastify');
const cors = require('@fastify/cors');

// �A�v�����̖����I�ݒ�i�p�X�̐������m�ہj
app.setName('Aegis Nexus');

// �T�[�r�X�̃C���|�[�g (TypeScript�t�@�C���̓��I�ǂݍ���)
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

// ・・・[ユーティリティ: データディレクトリの取得]
function getDataDir() {
  return !app.isPackaged
    ? path.resolve(app.getAppPath(), '..', 'data')
    : path.join(app.getPath('userData'), 'data');
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
  orchestrator = new NexusOrchestrator(geminiService);

  await server.register(nexusRouter, {
    prefix: '/api/v5',
    scraper,
    evolution: discoveryService,
    orchestrator,
    settingsManager
  });

  // Backward compatibility for dashboard
  server.get('/api/dashboard', async () => {
    const interests = await settingsManager.getInterests();
    return await scraper.getDashboard(interests);
  });

  try {
    await server.listen({ port: 3005, host: '0.0.0.0' });
    console.log('[Main] Internal Fastify server listening on port 3005');
  } catch (err) {
    console.error('[Main] Failed to start internal Fastify server:', err);
  }
}

async function initBackend() {
  console.log('[Main] Backend services initializing...');
  
  const dataDir = getDataDir();
  const settingsManager = new ElectronSettingsManager({ dataDir });
  
  // 1. �ݒ�}�l�[�W���[�̏������i�f�B���N�g���쐬�Ȃǁj
  // 1. 設定マネージャーの初期化（ディレクトリ作成など）
  await settingsManager.init();

  // 2. インスタンス生成
  const apiKey = await settingsManager.getApiKey();
  geminiService = new GeminiService(apiKey);

  const feedConfigPath = path.join(dataDir, 'feed_config.json');
  console.log(`[Main] Using FeedManager config: ${feedConfigPath}`);
  feedManager = new FeedManager(feedConfigPath);
  rssFetcher = new RSSFetcher();

  discoveryService = new DiscoveryService(geminiService, rssFetcher, feedManager);
  enrichmentService = new EnrichmentService(geminiService, dataDir);

  // 内蔵Fastifyサーバーの起動
  await startInternalServer(settingsManager);
  console.log('[Main] Backend services ready.');
}

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
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

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

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
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Aegis Nexus ��\��', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: '�I��', click: () => {
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
      
      // メモリ上の設定を更新
      if (feedManager) {
        feedManager.config = result.validatedFeedConfig;
      }
      if (scraper && scraper.feedManager) {
        scraper.feedManager.config = result.validatedFeedConfig;
      }
      // discoveryService は feedManager の参照を保持しているため、
      // config の差し替えで追従可能
      
      return result;
    } catch (error) {
      console.error('Failed to sync settings:', error);
      throw error;
    }
  });

  ipcMain.handle('get-articles', async (event, options) => {
    console.log('[Main] Fetching articles with options:', options);
    try {
      const dataDir = getDataDir();
      const settingsManager = new ElectronSettingsManager({ dataDir });
      const interests = await settingsManager.getInterests();

      // ScraperFacade を使用して並列取得と処理を行う
      const articles = await scraper.fetchAndProcessArticles(interests);

      return articles.map(a => a.toJSON()).sort((a, b) => b.score - a.score).slice(0, 100);
    } catch (error) {
      console.error('Failed to get articles:', error);
      throw error;
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
      const apiKey = await settingsManager.getApiKey();
      geminiService.updateApiKey(apiKey);
      
      const interests = await settingsManager.getInterests();
      const currentFeeds = await settingsManager.getFeedConfig();
      
      return await geminiService.getRestructureProposal(interests, currentFeeds);
    } catch (error) {
      console.error('Failed to restructure categories:', error);
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
        if (fs.existsSync(src)) {
          await fs.promises.copyFile(src, dest);
          console.log(`[Main] Reset ${file} to default.`);
        }
      }

      // メモリ上の設定を再読み込み
      const settingsManager = new ElectronSettingsManager({ dataDir });
      await settingsManager.init();
      
      const feedConfig = await settingsManager.getFeedConfig();
      feedManager.config = feedConfig;
      if (scraper && scraper.feedManager) {
        scraper.feedManager.config = feedConfig;
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to reset to defaults:', error);
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
  await initBackend();
  registerIpcHandlers();
  createWindow();
  createTray();

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (!isDev) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe'),
      args: ['--hidden']
    });
  } else {
    app.setLoginItemSettings({
      openAtLogin: false,
      path: process.execPath,
      args: [path.resolve(process.argv[1] || '.'), '--hidden']
    });
  }

  globalShortcut.register('CommandOrControl+Q', () => {
    app.isQuitting = true;
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

