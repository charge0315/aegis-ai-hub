/**
 * 現行 electron/main.cjs を偽の require で評価して起動するアダプタ。
 *
 * - electron / electron-updater / electron-log / fastify / @fastify/cors / src の各サービスは Fakes に差し替え。
 * - path は実物、fs は実物だが全て os.tmpdir() 配下の使い捨てディレクトリに閉じ込める。
 * - process / console / setTimeout は評価時のローカル変数として差し替え、実プロセスに handler を付けない。
 * - main.cjs 自体は一切変更しない (ソースを読み、new Function で評価するだけ)。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Fakes } from './fakes';
import { extractPreloadChannels } from './preloadChannels';
import type { LoadOptions, MainUnderTest } from './types';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
// 旧 electron/main.cjs は Phase 3 で削除した。比較の基準として、削除前の内容を凍結した複製を読む
const ORACLE_DIR = path.join(REPO_ROOT, 'tests', 'unit', 'electron', 'legacy-oracle');
const MAIN_PATH = path.join(ORACLE_DIR, 'main.cjs');

const flush = async () => {
  for (let i = 0; i < 20; i++) await new Promise<void>((r) => setImmediate(r));
};

export async function loadLegacyMain(options: LoadOptions = {}): Promise<MainUnderTest> {
  return bootMainSource(fs.readFileSync(MAIN_PATH, 'utf8'), path.join(ORACLE_DIR, 'preload.cjs'), options);
}

/**
 * CommonJS の main プロセスのソースを、偽の require で評価して起動する（legacy と new で共通）。
 * extraModules は、評価するソースが追加で require するモジュール（例: crypto）。
 */
export async function bootMainSource(
  src: string,
  preloadPath: string,
  options: LoadOptions = {},
  extraModules: Record<string, unknown> = {},
): Promise<MainUnderTest> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-main-contract-'));
  const fakes = new Fakes();
  fakes.isPackaged = options.packaged ?? false;
  fakes.platform = options.platform ?? 'win32';
  fakes.tmpRoot = root;
  fakes.userData = path.join(root, 'userData');
  fakes.exePath = path.join(root, 'exe', 'AegisNexus.exe');
  fakes.resourcesPath = path.join(root, 'resources');
  fakes.process.env.USERPROFILE = path.join(root, 'home');

  const fakeDirname = path.join(root, 'electron'); // dev の既定データは <root>/data
  const defaultDataDir = fakes.isPackaged ? path.join(fakes.resourcesPath, 'default-data') : path.join(root, 'data');
  const dataDir = path.join(fakes.userData, 'data');

  const seed = (dir: string, files?: Record<string, string>) => {
    if (!files) return;
    fs.mkdirSync(dir, { recursive: true });
    for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  };
  seed(defaultDataDir, options.seedDefaults);
  seed(dataDir, options.seedUserData);

  options.configure?.(fakes);

  const modules: Record<string, unknown> = {
    electron: {
      app: fakes.app, BrowserWindow: fakes.BrowserWindow, ipcMain: fakes.ipcMain,
      globalShortcut: fakes.globalShortcut, Tray: fakes.Tray, Menu: fakes.Menu,
      shell: fakes.shell, nativeImage: fakes.nativeImage, safeStorage: fakes.safeStorage,
    },
    'electron-updater': { autoUpdater: fakes.autoUpdater },
    'electron-log': fakes.log,
    fastify: fakes.fastify,
    '@fastify/cors': fakes.cors,
    path,
    fs,
    ...fakes.serviceModules(),
    ...extraModules,
  };
  const fakeRequire = (id: string) => {
    if (!(id in modules)) throw new Error(`main.cjs required an unmocked module: ${id}`);
    return modules[id];
  };

  const module_ = { exports: {} };
  new Function('require', 'module', 'exports', '__dirname', '__filename', 'process', 'console', 'setTimeout', src)(
    fakeRequire, module_, module_.exports, fakeDirname, path.join(fakeDirname, 'main.cjs'),
    fakes.process, fakes.console, fakes.setTimeoutFake,
  );

  if (options.autoStart !== false) await fakes.start();
  await flush();

  const event = () => ({ sender: {} });
  const main: MainUnderTest = {
    invoke: async (channel, ...args) => {
      const h = fakes.ipcHandlers.get(channel);
      if (!h) throw new Error(`No handler registered for '${channel}'`);
      return await h(event(), ...args);
    },
    send: (channel, ...args) => {
      const h = fakes.ipcListeners.get(channel);
      if (!h) throw new Error(`No listener registered for '${channel}'`);
      h(event(), ...args);
    },
    handledChannels: () => [...fakes.ipcHandlers.keys()].sort(),
    onChannels: () => [...fakes.ipcListeners.keys()].sort(),
    rendererSends: fakes.rendererSends,
    preloadChannels: () => extractPreloadChannels(preloadPath),
    emitApp: (ev, ...args) => { for (const h of fakes.appHandlers.get(ev) ?? []) h(...args); },
    emitProcess: (ev, ...args) => { for (const h of fakes.processHandlers.get(ev) ?? []) h(...args); },
    runTimers: () => { const ts = fakes.timers.splice(0); for (const t of ts) t.fn(); },
    flush,
    startupCallCount: fakes.calls.length,
    paths: { userData: fakes.userData, dataDir, defaultDataDir, crashLog: path.join(fakes.userData, 'crash.log'), exe: fakes.exePath },
    fakes,
    dispose: () => fs.rmSync(root, { recursive: true, force: true }),
  };
  return main;
}
