import axios from 'axios';
import type { ResponseSchema } from "@google/generative-ai";
import type { AiProvider, LlmOptions } from "../AiProvider";

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
    const jsonSchema = this.convertGeminiSchemaToJsonSchema(schema);
    const systemPrompt = options.systemPrompt || "You are a helpful AI assistant. Always output JSON matching the specified schema.";
    const url = `${this.baseUrl.replace(/\/+$/, '')}/api/chat`;

    // Ollama のパラメータ。format に JSON Schema を渡して形式を固定させる
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestBody: any = {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastError: any = null;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.post(url, requestBody, {
          headers: { 'content-type': 'application/json' },
          timeout: 60000 // ローカル実行はモデルロード等で時間がかかる場合があるため長めのタイムアウト
        });

        const text = response.data?.message?.content;
        if (!text) {
          throw new Error("Ollama returned an empty response.");
        }

        // トークン使用量の記録コールバック
        if (options.onUsageUpdate) {
          const promptTokens = response.data.prompt_eval_count || 0;
          const completionTokens = response.data.eval_count || 0;
          options.onUsageUpdate(promptTokens, completionTokens);
        }

        return JSON.parse(text) as T;
      } catch (error: unknown) {
        lastError = error;
        attempts++;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        console.warn(`[OllamaProvider] Attempt ${attempts} failed. Error: ${err.message}`);
        
        if (attempts < maxAttempts) {
          // 2回目の試行では format: "json" (単なるJSONモード) にダウングレードしてリトライ
          requestBody.format = 'json';
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastErr = lastError as any;
    throw new Error(`Ollama generation failed after ${maxAttempts} attempts. Last error: ${lastErr?.message}`, { cause: lastError });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private convertGeminiSchemaToJsonSchema(schema: any): any {
    if (!schema) return undefined;
    
    const typeMap: Record<string, string> = {
      'STRING': 'string',
      'NUMBER': 'number',
      'INTEGER': 'integer',
      'BOOLEAN': 'boolean',
      'OBJECT': 'object',
      'ARRAY': 'array'
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsonSchema: any = {};
    
    if (schema.type) {
      const rawType = String(schema.type);
      jsonSchema.type = typeMap[rawType] || rawType.toLowerCase();
    }

    if (schema.description) {
      jsonSchema.description = schema.description;
    }

    if (schema.properties) {
      jsonSchema.properties = {};
      for (const [key, value] of Object.entries(schema.properties)) {
        jsonSchema.properties[key] = this.convertGeminiSchemaToJsonSchema(value);
      }
    }

    if (schema.required) {
      jsonSchema.required = schema.required;
    }

    if (schema.items) {
      jsonSchema.items = this.convertGeminiSchemaToJsonSchema(schema.items);
    }

    return jsonSchema;
  }
}
