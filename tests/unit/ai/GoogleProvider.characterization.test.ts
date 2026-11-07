import { describe, it, expect, afterEach, vi } from 'vitest';
import { GoogleProvider } from '../../../src/services/ai/providers/GoogleProvider';

// 特性テスト: SDK(@google/generative-ai -> @google/genai)差し替え前後で同一に通ること。
// どちらの SDK も import しない。キーは固定のダミー値 'test-key'。

type Schema = Parameters<GoogleProvider['generateStructured']>[1];

const schema = {
  type: 'object',
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, score: { type: 'number' } },
        required: ['name'],
      },
    },
  },
} as unknown as Schema;

/** 全ての `type` フィールドを再帰的に小文字化する(旧 lowercase / 新 UPPERCASE を同一視)。 */
function normalizeTypes(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeTypes);
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = k === 'type' && typeof v === 'string' ? v.toLowerCase() : normalizeTypes(v);
    }
    return out;
  }
  return value;
}

/** 値の中の全ての text を取り出す(string / {parts} / {role, parts} / 配列 に対応)。 */
function extractTexts(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(extractTexts);
  if (typeof value === 'object' && value !== null) {
    const rec = value as Record<string, unknown>;
    const texts: string[] = [];
    if (typeof rec.text === 'string') texts.push(rec.text);
    if (rec.parts) texts.push(...extractTexts(rec.parts));
    return texts;
  }
  return [];
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function okBody(payload: unknown) {
  return {
    candidates: [
      {
        content: { role: 'model', parts: [{ text: JSON.stringify(payload) }] },
        finishReason: 'STOP',
        index: 0,
      },
    ],
  };
}

interface CapturedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

async function capture(args: unknown[]): Promise<CapturedCall> {
  const [input, init] = args as [unknown, RequestInit | undefined];
  let url: string;
  let method = init?.method ?? 'GET';
  let rawHeaders: HeadersInit | undefined = init?.headers;
  let bodyText: string | undefined;
  if (input instanceof Request) {
    url = input.url;
    method = init?.method ?? input.method;
    rawHeaders = init?.headers ?? input.headers;
    bodyText = init?.body ? String(init.body) : await input.clone().text();
  } else {
    url = String(input);
    bodyText = init?.body != null ? String(init.body) : undefined;
  }
  const headers: Record<string, string> = {};
  new Headers(rawHeaders).forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });
  return { url, method: method.toUpperCase(), headers, body: bodyText ? JSON.parse(bodyText) : {} };
}

function stubFetch(responder: () => Response) {
  const fn = vi.fn(async () => responder());
  vi.stubGlobal('fetch', fn);
  return fn;
}

const OPTIONS = { modelName: 'gemini-test', systemPrompt: 'SYS', temperature: 0.2 };

describe('GoogleProvider characterization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('(a) 成功: リクエスト形状とパース結果を固定する', async () => {
    const payload = { items: [{ name: 'alpha', score: 1.5 }] };
    const fetchMock = stubFetch(() => jsonResponse(okBody(payload)));

    const result = await new GoogleProvider('test-key').generateStructured<typeof payload>(
      'PROMPT-TEXT',
      schema,
      OPTIONS
    );

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const call = await capture(fetchMock.mock.calls[0] as unknown[]);
    expect(call.url).toContain('models/gemini-test:generateContent');
    expect(call.method).toBe('POST');

    const keyInHeader = call.headers['x-goog-api-key'] === 'test-key';
    const keyInQuery = new URL(call.url).searchParams.get('key') === 'test-key';
    expect(keyInHeader || keyInQuery).toBe(true);

    expect(extractTexts(call.body.contents)).toContain('PROMPT-TEXT');
    const sys = (call.body.systemInstruction ?? call.body.system_instruction) as unknown;
    expect(extractTexts(sys)).toEqual(['SYS']);

    const gc = call.body.generationConfig as Record<string, unknown>;
    expect(gc.responseMimeType).toBe('application/json');
    expect(gc.temperature).toBe(0.2);
    expect(normalizeTypes(gc.responseSchema)).toEqual(normalizeTypes(schema));
  });

  it('(b) candidates が空なら reject する', async () => {
    stubFetch(() => jsonResponse({ candidates: [] }));
    await expect(
      new GoogleProvider('test-key').generateStructured('p', schema, OPTIONS)
    ).rejects.toBeDefined();
  });

  it('(b2) candidates が欠落していても reject する', async () => {
    stubFetch(() => jsonResponse({}));
    await expect(
      new GoogleProvider('test-key').generateStructured('p', schema, OPTIONS)
    ).rejects.toBeDefined();
  });

  it('(c) HTTP 429 は message に "429" を含む Error で reject する (GeminiService が依存)', async () => {
    stubFetch(() =>
      jsonResponse(
        {
          error: {
            code: 429,
            message: 'Resource has been exhausted (e.g. check quota).',
            status: 'RESOURCE_EXHAUSTED',
          },
        },
        429
      )
    );
    const err = await new GoogleProvider('test-key')
      .generateStructured('p', schema, OPTIONS)
      .then(
        () => null,
        (e: unknown) => e
      );
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain('429');
  });

  it('(d) 空の API キーでコンストラクタが例外を投げる', () => {
    expect(() => new GoogleProvider('')).toThrow('Google API key is required.');
  });
});
