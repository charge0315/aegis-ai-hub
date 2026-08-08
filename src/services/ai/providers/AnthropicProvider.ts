import axios from 'axios';
import type { ResponseSchema } from "@google/generative-ai";
import type { AiProvider, LlmOptions } from "../AiProvider";

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

  async generateStructured<T>(
    prompt: string,
    schema: ResponseSchema,
    options: LlmOptions
  ): Promise<T> {
    const jsonSchema = this.convertGeminiSchemaToJsonSchema(schema);
    const systemPrompt = options.systemPrompt || "You are a helpful AI assistant.";

    const url = `${this.baseUrl.replace(/\/+$/, '')}/v1/messages`;
    
    const requestBody = {
      model: options.modelName,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt }
      ],
      tools: [
        {
          name: 'structured_output',
          description: 'Generates structured data conforming to the schema.',
          input_schema: jsonSchema
        }
      ],
      tool_choice: {
        type: 'tool',
        name: 'structured_output'
      },
      temperature: options.temperature
    };

    try {
      const response = await axios.post(url, requestBody, {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      });

      const content = response.data?.content;
      if (!Array.isArray(content)) {
        throw new Error("Invalid Anthropic API response format.");
      }

      const toolUse = content.find((item: any) => item.type === 'tool_use');
      if (!toolUse || toolUse.name !== 'structured_output') {
        throw new Error("Anthropic did not call the expected structured output tool.");
      }

      return toolUse.input as T;
    } catch (error: any) {
      const apiErrorMsg = error.response?.data?.error?.message || error.message;
      throw new Error(`Anthropic API request failed: ${apiErrorMsg}`, { cause: error });
    }
  }

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
