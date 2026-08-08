import axios from 'axios';
import type { ResponseSchema } from "@google/generative-ai";
import type { AiProvider, LlmOptions } from "../AiProvider";

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
    const jsonSchema = this.convertGeminiSchemaToJsonSchema(schema);
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
      temperature: options.temperature ?? 0.2
    };

    try {
      const headers: Record<string, string> = {
        'content-type': 'application/json'
      };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await axios.post(url, requestBody, { headers });
      const text = response.data?.choices?.[0]?.message?.content;

      if (!text) {
        throw new Error("OpenAI-compatible provider returned an empty response.");
      }

      return JSON.parse(text) as T;
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      const apiErrorMsg = err.response?.data?.error?.message || err.message;
      throw new Error(`OpenAI-compatible request failed: ${apiErrorMsg}`, { cause: error });
    }
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
