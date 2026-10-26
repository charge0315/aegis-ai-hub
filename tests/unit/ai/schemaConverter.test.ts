import { describe, it, expect } from 'vitest';
import { SchemaType, type ResponseSchema } from '@google/generative-ai';
import { convertGeminiSchemaToJsonSchema } from '../../../src/services/ai/providers/schemaConverter';

describe('convertGeminiSchemaToJsonSchema', () => {
  it('converts nested objects, arrays, required, and enum, and drops format, nullable, and minItems', () => {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      description: 'article archive',
      required: ['summary', 'tags', 'metadata'],
      properties: {
        summary: {
          type: SchemaType.STRING,
          description: 'short summary',
          nullable: true,
        },
        tags: {
          type: SchemaType.ARRAY,
          description: 'topic tags',
          minItems: 1,
          items: { type: SchemaType.STRING },
        },
        metadata: {
          type: SchemaType.OBJECT,
          required: ['sentiment'],
          properties: {
            sentiment: {
              type: SchemaType.STRING,
              format: 'enum',
              enum: ['positive', 'neutral', 'negative'],
              description: 'tone',
            },
            importance: { type: SchemaType.NUMBER },
            rank: { type: SchemaType.INTEGER },
            flagged: { type: SchemaType.BOOLEAN },
          },
        },
      },
    };

    expect(convertGeminiSchemaToJsonSchema(schema)).toEqual({
      type: 'object',
      description: 'article archive',
      required: ['summary', 'tags', 'metadata'],
      properties: {
        summary: { type: 'string', description: 'short summary' },
        tags: {
          type: 'array',
          description: 'topic tags',
          items: { type: 'string' },
        },
        metadata: {
          type: 'object',
          required: ['sentiment'],
          properties: {
            sentiment: { type: 'string', description: 'tone', enum: ['positive', 'neutral', 'negative'] },
            importance: { type: 'number' },
            rank: { type: 'integer' },
            flagged: { type: 'boolean' },
          },
        },
      },
    });
  });

  it('converts a root array whose items are objects', () => {
    const schema: ResponseSchema = {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        required: ['name'],
        properties: {
          name: { type: SchemaType.STRING },
        },
      },
    };

    expect(convertGeminiSchemaToJsonSchema(schema)).toEqual({
      type: 'array',
      items: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
        },
      },
    });
  });

  it('keeps an empty required array and omits an empty description', () => {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      description: '',
      required: [],
      properties: {
        name: { type: SchemaType.STRING, description: '' },
      },
    };

    expect(convertGeminiSchemaToJsonSchema(schema)).toEqual({
      type: 'object',
      required: [],
      properties: {
        name: { type: 'string' },
      },
    });
  });

  it('maps uppercase Gemini type names and lowercases unknown types', () => {
    expect(convertGeminiSchemaToJsonSchema({
      type: 'ARRAY',
      items: { type: 'INTEGER' },
    } as ResponseSchema)).toEqual({
      type: 'array',
      items: { type: 'integer' },
    });

    expect(convertGeminiSchemaToJsonSchema({
      type: 'CUSTOM',
    } as ResponseSchema)).toEqual({
      type: 'custom',
    });
  });

  it('returns undefined for null and undefined', () => {
    expect(convertGeminiSchemaToJsonSchema(null)).toBeUndefined();
    expect(convertGeminiSchemaToJsonSchema(undefined)).toBeUndefined();
  });
});
