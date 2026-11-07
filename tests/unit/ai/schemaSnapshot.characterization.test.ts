import { describe, it, expect } from 'vitest';
import * as Prompts from '../../../src/services/prompts/GeminiPrompts';
import { convertGeminiSchemaToJsonSchema } from '../../../src/services/ai/providers/schemaConverter';

// 特性テスト: Gemini スキーマ(型の大文字小文字を除く)と他プロバイダ向け JSON Schema を固定する。
// SDK を import しない。

type Conv = Parameters<typeof convertGeminiSchemaToJsonSchema>[0];

function mapTypes(value: unknown, fn: (s: string) => string): unknown {
  if (Array.isArray(value)) return value.map((v) => mapTypes(v, fn));
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = k === 'type' && typeof v === 'string' ? fn(v) : mapTypes(v, fn);
    }
    return out;
  }
  return value;
}
const normalizeTypes = (v: unknown) => mapTypes(v, (s) => s.toLowerCase());
const upperTypes = (v: unknown) => mapTypes(v, (s) => s.toUpperCase());

const schemas: Record<string, unknown> = {
  CURATE_SCHEMA: Prompts.CURATE_SCHEMA,
  EVOLUTION_SCHEMA: Prompts.EVOLUTION_SCHEMA,
  FALLBACK_EVOLUTION_SCHEMA: Prompts.FALLBACK_EVOLUTION_SCHEMA,
  'RESTRUCTURE_SCHEMA(10)': Prompts.RESTRUCTURE_SCHEMA(10),
  DISCOVER_SITES_SCHEMA: Prompts.DISCOVER_SITES_SCHEMA,
  DISCOVER_ENGLISH_SITES_SCHEMA: Prompts.DISCOVER_ENGLISH_SITES_SCHEMA,
  TRANSLATE_ARTICLES_SCHEMA: Prompts.TRANSLATE_ARTICLES_SCHEMA,
  ANALYZE_TRENDS_SCHEMA: Prompts.ANALYZE_TRENDS_SCHEMA,
  SUGGEST_CATEGORY_DETAILS_SCHEMA: Prompts.SUGGEST_CATEGORY_DETAILS_SCHEMA,
  TRANSLATE_INTERESTS_SCHEMA: Prompts.TRANSLATE_INTERESTS_SCHEMA,
};

describe('schema snapshots', () => {
  for (const [name, schema] of Object.entries(schemas)) {
    it(`${name}: JSON Schema 変換結果`, () => {
      expect(convertGeminiSchemaToJsonSchema(schema as Conv)).toMatchSnapshot();
    });
    it(`${name}: Gemini スキーマ(type 小文字化)`, () => {
      expect(normalizeTypes(schema)).toMatchSnapshot();
    });
    it(`${name}: 小文字 type と大文字 type は同一の JSON Schema に変換される`, () => {
      expect(convertGeminiSchemaToJsonSchema(upperTypes(schema) as Conv)).toEqual(
        convertGeminiSchemaToJsonSchema(normalizeTypes(schema) as Conv)
      );
    });
  }
});

describe('schemaConverter explicit behavior', () => {
  const lower = {
    type: 'object',
    description: 'd',
    required: ['a'],
    properties: {
      a: { type: 'string', enum: ['x', 'y'] },
      b: { type: 'array', items: { type: 'integer' } },
      c: { type: 'boolean' },
      d: { type: 'number' },
    },
  };

  it('小文字 type を変換する', () => {
    expect(convertGeminiSchemaToJsonSchema(lower as unknown as Conv)).toEqual(lower);
  });

  it('大文字 type も同じ結果になる', () => {
    expect(convertGeminiSchemaToJsonSchema(upperTypes(lower) as Conv)).toEqual(lower);
  });

  it('null / undefined は undefined', () => {
    expect(convertGeminiSchemaToJsonSchema(null)).toBeUndefined();
    expect(convertGeminiSchemaToJsonSchema(undefined)).toBeUndefined();
  });
});
