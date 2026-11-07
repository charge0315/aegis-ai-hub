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

  it('returns the JSON from the text block of a structured output response', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        stop_reason: 'end_turn',
        content: [
          { type: 'thinking', thinking: '' },
          { type: 'text', text: '{"sentiment":"positive"}' },
        ],
      },
    });

    const result = await provider.generateStructured<{ sentiment: string }>('hello', schema, options);

    expect(result).toEqual({ sentiment: 'positive' });
    expect(axios.post).toHaveBeenCalledWith(
      'https://example.com/anthropic/v1/messages',
      {
        model: 'claude-test',
        max_tokens: 16000,
        system: 'Be brief.',
        messages: [{ role: 'user', content: 'hello' }],
        output_config: {
          format: {
            type: 'json_schema',
            schema: { ...convertGeminiSchemaToJsonSchema(schema), additionalProperties: false },
          },
        },
      },
      {
        headers: {
          'x-api-key': 'anthropic-key',
          'anthropic-version': '2026-10-21',
          'content-type': 'application/json',
        },
      },
    );
  });

  it('does not send temperature or a forced tool choice', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"sentiment":"neutral"}' }] },
    });

    await provider.generateStructured('hello', schema, options);

    const body = vi.mocked(axios.post).mock.calls[0][1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('temperature');
    expect(body).not.toHaveProperty('tool_choice');
    expect(body).not.toHaveProperty('tools');
  });

  it('adds additionalProperties: false to every nested object schema', async () => {
    const nested: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        items: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: { name: { type: SchemaType.STRING } },
          },
        },
      },
    };
    vi.mocked(axios.post).mockResolvedValue({
      data: { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"items":[]}' }] },
    });

    await provider.generateStructured('hello', nested, options);

    const body = vi.mocked(axios.post).mock.calls[0][1] as {
      output_config: { format: { schema: Record<string, unknown> } };
    };
    expect(body.output_config.format.schema).toEqual({
      type: 'object',
      additionalProperties: false,
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: { name: { type: 'string' } },
          },
        },
      },
    });
  });

  it('wraps an invalid response that is not a content array', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { content: 'nope' } });

    await expect(provider.generateStructured('hello', schema, options)).rejects.toThrow(
      'Anthropic API request failed: Invalid Anthropic API response format.',
    );
  });

  it('rejects a response truncated by max_tokens', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"senti' }] },
    });

    await expect(provider.generateStructured('hello', schema, options)).rejects.toThrow(
      'Anthropic API request failed: Anthropic response was truncated (stop_reason: max_tokens).',
    );
  });

  it('rejects a refusal', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { stop_reason: 'refusal', content: [{ type: 'text', text: '' }] },
    });

    await expect(provider.generateStructured('hello', schema, options)).rejects.toThrow(
      'Anthropic API request failed: Anthropic refused to answer (stop_reason: refusal).',
    );
  });

  it('rejects a response without a text block', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }] },
    });

    await expect(provider.generateStructured('hello', schema, options)).rejects.toThrow(
      'Anthropic API request failed: Anthropic returned no text output.',
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
