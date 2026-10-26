import type { ResponseSchema } from "@google/generative-ai";

/**
 * Gemini の ResponseSchema を、各プロバイダが渡す JSON Schema オブジェクトへ変換する。
 * Anthropic / OpenAI 互換 / Ollama に同じ private 実装があったものを共通化した。
 * 写すのは type / description / properties / required / items / enum。
 * enum を落とすと Gemini 以外のプロバイダで値の制約が効かないため、文字列配列のときだけ引き継ぐ。
 */
export interface JsonSchema {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema | undefined>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
}

const GEMINI_TYPE_TO_JSON: Record<string, string> = {
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  BOOLEAN: 'boolean',
  OBJECT: 'object',
  ARRAY: 'array',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const required: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      return undefined;
    }
    required.push(item);
  }
  return required;
}

function convertNode(schema: unknown): JsonSchema | undefined {
  if (!schema) {
    return undefined;
  }
  if (!isRecord(schema)) {
    return {};
  }

  const jsonSchema: JsonSchema = {};

  if (schema.type) {
    const rawType = String(schema.type);
    jsonSchema.type = GEMINI_TYPE_TO_JSON[rawType] || rawType.toLowerCase();
  }

  if (typeof schema.description === 'string' && schema.description) {
    jsonSchema.description = schema.description;
  }

  if (isRecord(schema.properties)) {
    const properties: Record<string, JsonSchema | undefined> = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      properties[key] = convertNode(value);
    }
    jsonSchema.properties = properties;
  }

  const required = readStringArray(schema.required);
  if (required) {
    jsonSchema.required = required;
  }

  if (schema.items) {
    jsonSchema.items = convertNode(schema.items);
  }

  const enumValues = readStringArray(schema.enum);
  if (enumValues && enumValues.length > 0) {
    jsonSchema.enum = enumValues;
  }

  return jsonSchema;
}

export function convertGeminiSchemaToJsonSchema(
  schema: ResponseSchema | null | undefined
): JsonSchema | undefined {
  return convertNode(schema);
}
