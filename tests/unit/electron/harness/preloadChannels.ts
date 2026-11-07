/**
 * electron/preload.cjs を偽の contextBridge / ipcRenderer で評価し、
 * 公開 API を全て呼んで使用チャンネルを動的に抽出する。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PreloadChannels } from './types';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/** 既定は現在の electron/preload.cjs。legacy の比較では凍結した legacy-oracle/preload.cjs を渡す。 */
export const CURRENT_PRELOAD = path.join(REPO_ROOT, 'electron', 'preload.cjs');

export function extractPreloadChannels(preloadPath: string = CURRENT_PRELOAD): PreloadChannels {
  const src = fs.readFileSync(preloadPath, 'utf8');
  const invoke = new Set<string>();
  const send = new Set<string>();
  const on = new Set<string>();
  let api: Record<string, (...a: unknown[]) => unknown> = {};

  const ipcRenderer = {
    invoke: (ch: string) => { invoke.add(ch); return Promise.resolve(undefined); },
    send: (ch: string) => { send.add(ch); },
    on: (ch: string) => { on.add(ch); },
    removeAllListeners: () => undefined,
    removeListener: () => undefined,
  };
  const contextBridge = {
    exposeInMainWorld: (_name: string, a: Record<string, (...x: unknown[]) => unknown>) => { api = a; },
  };
  const fakeRequire = (id: string) => {
    if (id === 'electron') return { contextBridge, ipcRenderer };
    throw new Error(`preload required unexpected module: ${id}`);
  };
  new Function('require', 'module', 'exports', src)(fakeRequire, { exports: {} }, {});

  for (const [name, fn] of Object.entries(api)) {
    // on* 系はコールバックを要求する。他は引数なしで呼ぶ (invoke/send は記録のみ)。
    const r = name.startsWith('on') ? fn(() => undefined) : fn();
    if (r instanceof Promise) void r;
  }
  return { invoke: [...invoke].sort(), send: [...send].sort(), on: [...on].sort() };
}
