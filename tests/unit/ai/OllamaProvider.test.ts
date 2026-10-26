import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { SchemaType, type ResponseSchema } from '@google/generative-ai';
import { OllamaProvider } from '../../../src/services/ai/providers/OllamaProvider';
import { convertGeminiSchemaToJsonSchema } from '../../../src/services/ai/providers/schemaConverter';
import { axiosError } from './axiosTestUtils';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    isAxiosError: (error: unknown): boolean =>
      typeof error === 'object' &&
      error !== null &&
      'isAxiosError' in error &&
      (error as { isAxiosError?: unknown }).isAxiosError === true,
  },
}));

const schema: ResponseSchema = {
  type: SchemaType.OBJECT,
  required: ['answer'],
  properties: {
    answer: { type: SchemaType.STRING },
  },
};

function readFormat(body: unknown): unknown {
  if (typeof body !== 'object' || body === null || !('format' in body)) {
    return undefined;
  }
  return (body as { format: unknown }).format;
}

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    vi.mocked(axios.post).mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    provider = new OllamaProvider('http://127.0.0.1:11434/');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses a chat response and reports token usage', async () => {
    const onUsageUpdate = vi.fn();
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        message: { content: '{"answer":"ok"}' },
        prompt_eval_count: 11,
        eval_count: 7,
      },
    });

    const result = await provider.generateStructured<{ answer: string }>(
      'hello',
      schema,
      { modelName: 'llama3', temperature: 0.4, systemPrompt: 'Be brief.', onUsageUpdate },
    );

    expect(result).toEqual({ answer: 'ok' });
    expect(onUsageUpdate).toHaveBeenCalledWith(11, 7);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/api/chat',
      expect.objectContaining({
        model: 'llama3',
        stream: false,
        format: convertGeminiSchemaToJsonSchema(schema),
        options: { temperature: 0.4 },
        messages: [
          {
            role: 'system',
            content: `Be brief.\n\nStrict JSON Output Schema:\n${JSON.stringify(convertGeminiSchemaToJsonSchema(schema))}`,
          },
          { role: 'user', content: 'hello' },
        ],
      }),
      {
        headers: { 'content-type': 'application/json' },
        timeout: 60000,
      },
    );
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('retries once with format json after an API error and then succeeds', async () => {
    const onUsageUpdate = vi.fn();
    const formats: unknown[] = [];
    vi.mocked(axios.post).mockImplementation(async (...args: unknown[]) => {
      formats.push(readFormat(args[1]));
      if (formats.length === 1) {
        throw axiosError('Request failed with status code 500', { error: { message: 'overloaded' } });
      }
      return { data: { message: { content: '{"answer":"retried"}' } } };
    });

    const result = await provider.generateStructured<{ answer: string }>(
      'hello',
      schema,
      { modelName: 'llama3', onUsageUpdate },
    );

    expect(result).toEqual({ answer: 'retried' });
    expect(formats[0]).toEqual(convertGeminiSchemaToJsonSchema(schema));
    expect(formats[1]).toBe('json');
    expect(onUsageUpdate).toHaveBeenCalledWith(0, 0);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      '[OllamaProvider] Attempt 1 failed. Error: Request failed with status code 500',
    );
  });

  it('fails after two empty responses', async () => {
    const formats: unknown[] = [];
    vi.mocked(axios.post).mockImplementation(async (...args: unknown[]) => {
      formats.push(readFormat(args[1]));
      return { data: { message: { content: '' } } };
    });

    await expect(provider.generateStructured('hello', schema, { modelName: 'llama3' })).rejects.toSatisfy((error: unknown) => {
      return error instanceof Error
        && error.message === 'Ollama generation failed after 2 attempts. Last error: Ollama returned an empty response.'
        && error.cause instanceof Error
        && error.cause.message === 'Ollama returned an empty response.';
    });
    expect(formats).toEqual([convertGeminiSchemaToJsonSchema(schema), 'json']);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it('fails after two API errors and reports the Axios message, not the response body', async () => {
    const failures: Error[] = [];
    const formats: unknown[] = [];
    vi.mocked(axios.post).mockImplementation(async (...args: unknown[]) => {
      formats.push(readFormat(args[1]));
      const failure = axiosError('Request failed with status code 503', {
        error: { message: 'unavailable' },
      });
      failures.push(failure);
      throw failure;
    });

    const providerWithDefaultUrl = new OllamaProvider();
    await expect(providerWithDefaultUrl.generateStructured('hello', schema, { modelName: 'llama3' })).rejects.toSatisfy((error: unknown) => {
      return error instanceof Error
        && error.message === 'Ollama generation failed after 2 attempts. Last error: Request failed with status code 503'
        && error.cause === failures[1];
    });
    expect(vi.mocked(axios.post).mock.calls[0]?.[0]).toBe('http://localhost:11434/api/chat');
    expect(formats[1]).toBe('json');
    expect(console.warn).toHaveBeenCalledTimes(2);
  });
});
