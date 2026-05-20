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
      discoverSites: vi.fn(),
      discoverEnglishSites: vi.fn(),
      getFallbackEvolutionProposals: vi.fn(),
      getRestructureProposal: vi.fn(),
      getEvolutionProposals: vi.fn(),
      updateApiKey: vi.fn(),
    } as unknown as vi.Mocked<GeminiService>;

    mockRSSFetcher = {
      fetch: vi.fn(),
    } as unknown as vi.Mocked<RSSFetcher>;

    mockFeedManager = {
      config: {},
      getActiveFeeds: vi.fn().mockReturnValue([]),
      getAllActiveFeeds: vi.fn().mockReturnValue([]),
      addFeed: vi.fn(),
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
        if (url === 'https://example.com/rss') return [{ title: 'Article 1', link: 'l1', content: 'c1', date: new Date().toISOString() }];
        throw new Error('Fetch failed');
      });

      const result = await discoveryService.run(interests);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Valid AI Blog');
      expect(mockFeedManager.addFeed).toHaveBeenCalledWith('AI', 'https://example.com/rss', expect.anything(), 'Valid AI Blog');
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
      mockRSSFetcher.fetch.mockResolvedValue([{ title: 'Article', link: 'l1', content: 'c1', date: new Date().toISOString() }]);

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
      mockRSSFetcher.fetch.mockResolvedValue([{ title: 'Fallback Article', link: 'f1', content: 'c1', date: new Date().toISOString() }]);

      const result = await discoveryService.getProposals(interests);

      expect(result.sites).toHaveLength(1);
      expect(result.sites[0].name).toBe('Google News Fallback');
    });
  });
});
