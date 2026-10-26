import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { SchemaType, type ResponseSchema } from '@google/generative-ai';
import { AnthropicProvider } from '../../../src/services/ai/providers/AnthropicProvider';
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
  required: ['sentiment'],
  properties: {
    sentiment: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: ['positive', 'neutral', 'negative'],
    },
  },
};

const options = {
  modelName: 'claude-test',
  temperature: 0.4,
  systemPrompt: 'Be brief.',
};

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    vi.mocked(axios.post).mockReset();
    provider = new AnthropicProvider('anthropic-key', 'https://example.com/anthropic/');
  });

  it('requires an API key', () => {
    expect(() => new AnthropicProvider('')).toThrow('Anthropic API key is required.');
  });

  it('returns structured tool input', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        content: [
          { type: 'text', text: 'ignored' },
          { type: 'tool_use', name: 'structured_output', input: { sentiment: 'positive' } },
        ],
      },
    });

    const result = await provider.generateStructured<{ sentiment: string }>('hello', schema, options);

    expect(result).toEqual({ sentiment: 'positive' });
    expect(axios.post).toHaveBeenCalledWith(
      'https://example.com/anthropic/v1/messages',
      expect.objectContaining({
        model: 'claude-test',
        max_tokens: 4000,
        system: 'Be brief.',
        messages: [{ role: 'user', content: 'hello' }],
        temperature: 0.4,
        tool_choice: { type: 'tool', name: 'structured_output' },
        tools: [
          expect.objectContaining({
            name: 'structured_output',
            input_schema: convertGeminiSchemaToJsonSchema(schema),
          }),
        ],
      }),
      {
        headers: {
          'x-api-key': 'anthropic-key',
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
      },
    );
  });

  it('wraps an invalid response that is not a content array', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { content: 'nope' } });

    await expect(provider.generateStructured('hello', schema, options)).rejects.toThrow(
      'Anthropic API request failed: Invalid Anthropic API response format.',
    );
  });

  it('wraps a response that does not call structured_output', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { content: [{ type: 'text', text: 'plain' }] },
    });

    await expect(provider.generateStructured('hello', schema, options)).rejects.toThrow(
      'Anthropic API request failed: Anthropic did not call the expected structured output tool.',
    );
  });

  it('prefers the Axios response error message and keeps the cause', async () => {
    const failure = axiosError('Request failed with status code 401', {
      error: { type: 'authentication_error', message: 'invalid x-api-key' },
    });
    vi.mocked(axios.post).mockRejectedValue(failure);

    await expect(provider.generateStructured('hello', schema, options)).rejects.toSatisfy((error: unknown) => {
      return error instanceof Error
        && error.message === 'Anthropic API request failed: invalid x-api-key'
        && error.cause === failure;
    });
  });

  it('falls back to the Error message when the Axios body has no error.message', async () => {
    const failure = axiosError('Network Error');
    vi.mocked(axios.post).mockRejectedValue(failure);

    await expect(provider.generateStructured('hello', schema, options)).rejects.toThrow(
      'Anthropic API request failed: Network Error',
    );
  });
});
