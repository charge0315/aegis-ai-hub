import { describe, it, expect } from 'vitest';
import { DEFAULT_MODEL, PROVIDER_MODELS, replaceRetiredModel } from '../../src/models/AiModels';
import { CredentialsSchema } from '../../src/models/Schemas';

describe('AiModels', () => {
  it('uses the first Google model as the app default', () => {
    expect(DEFAULT_MODEL).toBe('gemini-3.8-flash');
    expect(PROVIDER_MODELS.google[0]).toBe(DEFAULT_MODEL);
  });

  it('does not offer retired model IDs in the model lists', () => {
    for (const models of Object.values(PROVIDER_MODELS)) {
      for (const model of models) {
        expect(replaceRetiredModel(model)).toBe(model);
      }
    }
  });

  it.each([
    ['claude-3-5-sonnet-latest', 'claude-sonnet-5-5'],
    ['claude-3-5-haiku-latest', 'claude-haiku-5-5'],
    ['claude-3-5-opus-latest', 'claude-opus-5-5'],
    ['o1-mini', 'gpt-6.1-terra'],
    ['gemini-3.5-pro', 'gemini-4-argon'],
  ])('replaces %s with %s', (retired, replacement) => {
    expect(replaceRetiredModel(retired)).toBe(replacement);
  });

  it('keeps models that still work, including deprecated ones', () => {
    for (const model of ['gemini-3.5-flash', 'gemini-2.5-flash', 'gpt-4o', 'my-custom-model']) {
      expect(replaceRetiredModel(model)).toBe(model);
    }
  });

  it('replaces a retired model when saved credentials are parsed', () => {
    const creds = CredentialsSchema.parse({ activeProvider: 'anthropic', activeModel: 'claude-3-5-sonnet-latest' });
    expect(creds.activeModel).toBe('claude-sonnet-5-5');
  });

  it('falls back to the default model when credentials have none', () => {
    expect(CredentialsSchema.parse({}).activeModel).toBe(DEFAULT_MODEL);
  });
});
