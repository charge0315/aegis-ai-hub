import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExternalTrendFetcher } from '../../src/services/ExternalTrendFetcher';
import axios from 'axios';

// axios のモック
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('ExternalTrendFetcher', () => {
  let fetcher: ExternalTrendFetcher;

  beforeEach(() => {
    vi.clearAllMocks();
    fetcher = new ExternalTrendFetcher();
  });

  describe('fetchGoogleTrends', () => {
    it('should parse Google Trends RSS and return trend items with trafficVolume', async () => {
      const mockXml = `
        <rss version="2.0" xmlns:ht="https://trends.google.com/trending/rss">
          <channel>
            <item>
              <title>話題のキーワード1</title>
              <ht:approx_traffic>100K+</ht:approx_traffic>
            </item>
            <item>
              <title>話題のキーワード2</title>
            </item>
          </channel>
        </rss>
      `;

      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockXml });

      const trends = await fetcher.fetchGoogleTrends('JP');

      expect(trends).toHaveLength(2);
      expect(trends[0]).toEqual({
        title: '話題のキーワード1',
        source: 'Google Trends',
        trafficVolume: '100K+',
      });
      expect(trends[1]).toEqual({
        title: '話題のキーワード2',
        source: 'Google Trends',
        trafficVolume: undefined,
      });
      expect(axios.get).toHaveBeenCalledWith(
        'https://trends.google.com/trending/rss?geo=JP',
        expect.objectContaining({ timeout: 8000 })
      );
    });

    it('should respect custom geo parameter', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({ data: '<rss><channel></channel></rss>' });

      await fetcher.fetchGoogleTrends('US');

      expect(axios.get).toHaveBeenCalledWith(
        'https://trends.google.com/trending/rss?geo=US',
        expect.anything()
      );
    });

    it('should slice results to maximum 20 items', async () => {
      const items = Array.from({ length: 25 }, (_, i) => `<item><title>Trend ${i}</title></item>`).join('');
      const mockXml = `<rss><channel>${items}</channel></rss>`;

      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockXml });

      const trends = await fetcher.fetchGoogleTrends('JP');
      expect(trends).toHaveLength(20);
    });

    it('should return empty array on network error without throwing', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network connection error'));

      const trends = await fetcher.fetchGoogleTrends('JP');
      expect(trends).toEqual([]);
    });

    it('should return empty array when xml contains no items', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({ data: '<rss><channel></channel></rss>' });

      const trends = await fetcher.fetchGoogleTrends('JP');
      expect(trends).toEqual([]);
    });
  });

  describe('fetchYahooJapanTrends', () => {
    it('should parse buzz keywords from Yahoo Japan search HTML', async () => {
      const mockHtml = `
        <html>
          <body>
            <ul class="BuzznewsList">
              <li><span>急上昇ワードA</span></li>
            </ul>
            <div class="SearchResult">急上昇ワードB</div>
          </body>
        </html>
      `;

      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockHtml });

      const trends = await fetcher.fetchYahooJapanTrends();

      expect(trends).toHaveLength(2);
      expect(trends[0]).toEqual({
        title: '急上昇ワードA',
        source: 'Yahoo Japan',
      });
      expect(trends[1]).toEqual({
        title: '急上昇ワードB',
        source: 'Yahoo Japan',
      });
    });

    it('should trim newlines and filter out invalid text lengths', async () => {
      const tooLongText = 'A'.repeat(70);
      const mockHtml = `
        <html>
          <body>
            <div class="buzz">有効なワード\n詳細な説明文</div>
            <div class="buzz">X</div> <!-- 1文字なので除外 -->
            <div class="buzz">${tooLongText}</div> <!-- 60文字以上なので除外 -->
          </body>
        </html>
      `;

      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockHtml });

      const trends = await fetcher.fetchYahooJapanTrends();

      expect(trends).toHaveLength(1);
      expect(trends[0].title).toBe('有効なワード');
    });

    it('should slice results to maximum 15 items', async () => {
      const items = Array.from({ length: 20 }, (_, i) => `<div class="trend">TrendWord${i}</div>`).join('');
      const mockHtml = `<html><body>${items}</body></html>`;

      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockHtml });

      const trends = await fetcher.fetchYahooJapanTrends();
      expect(trends).toHaveLength(15);
    });

    it('should return empty array on network error without throwing', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('500 Internal Server Error'));

      const trends = await fetcher.fetchYahooJapanTrends();
      expect(trends).toEqual([]);
    });
  });

  describe('fetchXTrends', () => {
    it('should fetch guest token and retrieve X trends for JP WOEID', async () => {
      // 1. guest token POST
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { guest_token: 'mock-guest-token-12345' },
      });

      // 2. trends GET
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: [
          {
            trends: [
              { name: '#AI新技術', tweet_volume: 54321 },
              { name: '#新製品発表', tweet_volume: null },
            ],
          },
        ],
      });

      const trends = await fetcher.fetchXTrends('JP');

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.twitter.com/1.1/guest/activate.json',
        {},
        expect.anything()
      );
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.twitter.com/1.1/trends/place.json?id=23424856',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-guest-token': 'mock-guest-token-12345',
          }),
        })
      );
      expect(trends).toHaveLength(2);
      expect(trends[0]).toEqual({
        title: '#AI新技術',
        source: 'X (Twitter)',
        trafficVolume: '54321 tweets',
      });
      expect(trends[1]).toEqual({
        title: '#新製品発表',
        source: 'X (Twitter)',
        trafficVolume: undefined,
      });
    });

    it('should use worldwide WOEID 1 when geo is not JP', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { guest_token: 'mock-token' },
      });
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: [{ trends: [{ name: '#WorldTrend' }] }],
      });

      await fetcher.fetchXTrends('GLOBAL');

      expect(axios.get).toHaveBeenCalledWith(
        'https://api.twitter.com/1.1/trends/place.json?id=1',
        expect.anything()
      );
    });

    it('should return empty array if guest token is missing', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {},
      });

      const trends = await fetcher.fetchXTrends('JP');
      expect(trends).toEqual([]);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should return empty array if guest token request fails', async () => {
      vi.mocked(axios.post).mockRejectedValueOnce(new Error('403 Forbidden on guest token'));

      const trends = await fetcher.fetchXTrends('JP');
      expect(trends).toEqual([]);
    });

    it('should return empty array if trends request fails', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { guest_token: 'mock-token' },
      });
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('Rate limit exceeded'));

      const trends = await fetcher.fetchXTrends('JP');
      expect(trends).toEqual([]);
    });

    it('should slice X trends to maximum 20 items', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: { guest_token: 'mock-token' },
      });
      const rawTrends = Array.from({ length: 30 }, (_, i) => ({ name: `Trend${i}`, tweet_volume: 100 }));
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: [{ trends: rawTrends }],
      });

      const trends = await fetcher.fetchXTrends('JP');
      expect(trends).toHaveLength(20);
    });
  });

  describe('fetchAll', () => {
    it('should aggregate trends from X, Google, and Yahoo in order', async () => {
      // spyOn を使って個別メソッドの返り値をモック
      vi.spyOn(fetcher, 'fetchXTrends').mockResolvedValueOnce([
        { title: 'X Trend', source: 'X (Twitter)' },
      ]);
      vi.spyOn(fetcher, 'fetchGoogleTrends').mockResolvedValueOnce([
        { title: 'Google Trend', source: 'Google Trends' },
      ]);
      vi.spyOn(fetcher, 'fetchYahooJapanTrends').mockResolvedValueOnce([
        { title: 'Yahoo Trend', source: 'Yahoo Japan' },
      ]);

      const all = await fetcher.fetchAll('JP');

      expect(all).toHaveLength(3);
      expect(all[0].source).toBe('X (Twitter)');
      expect(all[1].source).toBe('Google Trends');
      expect(all[2].source).toBe('Yahoo Japan');
    });

    it('should combine results even if some sources fail or return empty', async () => {
      vi.spyOn(fetcher, 'fetchXTrends').mockResolvedValueOnce([]);
      vi.spyOn(fetcher, 'fetchGoogleTrends').mockResolvedValueOnce([
        { title: 'Google Trend Only', source: 'Google Trends' },
      ]);
      vi.spyOn(fetcher, 'fetchYahooJapanTrends').mockResolvedValueOnce([]);

      const all = await fetcher.fetchAll('JP');

      expect(all).toHaveLength(1);
      expect(all[0].title).toBe('Google Trend Only');
    });
  });
});
