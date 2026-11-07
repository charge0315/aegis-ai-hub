import axios from 'axios';
import type { ResponseSchema } from "@google/generative-ai";
import type { AiProvider, LlmOptions } from "../AiProvider";
import { readApiErrorMessage } from "./apiError";
import { convertGeminiSchemaToJsonSchema } from "./schemaConverter";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
}

/**
 * OpenAI の推論モデル（gpt-5 以降・o 系）か。
 * 推論モデルが temperature を受け付けるかは公式に明記が無いため、送らない側に倒す。
 */
const REASONING_MODEL_PATTERN = /^(gpt-([5-9]|\d{2,})|o\d)/;

export class OpenAiCompatibleProvider implements AiProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey || '';
    this.baseUrl = baseUrl || 'https://api.openai.com/v1';
  }

  async generateStructured<T>(
    prompt: string,
    schema: ResponseSchema,
    options: LlmOptions
  ): Promise<T> {
    const jsonSchema = convertGeminiSchemaToJsonSchema(schema);
    const systemPrompt = options.systemPrompt || "You are a helpful AI assistant. Always output JSON matching the specified schema.";

    const url = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    // OpenAI 構造化出力 (Structured Outputs) のパラメータ
    const requestBody = {
      model: options.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'structured_output',
          strict: false, // 互換性重視のため strict: false とする
          schema: jsonSchema
        }
      },
      ...(REASONING_MODEL_PATTERN.test(options.modelName)
        ? {}
        : { temperature: options.temperature ?? 0.2 })
    };

    try {
      const headers: Record<string, string> = {
        'content-type': 'application/json'
      };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await axios.post<ChatCompletionResponse>(url, requestBody, { headers });
      const text = response.data?.choices?.[0]?.message?.content;

      if (typeof text !== 'string' || !text) {
        throw new Error("OpenAI-compatible provider returned an empty response.");
      }

      return JSON.parse(text) as T;
    } catch (error: unknown) {
      const apiErrorMsg = readApiErrorMessage(error);
      throw new Error(`OpenAI-compatible request failed: ${apiErrorMsg}`, { cause: error });
    }
  }
}
