import { ipcMain } from 'electron';
import type { Credentials, UiSettings } from '../../../src/models/Schemas';
import type { Services } from '../services';
import { syncLoginItem } from '../updater';

/** API キー・資格情報・UI 設定・利用統計・初期化の IPC（旧 main.cjs と同じ順で登録する）。 */
export function registerSettingsIpc(services: Services): void {
  const { settingsManager, geminiService } = services;

  // RULE-069/070: API キーは保存してから AI 層へ反映する。保存に失敗したら反映しない
  ipcMain.handle('get-api-key', async () => {
    return await settingsManager.getApiKey();
  });

  ipcMain.handle('save-api-key', async (_event, key: string) => {
    await settingsManager.saveApiKey(key);
    geminiService.updateApiKey(key);
    return { success: true };
  });

  ipcMain.handle('get-credentials', async () => {
    return await settingsManager.getCredentials();
  });

  ipcMain.handle('save-credentials', async (_event, creds: Credentials) => {
    await settingsManager.saveCredentials(creds);
    geminiService.updateCredentials(creds);
    return { success: true };
  });

  ipcMain.handle('get-ui-settings', async () => {
    return await settingsManager.getUiSettings();
  });

  // RULE-119: 自動起動の設定は、パッケージ版でだけ OS に反映する
  ipcMain.handle('save-ui-settings', async (_event, settings: UiSettings) => {
    await settingsManager.saveUiSettings(settings);
    syncLoginItem(settings.autoLaunch);
    return { success: true };
  });

  ipcMain.handle('get-usage-stats', async () => {
    return await settingsManager.getUsageStats();
  });

  // 注意: SettingsManager.resetToDefaults() は引数を取らないので、言語は実際には使われない（旧版から同じ。Issue で扱う）。
  // 契約テストで旧版と同じ呼び出しを固定しているため、渡し方は変えない
  ipcMain.handle('reset-to-defaults', async (_event, lang?: string) => {
    const resetToDefaults = settingsManager.resetToDefaults as (lang: string) => Promise<boolean>;
    const success = await resetToDefaults.call(settingsManager, lang || 'ja');
    return { success };
  });
}
