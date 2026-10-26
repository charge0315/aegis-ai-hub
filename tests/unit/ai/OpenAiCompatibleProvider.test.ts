import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { SchemaType, type ResponseSchema } from '@google/generative-ai';
import { OpenAiCompatibleProvider } from '../../../src/services/ai/providers/OpenAiCompatibleProvider';
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
    answer: { type: SchemaType.STRING, description: 'final answer' },
    tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
};

describe('OpenAiCompatibleProvider', () => {
  beforeEach(() => {
    vi.mocked(axios.post).mockReset();
  });

  it('parses a structured chat completion', async () => {
    const provider = new OpenAiCompatibleProvider('openai-key', 'https://api.groq.com/openai/v1/');
    vi.mocked(axios.post).mockResolvedValue({
      data: { choices: [{ message: { content: '{"answer":"ok","tags":["a"]}' } }] },
    });

    const result = await provider.generateStructured<{ answer: string; tags: string[] }>(
      'hello',
      schema,
      { modelName: 'llama-test', temperature: 0.4, systemPrompt: 'Be brief.' },
    );

    expect(result).toEqual({ answer: 'ok', tags: ['a'] });
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        model: 'llama-test',
        temperature: 0.4,
        messages: [
          { role: 'system', content: 'Be brief.' },
          { role: 'user', content: 'hello' },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'structured_output',
            strict: false,
            schema: convertGeminiSchemaToJsonSchema(schema),
          },
        },
      }),
      {
        headers: {
          'content-type': 'application/json',
          Authorization: 'Bearer openai-key',
        },
      },
    );
  });

  it('omits Authorization and uses the default system prompt when no API key is set', async () => {
    const provider = new OpenAiCompatibleProvider('');
    vi.mocked(axios.post).mockResolvedValue({
      data: { choices: [{ message: { content: '{"answer":"ok"}' } }] },
    });

    await provider.generateStructured('hello', schema, { modelName: 'gpt-test' });

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant. Always output JSON matching the specified schema.',
          },
          { role: 'user', content: 'hello' },
        ],
      }),
      { headers: { 'content-type': 'application/json' } },
    );
  });

  it('wraps an empty completion', async () => {
    const provider = new OpenAiCompatibleProvider('openai-key');
    vi.mocked(axios.post).mockResolvedValue({
      data: { choices: [{ message: { content: '' } }] },
    });

    await expect(provider.generateStructured('hello', schema, { modelName: 'gpt-test' })).rejects.toThrow(
      'OpenAI-compatible request failed: OpenAI-compatible provider returned an empty response.',
    );
  });

  it('prefers the Axios response error message and keeps the cause', async () => {
    const provider = new OpenAiCompatibleProvider('openai-key');
    const failure = axiosError('Request failed with status code 400', {
      error: { message: 'model not found' },
    });
    vi.mocked(axios.post).mockRejectedValue(failure);

    await expect(provider.generateStructured('hello', schema, { modelName: 'gpt-test' })).rejects.toSatisfy((error: unknown) => {
      return error instanceof Error
        && error.message === 'OpenAI-compatible request failed: model not found'
        && error.cause === failure;
    });
  });

  it('falls back to the Axios message when the body is not an error object', async () => {
    const provider = new OpenAiCompatibleProvider('openai-key');
    vi.mocked(axios.post).mockRejectedValue(axiosError('Request failed with status code 502', 'bad gateway'));

    await expect(provider.generateStructured('hello', schema, { modelName: 'gpt-test' })).rejects.toThrow(
      'OpenAI-compatible request failed: Request failed with status code 502',
    );
  });

  it('wraps invalid JSON from the completion', async () => {
    const provider = new OpenAiCompatibleProvider('openai-key');
    vi.mocked(axios.post).mockResolvedValue({
      data: { choices: [{ message: { content: 'not-json' } }] },
    });

    await expect(provider.generateStructured('hello', schema, { modelName: 'gpt-test' })).rejects.toSatisfy((error: unknown) => {
      return error instanceof Error
        && error.message.startsWith('OpenAI-compatible request failed:')
        && error.cause instanceof SyntaxError;
    });
  });
});
