import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiService } from '../../src/services/GeminiService';
import type { Interests, FeedConfig } from '../../src/models/Schemas';

// Mocking @google/genai
vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    models = {
      generateContent: vi.fn()
    };
  }
  return {
    GoogleGenAI: MockGoogleGenAI,
    Type: {
      OBJECT: 'OBJECT',
      ARRAY: 'ARRAY',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      BOOLEAN: 'BOOLEAN'
    }
  };
});

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(() => {
    service = new GeminiService('test-key');
    vi.clearAllMocks();
  });

  describe('high reasoning model mapping', () => {
    const mapFor = (activeModel: string): string => {
      const target = service as unknown as {
        activeModelName: string;
        highReasoningModelName: string;
        getMappedModelName: (alias: string) => string;
      };
      target.activeModelName = activeModel;
      return target.getMappedModelName(target.highReasoningModelName);
    };

    it.each([
      ['gemini-3.8-flash', 'gemini-4-argon'],
      ['gemini-3.5-flash-lite', 'gemini-4-argon'],
      ['claude-haiku-5-5', 'claude-sonnet-5-5'],
      ['gpt-6.1-terra', 'gpt-6.1-sol'],
      ['gpt-6-luna', 'gpt-6.1-sol'],
    ])('maps the light model %s to %s', (active, expected) => {
      expect(mapFor(active)).toBe(expected);
    });

    it.each(['gemini-4-argon', 'claude-opus-5-5', 'gpt-6-astra', 'gemma4'])(
      'keeps the non-light model %s',
      (active) => {
        expect(mapFor(active)).toBe(active);
      },
    );
  });

  describe('getRestructureProposal', () => {
    it('should recover missing brands and keywords (Data Retention Recovery)', async () => {
      const interests: Interests = {
        categories: {
          'Old Tech': {
            emoji: '💾',
            brands: ['Apple', 'Microsoft'],
            keywords: ['Windows', 'Mac'],
            score: 10
          }
        }
      };
      const currentFeeds: FeedConfig = {
        'Old Tech': { active: ['http://old.com'], pool: [], failures: {} }
      };

      // Mock generateStructured to simulate AI "forgetting" some data
      // We need to mock the private generateStructured or the public method's call to it
      // Since generateStructured is protected, we can mock it on the instance or prototype
      
      const mockAiResult = {
        categories: [
          {
            name: 'Modern Computing',
            emoji: '💻',
            brands: ['Apple'], // Microsoft is missing
            keywords: ['macOS'], // Windows is missing
            score: 9,
            reason: 'Consolidated tech category'
          }
        ],
        feedMapping: [
          { url: 'http://old.com', newCategory: 'Modern Computing' }
        ],
        newSuggestedFeeds: []
      };

      vi.spyOn(service as unknown as { generateStructured: () => Promise<unknown> }, 'generateStructured').mockResolvedValue(mockAiResult);

      const result = await service.getRestructureProposal(interests, currentFeeds, 1);

      expect(result.categories['Modern Computing']).toBeDefined();
      // Microsoft and Windows should be recovered into the first category
      expect(result.categories['Modern Computing'].brands).toContain('Apple');
      expect(result.categories['Modern Computing'].brands).toContain('Microsoft');
      expect(result.categories['Modern Computing'].keywords).toContain('macOS');
      expect(result.categories['Modern Computing'].keywords).toContain('Windows');
    });

    it('should normalize category names returned by AI', async () => {
      const interests: Interests = { categories: {} };
      const currentFeeds: FeedConfig = {};

      const mockAiResult = {
        categories: [
          { name: 'AI & ML', emoji: '🤖', brands: [], keywords: [], score: 10, reason: '' }
        ],
        feedMapping: [
          { url: 'http://ai.com', newCategory: 'AI&ML' } // Normalized name
        ],
        newSuggestedFeeds: [
          { name: 'New Feed', url: 'http://new.com', category: 'ai ・ ml' } // Normalized name
        ]
      };

      vi.spyOn(service as unknown as { generateStructured: () => Promise<unknown> }, 'generateStructured').mockResolvedValue(mockAiResult);
      vi.spyOn(service as unknown as { _isValidUrl: () => boolean }, '_isValidUrl').mockReturnValue(true);

      const result = await service.getRestructureProposal(interests, currentFeeds, 1);

      expect(result.feedConfig['AI & ML']).toBeDefined();
      expect(result.feedConfig['AI & ML'].active).toContain('http://ai.com');
      expect(result.feedConfig['AI & ML'].active).toContain('http://new.com');
    });
  });
});
