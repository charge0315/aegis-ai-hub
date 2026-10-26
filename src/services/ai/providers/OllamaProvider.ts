import axios from 'axios';
import type { ResponseSchema } from "@google/generative-ai";
import type { AiProvider, LlmOptions } from "../AiProvider";
import { readThrownMessage } from "./apiError";
import { convertGeminiSchemaToJsonSchema, type JsonSchema } from "./schemaConverter";

interface OllamaChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  format: JsonSchema | 'json' | undefined;
  options: {
    temperature: number;
  };
  stream: false;
}

interface OllamaChatResponse {
  message?: {
    content?: unknown;
  };
  prompt_eval_count?: unknown;
  eval_count?: unknown;
}

function usageCount(value: unknown): number {
  return typeof value === 'number' ? value || 0 : 0;
}

export class OllamaProvider implements AiProvider {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || 'http://localhost:11434';
  }

  async generateStructured<T>(
    prompt: string,
    schema: ResponseSchema,
    options: LlmOptions
  ): Promise<T> {
    const jsonSchema = convertGeminiSchemaToJsonSchema(schema);
    const systemPrompt = options.systemPrompt || "You are a helpful AI assistant. Always output JSON matching the specified schema.";
    const url = `${this.baseUrl.replace(/\/+$/, '')}/api/chat`;

    // Ollama のパラメータ。format に JSON Schema を渡して形式を固定させる
    const requestBody: OllamaChatRequest = {
      model: options.modelName,
      messages: [
        { role: 'system', content: `${systemPrompt}\n\nStrict JSON Output Schema:\n${JSON.stringify(jsonSchema)}` },
        { role: 'user', content: prompt }
      ],
      format: jsonSchema,
      options: {
        temperature: options.temperature ?? 0.2,
      },
      stream: false
    };

    let attempts = 0;
    const maxAttempts = 2;
    let lastError: unknown = null;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.post<OllamaChatResponse>(url, requestBody, {
          headers: { 'content-type': 'application/json' },
          timeout: 60000 // ローカル実行はモデルロード等で時間がかかる場合があるため長めのタイムアウト
        });

        const data = response.data;
        const text = data?.message?.content;
        if (typeof text !== 'string' || !text) {
          throw new Error("Ollama returned an empty response.");
        }

        // トークン使用量の記録コールバック
        if (options.onUsageUpdate) {
          const promptTokens = usageCount(data?.prompt_eval_count);
          const completionTokens = usageCount(data?.eval_count);
          options.onUsageUpdate(promptTokens, completionTokens);
        }

        return JSON.parse(text) as T;
      } catch (error: unknown) {
        lastError = error;
        attempts++;
        console.warn(`[OllamaProvider] Attempt ${attempts} failed. Error: ${readThrownMessage(error)}`);

        if (attempts < maxAttempts) {
          // 2回目の試行では format: "json" (単なるJSONモード) にダウングレードしてリトライ
          requestBody.format = 'json';
        }
      }
    }

    throw new Error(
      `Ollama generation failed after ${maxAttempts} attempts. Last error: ${readThrownMessage(lastError)}`,
      { cause: lastError }
    );
  }
}
