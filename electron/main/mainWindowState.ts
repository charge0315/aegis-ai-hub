import type { BrowserWindow } from 'electron';

/**
 * メインウィンドウの参照を 1 か所で持つ。
 * IPC・自動更新・利用量通知・エージェント通知は、作られた後のウィンドウをここから取り出す。
 */
let mainWindow: BrowserWindow | undefined;

export function getMainWindow(): BrowserWindow | undefined {
  return mainWindow;
}

export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window;
}

/** 破棄されていないメインウィンドウへ、レンダラー向けのイベントを送る。 */
export function sendToRenderer(channel: string, payload: unknown): void {
  const window = mainWindow;
  if (window && !window.isDestroyed()) {
    window.webContents.send(channel, payload);
  }
}
