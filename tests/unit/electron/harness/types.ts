/**
 * Electron main process 契約テスト用のアダプタ型。
 *
 * 契約テスト (mainIpc.contract.test.ts) はこの型だけに依存する。
 * legacy (electron/main.cjs) と将来の electron/main/*.ts の両方が同じ型を実装する。
 */
import type { Fakes } from './fakes';

export type { Fakes, FakeWindow, RecordedCall } from './fakes';

export interface LoadOptions {
  /** app.isPackaged の値 (既定 false = dev) */
  packaged?: boolean;
  /** process.platform の値 (既定 'win32') */
  platform?: string;
  /** 起動前に Fakes の戻り値・例外を設定する */
  configure?: (fakes: Fakes) => void;
  /** 同梱デフォルトデータディレクトリに置くファイル (相対名 -> 内容) */
  seedDefaults?: Record<string, string>;
  /** ユーザーデータの data ディレクトリに置くファイル (相対名 -> 内容) */
  seedUserData?: Record<string, string>;
  /** false なら whenReady を解決せず返す (既定 true) */
  autoStart?: boolean;
}

export interface PreloadChannels {
  invoke: string[];
  send: string[];
  on: string[];
}

export interface MainPaths {
  /** app.getPath('userData') */
  userData: string;
  /** <userData>/data */
  dataDir: string;
  /** 同梱デフォルトデータの場所 */
  defaultDataDir: string;
  /** <userData>/crash.log */
  crashLog: string;
  /** app.getPath('exe') */
  exe: string;
}

export interface MainUnderTest {
  /** ipcMain.handle 登録済みハンドラを呼ぶ。未登録なら reject。 */
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  /** ipcMain.on 登録済みリスナーを呼ぶ。未登録なら throw。 */
  send(channel: string, ...args: unknown[]): void;
  handledChannels(): string[];
  onChannels(): string[];
  /** メインウィンドウの webContents.send の記録 */
  rendererSends: Array<{ channel: string; args: unknown[] }>;
  /** プリロードが公開しているチャンネル (preload.cjs から動的に抽出) */
  preloadChannels(): PreloadChannels;
  /** app.on(...) に登録されたイベントを発火する (例: 'window-all-closed', 'activate') */
  emitApp(event: string, ...args: unknown[]): void;
  /** process.on に登録されたハンドラを発火する */
  emitProcess(event: string, ...args: unknown[]): void;
  /** setTimeout で予約された関数を全て実行する */
  runTimers(): void;
  /** マイクロタスクを流す */
  flush(): Promise<void>;
  /** 起動 (whenReady チェーン) 完了時点での fakes.calls の件数 */
  startupCallCount: number;
  paths: MainPaths;
  fakes: Fakes;
  /** 一時ディレクトリ等の後始末 */
  dispose(): void;
}

export type MainLoader = (options?: LoadOptions) => Promise<MainUnderTest>;
