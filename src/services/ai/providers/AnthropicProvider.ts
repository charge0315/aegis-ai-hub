import axios from 'axios';
import type { ResponseSchema } from "../geminiTypes";
import type { AiProvider, LlmOptions } from "../AiProvider";
import { readApiErrorMessage } from "./apiError";
import { convertGeminiSchemaToJsonSchema, type JsonSchema } from "./schemaConverter";

/** API バージョン 2026-10-21 では temperature / top_p / top_k を送ると 400 になる。 */
const ANTHROPIC_VERSION = '2026-10-21';

/** 思考（adaptive thinking）と回答の合計の上限。Claude 5.5 系は思考を止められない。 */
const MAX_TOKENS = 16000;

interface AnthropicMessageResponse {
  content?: unknown;
  stop_reason?: unknown;
}

interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

/** Anthropic の構造化出力は、すべての object に additionalProperties: false を要求する。 */
type StrictJsonSchema = Omit<JsonSchema, 'properties' | 'items'> & {
  properties?: Record<string, StrictJsonSchema | undefined>;
  items?: StrictJsonSchema;
  additionalProperties?: false;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTextBlock(item: unknown): item is AnthropicTextBlock {
  return isRecord(item) && item.type === 'text' && typeof item.text === 'string';
}

function toStrictSchema(schema: JsonSchema | undefined): StrictJsonSchema | undefined {
  if (!schema) {
    return undefined;
  }
  const { properties, items, ...rest } = schema;
  const strict: StrictJsonSchema = { ...rest };
  if (properties) {
    strict.properties = Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [key, toStrictSchema(value)])
    );
  }
  if (items) {
    strict.items = toStrictSchema(items);
  }
  if (schema.type === 'object') {
    strict.additionalProperties = false;
  }
  return strict;
}

export class AnthropicProvider implements AiProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    if (!apiKey) {
      throw new Error("Anthropic API key is required.");
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.anthropic.com';
  }

  /**
   * 構造化出力（output_config.format）で JSON を生成する。
   * Claude 5.5 系はツールの強制（tool_choice: tool）と temperature を受け付けないため、
   * ツール呼び出しではなく JSON Schema による出力指定を使う。options.temperature は送らない。
   */
  async generateStructured<T>(
    prompt: string,
    schema: ResponseSchema,
    options: LlmOptions
  ): Promise<T> {
    const jsonSchema = toStrictSchema(convertGeminiSchemaToJsonSchema(schema));
    const systemPrompt = options.systemPrompt || "You are a helpful AI assistant.";

    const url = `${this.baseUrl.replace(/\/+$/, '')}/v1/messages`;

    const requestBody = {
      model: options.modelName,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt }
      ],
      output_config: {
        format: {
          type: 'json_schema',
          schema: jsonSchema
        }
      }
    };

    try {
      const response = await axios.post<AnthropicMessageResponse>(url, requestBody, {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json'
        }
      });

      const content = response.data?.content;
      if (!Array.isArray(content)) {
        throw new Error("Invalid Anthropic API response format.");
      }

      const stopReason = response.data?.stop_reason;
      if (stopReason === 'max_tokens') {
        throw new Error("Anthropic response was truncated (stop_reason: max_tokens).");
      }
      if (stopReason === 'refusal') {
        throw new Error("Anthropic refused to answer (stop_reason: refusal).");
      }

      // 思考ブロックが先に並ぶので、type で text ブロックを選ぶ
      const text = content.filter(isTextBlock).map(block => block.text).join('');
      if (!text) {
        throw new Error("Anthropic returned no text output.");
      }

      return JSON.parse(text) as T;
    } catch (error: unknown) {
      const apiErrorMsg = readApiErrorMessage(error);
      throw new Error(`Anthropic API request failed: ${apiErrorMsg}`, { cause: error });
    }
  }
}
