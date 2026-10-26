import axios from 'axios';
import type { ResponseSchema } from "@google/generative-ai";
import type { AiProvider, LlmOptions } from "../AiProvider";
import { readApiErrorMessage } from "./apiError";
import { convertGeminiSchemaToJsonSchema } from "./schemaConverter";

interface AnthropicMessageResponse {
  content?: unknown;
}

interface AnthropicToolUse {
  type: 'tool_use';
  name?: unknown;
  input?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isToolUseBlock(item: unknown): item is AnthropicToolUse {
  return isRecord(item) && item.type === 'tool_use';
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

  async generateStructured<T>(
    prompt: string,
    schema: ResponseSchema,
    options: LlmOptions
  ): Promise<T> {
    const jsonSchema = convertGeminiSchemaToJsonSchema(schema);
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
      const response = await axios.post<AnthropicMessageResponse>(url, requestBody, {
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

      const toolUse = content.find(isToolUseBlock);
      if (!toolUse || toolUse.name !== 'structured_output') {
        throw new Error("Anthropic did not call the expected structured output tool.");
      }

      return toolUse.input as T;
    } catch (error: unknown) {
      const apiErrorMsg = readApiErrorMessage(error);
      throw new Error(`Anthropic API request failed: ${apiErrorMsg}`, { cause: error });
    }
  }
}
