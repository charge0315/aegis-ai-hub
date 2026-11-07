import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { getMainWindow } from './mainWindowState';

/** 起動の体感を損なわないよう、更新の確認は起動から少し待ってから行う（RULE-062）。 */
const UPDATE_CHECK_DELAY_MS = 30000;

/** リリースがまだ公開されていないときのエラー。正常な状態なので画面には知らせない。 */
const isNoPublishedVersions = (err: unknown): boolean => String(err).includes('No published versions');

/** パッケージ版の自動更新を設定し、結果をレンダラーへ `update-event` で中継する（RULE-062）。 */
export function setupAutoUpdater(): void {
  if (!app.isPackaged) return;
  log.transports.file.level = 'info';
  autoUpdater.logger = log;
  autoUpdater.on('update-available', (info) => {
    getMainWindow()?.webContents.send('update-event', { type: 'available', info });
  });
  autoUpdater.on('update-downloaded', (info) => {
    getMainWindow()?.webContents.send('update-event', { type: 'downloaded', info });
  });
  autoUpdater.on('error', (err) => {
    if (isNoPublishedVersions(err)) {
      log.info('No GitHub releases found, skipping update check.');
      return;
    }
    getMainWindow()?.webContents.send('update-event', { type: 'error', message: String(err) });
  });
  setTimeout(() => autoUpdater.checkForUpdates().catch((err: unknown) => {
    if (!isNoPublishedVersions(err)) log.error('Update check failed:', err);
  }), UPDATE_CHECK_DELAY_MS);
}

/** OS のログイン時の自動起動を、UI 設定に合わせる（パッケージ版のみ。RULE-119）。 */
export function syncLoginItem(openAtLogin: boolean | undefined): void {
  if (!app.isPackaged) return;
  app.setLoginItemSettings({
    openAtLogin: openAtLogin as boolean,
    path: app.getPath('exe'),
  });
}
