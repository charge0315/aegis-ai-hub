import { describe, it, expect, afterEach, vi } from 'vitest';
import { GeminiService } from '../../../src/services/GeminiService';
import { AiProviderFactory } from '../../../src/services/ai/AiProviderFactory';
import type { AiProvider } from '../../../src/services/ai/AiProvider';

// 特性テスト: プロバイダが投げたエラー文言 -> GeminiService の変換結果。SDK 非依存。

type Schema = Parameters<GeminiService['generateStructured']>[1];
const schema = { type: 'object', properties: {} } as unknown as Schema;

function serviceFailingWith(error: unknown): GeminiService {
  const provider = {
    generateStructured: vi.fn().mockRejectedValue(error),
  } as unknown as AiProvider;
  vi.spyOn(AiProviderFactory, 'create').mockReturnValue(provider);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  return new GeminiService('test-key');
}

describe('GeminiService quota mapping characterization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('旧 SDK 形式の 429 メッセージは QUOTA_EXCEEDED になる', async () => {
    const svc = serviceFailingWith(
      new Error(
        '[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent: [429 Too Many Requests] Resource has been exhausted'
      )
    );
    await expect(svc.generateStructured('p', schema)).rejects.toThrow(/^QUOTA_EXCEEDED$/);
  });

  it('新 SDK 形式の JSON 文字列メッセージ(code 429)は QUOTA_EXCEEDED になる', async () => {
    const svc = serviceFailingWith(
      new Error(
        '{"error":{"message":"Resource has been exhausted (e.g. check quota).","code":429,"status":"RESOURCE_EXHAUSTED"}}'
      )
    );
    await expect(svc.generateStructured('p', schema)).rejects.toThrow(/^QUOTA_EXCEEDED$/);
  });

  it('"quota" を含む文言(大文字小文字無視)も QUOTA_EXCEEDED になる', async () => {
    const svc = serviceFailingWith(new Error('You exceeded your current Quota'));
    await expect(svc.generateStructured('p', schema)).rejects.toThrow(/^QUOTA_EXCEEDED$/);
  });

  it('QUOTA_EXCEEDED は元エラーを cause に保持する', async () => {
    const original = new Error('429 boom');
    const svc = serviceFailingWith(original);
    const err = await svc.generateStructured('p', schema).then(
      () => null,
      (e: unknown) => e
    );
    expect((err as Error).cause).toBe(original);
  });

  it('クォータ以外のエラーは "AI execution failed:" で始まる', async () => {
    const svc = serviceFailingWith(new Error('network down'));
    await expect(svc.generateStructured('p', schema)).rejects.toThrow(
      'AI execution failed: network down'
    );
  });

  it('Error 以外の throw 値は String 化されて "AI execution failed:" になる', async () => {
    const svc = serviceFailingWith('plain string failure');
    await expect(svc.generateStructured('p', schema)).rejects.toThrow(
      'AI execution failed: plain string failure'
    );
  });
});
