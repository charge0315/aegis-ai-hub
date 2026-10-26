import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RSSFetcher } from '../../src/services/RSSFetcher';

// rss-parser をモック
const mockParseURL = vi.fn();

vi.mock('rss-parser', () => {
  return {
    default: class MockParser {
      parseURL = mockParseURL;
    },
  };
});

describe('RSSFetcher', () => {
  let fetcher: RSSFetcher;

  beforeEach(() => {
    vi.clearAllMocks();
    fetcher = new RSSFetcher();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default concurrency', () => {
      const defaultFetcher = new RSSFetcher();
      expect(defaultFetcher).toBeInstanceOf(RSSFetcher);
    });

    it('should initialize with custom concurrency', () => {
      const customFetcher = new RSSFetcher(5);
      expect(customFetcher).toBeInstanceOf(RSSFetcher);
    });
  });

  describe('fetch', () => {
    it('should fetch and return feed items on success', async () => {
      const mockItems = [{ title: 'News 1', link: 'https://example.com/1' }];
      mockParseURL.mockResolvedValueOnce({ items: mockItems });

      const items = await fetcher.fetch('https://example.com/rss');
      expect(items).toEqual(mockItems);
      expect(mockParseURL).toHaveBeenCalledWith('https://example.com/rss');
    });

    it('should return empty array if feed has no items', async () => {
      mockParseURL.mockResolvedValueOnce({});

      const items = await fetcher.fetch('https://example.com/rss');
      expect(items).toEqual([]);
    });

    it('should retry on retryable error (e.g. ETIMEDOUT) and succeed', async () => {
      vi.useFakeTimers();
      const mockItems = [{ title: 'Recovered item' }];
      mockParseURL
        .mockRejectedValueOnce(new Error('connect ETIMEDOUT 192.0.2.1'))
        .mockResolvedValueOnce({ items: mockItems });

      const fetchPromise = fetcher.fetch('https://example.com/rss', 2);
      await vi.runAllTimersAsync();
      const result = await fetchPromise;

      expect(result).toEqual(mockItems);
      expect(mockParseURL).toHaveBeenCalledTimes(2);
    });

    it('should retry on Status code 429 and succeed', async () => {
      vi.useFakeTimers();
      const mockItems = [{ title: 'Rate limit recovered' }];
      mockParseURL
        .mockRejectedValueOnce(new Error('Status code 429'))
        .mockResolvedValueOnce({ items: mockItems });

      const fetchPromise = fetcher.fetch('https://example.com/rss', 2);
      await vi.runAllTimersAsync();
      const result = await fetchPromise;

      expect(result).toEqual(mockItems);
      expect(mockParseURL).toHaveBeenCalledTimes(2);
    });

    it('should retry on Status code 503 and succeed', async () => {
      vi.useFakeTimers();
      const mockItems = [{ title: 'Service recovered' }];
      mockParseURL
        .mockRejectedValueOnce(new Error('Status code 503'))
        .mockResolvedValueOnce({ items: mockItems });

      const fetchPromise = fetcher.fetch('https://example.com/rss', 2);
      await vi.runAllTimersAsync();
      const result = await fetchPromise;

      expect(result).toEqual(mockItems);
      expect(mockParseURL).toHaveBeenCalledTimes(2);
    });

    it('should retry on ENOTFOUND / ECONNREFUSED error', async () => {
      vi.useFakeTimers();
      const mockItems = [{ title: 'DNS recovered' }];
      mockParseURL
        .mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND example.com'))
        .mockResolvedValueOnce({ items: mockItems });

      const fetchPromise = fetcher.fetch('https://example.com/rss', 1);
      await vi.runAllTimersAsync();
      const result = await fetchPromise;

      expect(result).toEqual(mockItems);
      expect(mockParseURL).toHaveBeenCalledTimes(2);
    });

    it('should throw error after exhausting retries', async () => {
      vi.useFakeTimers();
      const timeoutError = new Error('Request timeout');
      mockParseURL.mockRejectedValue(timeoutError);

      const fetchPromise = fetcher.fetch('https://example.com/rss', 2);
      const rejectionPromise = expect(fetchPromise).rejects.toThrow('Request timeout');
      await vi.runAllTimersAsync();
      await rejectionPromise;

      expect(mockParseURL).toHaveBeenCalledTimes(3); // 初回 + リトライ2回
    });

    it('should throw immediately without retrying on non-retryable error (e.g. Invalid XML)', async () => {
      const xmlError = new Error('Non-whitespace before first tag');
      mockParseURL.mockRejectedValueOnce(xmlError);

      await expect(fetcher.fetch('https://example.com/rss', 2)).rejects.toThrow('Non-whitespace before first tag');
      expect(mockParseURL).toHaveBeenCalledTimes(1);
    });

    it('should throw immediately on 404 error without retry', async () => {
      const notFoundError = new Error('Status code 404');
      mockParseURL.mockRejectedValueOnce(notFoundError);

      await expect(fetcher.fetch('https://example.com/rss', 2)).rejects.toThrow('Status code 404');
      expect(mockParseURL).toHaveBeenCalledTimes(1);
    });

    it('should not retry when retries is set to 0', async () => {
      mockParseURL.mockRejectedValueOnce(new Error('ETIMEDOUT'));

      await expect(fetcher.fetch('https://example.com/rss', 0)).rejects.toThrow('ETIMEDOUT');
      expect(mockParseURL).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateFeed', () => {
    it('should return ok: true and status: 200 when feed is valid', async () => {
      mockParseURL.mockResolvedValueOnce({ items: [{ title: 'Item' }] });

      const result = await fetcher.validateFeed('https://example.com/rss');
      expect(result).toEqual({ ok: true, status: 200 });
      expect(mockParseURL).toHaveBeenCalledWith('https://example.com/rss');
    });

    it('should return ok: false and parsed status code on HTTP error', async () => {
      mockParseURL.mockRejectedValueOnce(new Error('Status code 403'));

      const result = await fetcher.validateFeed('https://example.com/rss');
      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(result.error).toContain('Status code 403');
    });

    it('should return ok: false and status: "ERROR" on generic error', async () => {
      mockParseURL.mockRejectedValueOnce(new Error('DNS resolution failed'));

      const result = await fetcher.validateFeed('https://example.com/rss');
      expect(result.ok).toBe(false);
      expect(result.status).toBe('ERROR');
      expect(result.error).toBe('DNS resolution failed');
    });

    it('should handle non-Error thrown objects', async () => {
      mockParseURL.mockRejectedValueOnce('Unknown string error');

      const result = await fetcher.validateFeed('https://example.com/rss');
      expect(result.ok).toBe(false);
      expect(result.status).toBe('ERROR');
      expect(result.error).toBe('Unknown string error');
    });
  });

  describe('fetchAll', () => {
    it('should fetch all feeds in parallel and return results', async () => {
      mockParseURL
        .mockResolvedValueOnce({ items: [{ title: 'Item 1' }] })
        .mockResolvedValueOnce({ items: [{ title: 'Item 2' }] });

      const feeds = [
        { category: 'AI', url: 'https://example.com/ai.rss' },
        { category: 'Tech', url: 'https://example.com/tech.rss' },
      ];

      const results = await fetcher.fetchAll(feeds);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        category: 'AI',
        url: 'https://example.com/ai.rss',
        items: [{ title: 'Item 1' }],
        success: true,
      });
      expect(results[1]).toEqual({
        category: 'Tech',
        url: 'https://example.com/tech.rss',
        items: [{ title: 'Item 2' }],
        success: true,
      });
    });

    it('should handle individual feed failures gracefully without throwing', async () => {
      mockParseURL
        .mockResolvedValueOnce({ items: [{ title: 'Success' }] })
        .mockRejectedValueOnce(new Error('Status code 500'));

      const feeds = [
        { category: 'AI', url: 'https://example.com/ai.rss' },
        { category: 'Broken', url: 'https://example.com/broken.rss' },
      ];

      const results = await fetcher.fetchAll(feeds);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].items).toEqual([{ title: 'Success' }]);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Status code 500');
    });

    it('should return empty array when feedConfigs is empty', async () => {
      const results = await fetcher.fetchAll([]);
      expect(results).toEqual([]);
      expect(mockParseURL).not.toHaveBeenCalled();
    });
  });
});
