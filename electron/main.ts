/**
 * Aegis Nexus - Electron main process（入口）
 *
 * 起動の順番と OS との連携だけをここに置き、部品は electron/main/ に分けた。
 * - services.ts: バックエンドのサービスの組み立て
 * - internalServer.ts: ブラウザ実行・SSE 用の内部 HTTP API（トークン認証つき）
 * - windows.ts: メインウィンドウと記事ウィンドウ
 * - ipc/: レンダラーとの IPC
 * - updater.ts: 自動更新とログイン時の自動起動
 *
 * 起動の順番は旧 electron/main.cjs と同じで、tests/unit/electron の契約テストで固定している。
 * このファイルは esbuild で electron/main.bundle.cjs にまとめられる（開発中は esbuild-register で直接読む）。
 * どちらの場合も __dirname は electron/ を指す。
 */
import { app, BrowserWindow, globalShortcut } from 'electron';
import log from 'electron-log';
import path from 'path';
import { LicenseManager } from '../src/services/LicenseManager';
import { installCrashHandlers, setCrashLogPath } from './main/crashLog';
import { setupDataDirectory } from './main/dataDirectory';
import { createServices, type Services } from './main/services';
import { resolveApiToken, startInternalServer } from './main/internalServer';
import { createMainWindow } from './main/windows';
import { getMainWindow } from './main/mainWindowState';
import { registerContentIpc } from './main/ipc/contentIpc';
import { registerSettingsIpc } from './main/ipc/settingsIpc';
import { registerLicenseAndUpdateIpc, registerWindowIpc } from './main/ipc/shellIpc';
import { setupAutoUpdater, syncLoginItem } from './main/updater';

installCrashHandlers();

// アプリの表示名を OS に設定する
app.setName('Aegis Nexus');

const isDev = !app.isPackaged;
const electronDir = __dirname;

let services: Services | undefined;

app.whenReady().then(async () => {
  setCrashLogPath(path.join(app.getPath('userData'), 'crash.log'));
  const dataDir = setupDataDirectory(isDev, electronDir);

  // ライセンスはバックエンドより先に読み込む。検証は通信を伴うので待たない
  const licenseManager = LicenseManager.getInstance(dataDir);
  await licenseManager.load();
  licenseManager.verify().catch((e: unknown) => log.warn('[Main] ライセンス検証に失敗しました:', e));

  const startedServices = await createServices(dataDir, isDev);
  services = startedServices;
  await startInternalServer(startedServices, isDev, resolveApiToken(isDev));

  registerContentIpc(startedServices);
  registerSettingsIpc(startedServices);
  registerWindowIpc();
  registerLicenseAndUpdateIpc(licenseManager);

  setupAutoUpdater();

  // 起動時に、最新の自動起動の設定を OS に合わせる
  const uiSettings = await startedServices.settingsManager.getUiSettings();
  syncLoginItem(uiSettings.autoLaunch);

  createMainWindow(startedServices, isDev, electronDir);

  // 開発者用のショートカット
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    getMainWindow()?.webContents.toggleDevTools();
  });
});

app.on('window-all-closed', () => {
  // macOS 以外では、ウィンドウを全部閉じたらアプリを終了する
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  // macOS の Dock アイコンをクリックしたとき、ウィンドウが無ければ作り直す
  if (BrowserWindow.getAllWindows().length === 0 && services) {
    createMainWindow(services, isDev, electronDir);
  }
});
