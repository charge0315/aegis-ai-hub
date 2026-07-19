import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscoveryService } from '../../src/services/DiscoveryService';
import { GeminiService } from '../../src/services/GeminiService';
import { RSSFetcher } from '../../src/services/RSSFetcher';
import { FeedManager } from '../../src/services/FeedManager';
import { Interests } from '../../src/models/Schemas';

describe('DiscoveryService', () => {
  let discoveryService: DiscoveryService;
  let mockGeminiService: vi.Mocked<GeminiService>;
  let mockRSSFetcher: vi.Mocked<RSSFetcher>;
  let mockFeedManager: vi.Mocked<FeedManager>;

  beforeEach(() => {
    mockGeminiService = {
      discoverSites: vi.fn().mockResolvedValue([]),
      discoverEnglishSites: vi.fn().mockResolvedValue([]),
      getFallbackEvolutionProposals: vi.fn().mockResolvedValue({ sites: [] }),
      getRestructureProposal: vi.fn(),
      getEvolutionProposals: vi.fn().mockResolvedValue({ sites: [], brands: [], keywords: [] }),
      updateApiKey: vi.fn(),
      reacquireAllFeeds: vi.fn().mockResolvedValue([]),
    } as unknown as vi.Mocked<GeminiService>;

    mockRSSFetcher = {
      fetch: vi.fn(),
    } as unknown as vi.Mocked<RSSFetcher>;

    mockFeedManager = {
      config: {},
      getActiveFeeds: vi.fn().mockReturnValue([]),
      getAllActiveFeeds: vi.fn().mockReturnValue([]),
      addFeed: vi.fn(),
      reportSuccess: vi.fn(),
      reportFailure: vi.fn(),
    } as unknown as vi.Mocked<FeedManager>;

    discoveryService = new DiscoveryService(
      mockGeminiService,
      mockRSSFetcher,
      mockFeedManager
    );
  });

  describe('run', () => {
    it('should fetch suggested sites and add valid ones to FeedManager', async () => {
      const interests: Interests = { categories: { 'AI': { emoji: '🤖', brands: [], keywords: [], score: 5 } } };
      const suggestedSites = [
        { name: 'Valid AI Blog', url: 'https://example.com/rss', category: 'AI' },
        { name: 'Invalid Site', url: 'https://invalid.com/rss', category: 'AI' }
      ];

      mockGeminiService.discoverSites.mockResolvedValue(suggestedSites);
      mockRSSFetcher.fetch.mockImplementation(async (url: string) => {
        if (url === 'https://example.com/rss') return [{ title: 'Article 1', link: 'l1', content: 'c1', date: new Date().toISOString(), category: 'AI', brand: 'B', score: 10, language: 'en', img: null }];
        throw new Error('Fetch failed');
      });

      const result = await discoveryService.run(interests);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Valid AI Blog');
      expect(mockFeedManager.addFeed).toHaveBeenCalledWith('AI', 'https://example.com/rss', mockRSSFetcher);
    });
  });

  describe('getProposals', () => {
    it('should return valid sites, brands, and keywords', async () => {
      const interests: Interests = { categories: { 'AI': { emoji: '🤖', brands: [], keywords: [], score: 5 } } };
      const apiResult = {
        sites: [{ name: 'Valid AI Blog', url: 'https://example.com/rss', category: 'AI', reason: 'Good source' }],
        brands: [{ value: 'OpenAI', category: 'AI', reason: 'Leading company' }],
        keywords: [{ value: 'LLM', category: 'AI', reason: 'Core tech' }]
      };

      mockGeminiService.getEvolutionProposals.mockResolvedValue(apiResult);
      mockRSSFetcher.fetch.mockResolvedValue([{ title: 'Article', link: 'l1', content: 'c1', date: new Date().toISOString(), category: 'AI', brand: 'B', score: 10, language: 'en', img: null }]);

      const proposals = await discoveryService.getProposals(interests);

      expect(mockGeminiService.getEvolutionProposals).toHaveBeenCalled();
      expect(proposals.sites).toHaveLength(1);
      expect(proposals.sites[0].name).toBe('Valid AI Blog');
    });

    it('should use fallback sources if no specific sites are found', async () => {
      const interests: Interests = { categories: { 'Niche Topic': { emoji: '✨', brands: [], keywords: [], score: 5 } } };
      
      mockGeminiService.getEvolutionProposals.mockResolvedValue({ sites: [], brands: [], keywords: [] });
      mockGeminiService.getFallbackEvolutionProposals.mockResolvedValue({
        sites: [{ name: 'Google News Fallback', url: 'https://news.google.com/rss', category: 'Niche Topic', reason: 'Fallback' }]
      });
      mockRSSFetcher.fetch.mockResolvedValue([{ title: 'Fallback Article', link: 'f1', content: 'c1', date: new Date().toISOString(), category: 'AI', brand: 'B', score: 10, language: 'en', img: null }]);

      const result = await discoveryService.getProposals(interests);

      expect(result.sites).toHaveLength(1);
      expect(result.sites[0].name).toBe('Google News Fallback');
    });
  });

  describe('reacquireAllFeeds', () => {
    it('should query Gemini, validate URLs, update feed config for successful ones, and preserve ones that failed', async () => {
      const interests: Interests = {
        categories: {
          'AI': { emoji: '🤖', brands: [], keywords: [], score: 5 },
          'NoNewFeeds': { emoji: '❌', brands: [], keywords: [], score: 5 }
        }
      };

      mockFeedManager.config = {
        'AI': { active: ['https://old-ai.com/rss'], pool: [], failures: {} },
        'NoNewFeeds': { active: ['https://old-nonew.com/rss'], pool: [], failures: {} }
      };
      mockFeedManager.saveConfig = vi.fn().mockResolvedValue(undefined);

      mockGeminiService.reacquireAllFeeds.mockResolvedValue([
        { name: 'New AI Source', url: 'https://new-ai.com/rss', category: 'AI' },
        { name: 'Failed Source', url: 'https://failed.com/rss', category: 'AI' },
        { name: 'NoNew Source', url: 'https://new-nonew-failed.com/rss', category: 'NoNewFeeds' }
      ]);

      mockRSSFetcher.fetch.mockImplementation(async (url: string) => {
        if (url === 'https://new-ai.com/rss') {
          return [{ title: 'New Article', link: 'l1', content: 'c1', date: new Date().toISOString(), category: 'AI', brand: 'B', score: 10, language: 'en', img: null }];
        }
        throw new Error('Fetch failed');
      });

      const updatedConfig = await discoveryService.reacquireAllFeeds(interests);

      expect(updatedConfig['AI'].active).toEqual(['https://new-ai.com/rss']);
      expect(updatedConfig['NoNewFeeds'].active).toEqual(['https://old-nonew.com/rss']);
      expect(mockFeedManager.saveConfig).toHaveBeenCalled();
    });
  });
});
