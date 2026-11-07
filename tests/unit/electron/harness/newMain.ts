/**
 * Phase 3 の新しい main プロセス（electron/main.ts と electron/main/*.ts）を起動するアダプタ。
 *
 * 本番と同じく esbuild で 1 本の CommonJS にまとめ、legacy と同じ bootMainSource で評価する。
 * - electron などの外部モジュールは external にし、Fakes に差し替える。
 * - src/ と electron/ElectronSettingsManager への import は、旧 main.cjs と同じ ID
 *   （'../src/services/GeminiService' など）に読み替えて external にする。これで同じ Fakes が使える。
 */
import { build, type Plugin } from 'esbuild';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootMainSource } from './legacyMain';
import { CURRENT_PRELOAD } from './preloadChannels';
import type { LoadOptions, MainUnderTest } from './types';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const ENTRY = path.join(REPO_ROOT, 'electron', 'main.ts');
const EXTERNAL_PACKAGES = ['electron', 'electron-updater', 'electron-log', 'fastify', '@fastify/cors', 'path', 'fs', 'crypto'];

/** src/ と ElectronSettingsManager への import を、旧 main.cjs が require していた ID に読み替える。 */
const legacyModuleIds: Plugin = {
  name: 'legacy-module-ids',
  setup(build) {
    build.onResolve({ filter: /^\.{1,2}\// }, (args) => {
      const abs = path.resolve(args.resolveDir, args.path);
      const rel = path.relative(REPO_ROOT, abs).split(path.sep).join('/').replace(/\.(ts|tsx|cjs|js)$/, '');
      if (rel.startsWith('src/')) return { path: `../${rel}`, external: true };
      if (rel === 'electron/ElectronSettingsManager') return { path: './ElectronSettingsManager', external: true };
      return undefined;
    });
  },
};

let cachedBundle: Promise<string> | undefined;

/** プラグインは同期 API で使えないので、非同期の build を 1 回だけ実行して使い回す。 */
function bundleNewMain(): Promise<string> {
  cachedBundle ??= bundleOnce();
  return cachedBundle;
}

async function bundleOnce(): Promise<string> {
  const result = await build({
    entryPoints: [ENTRY],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node24',
    write: false,
    external: EXTERNAL_PACKAGES,
    plugins: [legacyModuleIds],
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

export async function loadNewMain(options: LoadOptions = {}): Promise<MainUnderTest> {
  return bootMainSource(await bundleNewMain(), CURRENT_PRELOAD, options, { crypto });
}
