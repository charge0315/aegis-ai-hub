/**
 * CONTRACT_RECORD_DIR が設定されているときだけ、各ケースの観測結果を <case-id>.json に書き出す。
 * 通常のテスト実行ではファイルを書かない。
 */
import fs from 'node:fs';
import path from 'node:path';
import { normalizeForRecord } from './fakes';
import type { MainUnderTest } from './types';

export interface Observed {
  value?: unknown;
  rejected?: string;
}

export function recordCase(caseId: string, main: MainUnderTest, observed: Observed, fromCall: number): void {
  const dir = process.env.CONTRACT_RECORD_DIR;
  if (!dir) return;
  const payload = normalizeForRecord(
    { case: caseId, result: observed, calls: main.fakes.calls.slice(fromCall) },
    main.fakes.tmpRoot,
  );
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${caseId}.json`), JSON.stringify(payload, null, 2) + '\n', { encoding: 'utf8' });
}

/** 起動時 (whenReady チェーン完了まで) の呼び出しを記録する */
export function recordStartup(caseId: string, main: MainUnderTest): void {
  const dir = process.env.CONTRACT_RECORD_DIR;
  if (!dir) return;
  const payload = normalizeForRecord(
    { case: caseId, result: { value: null }, calls: main.fakes.calls.slice(0, main.startupCallCount) },
    main.fakes.tmpRoot,
  );
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${caseId}.json`), JSON.stringify(payload, null, 2) + '\n', { encoding: 'utf8' });
}
