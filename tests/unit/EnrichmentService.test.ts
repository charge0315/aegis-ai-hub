import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnrichmentService } from '../../src/services/EnrichmentService';
import type { ArticleType } from '../../src/models/Article';
import type { GeminiService } from '../../src/services/GeminiService';
import axios from 'axios';

// axios のモック
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

// ImageCacheManager のモック
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn().mockResolvedValue(undefined);
const mockCacheInit = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/services/ImageCacheManager', () => {
  return {
    ImageCacheManager: class MockImageCacheManager {
      init = mockCacheInit;
      get = mockCacheGet;
      set = mockCacheSet;
    },
  };
});

describe('EnrichmentService', () => {
  let service: EnrichmentService;
  let mockGeminiService: GeminiService;
  const mockTranslateArticles = vi.fn();

  const baseArticle: ArticleType = {
    title: 'Test Article Title',
    link: 'https://example.com/article-1',
    desc: 'Article description',
    brand: 'TechNews',
    score: 5,
    img: null,
    date: '2026-10-26T00:00:00Z',
    category: 'AI・ソフトウェア',
    language: 'en',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTranslateArticles.mockReset();
    mockGeminiService = {
      translateArticles: mockTranslateArticles,
    } as unknown as GeminiService;
    service = new EnrichmentService(mockGeminiService);
  });

  describe('constructor & init', () => {
    it('should initialize without geminiService and with default cacheDir', () => {
      const defaultService = new EnrichmentService();
      expect(defaultService).toBeInstanceOf(EnrichmentService);
    });

    it('should initialize with custom cacheDir', () => {
      const customService = new EnrichmentService(undefined, '/custom/cache/dir');
      expect(customService).toBeInstanceOf(EnrichmentService);
    });

    it('should call cacheManager.init() on init()', async () => {
      await service.init();
      expect(mockCacheInit).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPlaceholder', () => {
    it('should return defined placeholder for exact category match', () => {
      const placeholder = service.getPlaceholder('音楽・ギター・DTM');
      expect(placeholder).toContain('photo-1511671782779-c97d3d27a1d4');
    });

    it('should return defined placeholder for normalized category match with whitespace and symbols', () => {
      const placeholder = service.getPlaceholder('音楽 ＆ ギター ・ DTM');
      expect(placeholder).toContain('photo-1511671782779-c97d3d27a1d4');
    });

    it('should return default fallback placeholder for unknown category', () => {
      const placeholder = service.getPlaceholder('完全未知のカテゴリ');
      expect(placeholder).toBe('https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400');
    });
  });

  describe('extractBasicImage', () => {
    it('should extract image from mediaContent object with url', () => {
      const item = { mediaContent: { $: { url: 'https://example.com/media.jpg' } } };
      expect(service.extractBasicImage(item)).toBe('https://example.com/media.jpg');
    });

    it('should extract image from mediaContent object with href', () => {
      const item = { mediaContent: { $: { href: 'https://example.com/media.jpg' } } };
      expect(service.extractBasicImage(item)).toBe('https://example.com/media.jpg');
    });

    it('should extract image from mediaContent array', () => {
      const item = {
        mediaContent: [
          {},
          { $: { url: 'https://example.com/first.jpg' } },
        ],
      };
      expect(service.extractBasicImage(item)).toBe('https://example.com/first.jpg');
    });

    it('should extract image from mediaThumbnail object/array', () => {
      const item = { mediaThumbnail: { $: { url: 'https://example.com/thumb.jpg' } } };
      expect(service.extractBasicImage(item)).toBe('https://example.com/thumb.jpg');

      const itemArr = { mediaThumbnail: [{ $: { href: 'https://example.com/thumb2.jpg' } }] };
      expect(service.extractBasicImage(itemArr)).toBe('https://example.com/thumb2.jpg');
    });

    it('should extract image from enclosure object', () => {
      const item = { enclosure: { url: 'https://example.com/enclosure.jpg' } };
      expect(service.extractBasicImage(item)).toBe('https://example.com/enclosure.jpg');

      const itemHref = { enclosure: { href: 'https://example.com/enclosure2.jpg' } };
      expect(service.extractBasicImage(itemHref)).toBe('https://example.com/enclosure2.jpg');
    });

    it('should extract image from itunesImage string and object', () => {
      const itemStr = { itunesImage: 'https://example.com/podcast.jpg' };
      expect(service.extractBasicImage(itemStr)).toBe('https://example.com/podcast.jpg');

      const itemObj = { itunesImage: { $: { href: 'https://example.com/podcast2.jpg' } } };
      expect(service.extractBasicImage(itemObj)).toBe('https://example.com/podcast2.jpg');
    });

    it('should extract image tag from description or content', () => {
      const item = {
        description: '<p>Some text</p><img src="https://example.com/inline.jpg" alt="test" />',
      };
      expect(service.extractBasicImage(item)).toBe('https://example.com/inline.jpg');
    });

    it('should ignore tracker and pixel images in content', () => {
      const item = {
        description: '<img src="https://example.com/tracker.gif" /><img src="https://example.com/pixel.png" />',
      };
      expect(service.extractBasicImage(item)).toBeNull();
    });

    it('should prepend https: to protocol-relative URLs', () => {
      const item = {
        enclosure: { url: '//cdn.example.com/proto.jpg' },
      };
      expect(service.extractBasicImage(item)).toBe('https://cdn.example.com/proto.jpg');
    });

    it('should return null when no image metadata is present', () => {
      const item = { title: 'No image' };
      expect(service.extractBasicImage(item)).toBeNull();
    });
  });

  describe('enrich', () => {
    it('should keep existing article image without scraping or checking cache', async () => {
      const article: ArticleType = {
        ...baseArticle,
        title: '日本語のタイトル',
        img: 'https://example.com/existing.jpg',
      };

      const result = await service.enrich(article);
      expect(result.img).toBe('https://example.com/existing.jpg');
      expect(mockCacheGet).not.toHaveBeenCalled();
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should use image from cache if available', async () => {
      mockCacheGet.mockReturnValueOnce('https://example.com/cached.jpg');
      const article: ArticleType = { ...baseArticle, title: '日本語のタイトル' };

      const result = await service.enrich(article);
      expect(result.img).toBe('https://example.com/cached.jpg');
      expect(mockCacheGet).toHaveBeenCalledWith(article.link);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should scrape OGP image when not in cache and save to cache', async () => {
      mockCacheGet.mockReturnValueOnce(null);
      const html = '<html><head><meta property="og:image" content="https://example.com/ogp.jpg"></head></html>';
      vi.mocked(axios.get).mockResolvedValueOnce({ data: html });

      const article: ArticleType = { ...baseArticle, title: '日本語のタイトル' };
      const result = await service.enrich(article);

      expect(result.img).toBe('https://example.com/ogp.jpg');
      expect(mockCacheSet).toHaveBeenCalledWith(article.link, 'https://example.com/ogp.jpg');
    });

    it('should resolve relative URLs from OGP correctly', async () => {
      mockCacheGet.mockReturnValueOnce(null);
      const html = '<html><head><meta name="twitter:image" content="/assets/ogp.png"></head></html>';
      vi.mocked(axios.get).mockResolvedValueOnce({ data: html });

      const article: ArticleType = { ...baseArticle, link: 'https://example.com/news/1', title: '日本語のタイトル' };
      const result = await service.enrich(article);

      expect(result.img).toBe('https://example.com/assets/ogp.png');
    });

    it('should fallback to content image heuristics if OGP is not present', async () => {
      mockCacheGet.mockReturnValueOnce(null);
      const html = `
        <html>
          <body>
            <article>
              <img src="https://example.com/small.png" width="50" height="50">
              <img src="https://example.com/content-hero.jpg" width="400" height="300">
            </article>
          </body>
        </html>
      `;
      vi.mocked(axios.get).mockResolvedValueOnce({ data: html });

      const article: ArticleType = { ...baseArticle, title: '日本語のタイトル' };
      const result = await service.enrich(article);

      expect(result.img).toBe('https://example.com/content-hero.jpg');
    });

    it('should fallback to category placeholder if scraping finds no image', async () => {
      mockCacheGet.mockReturnValueOnce(null);
      vi.mocked(axios.get).mockResolvedValueOnce({ data: '<html><body><p>No images</p></body></html>' });

      const article: ArticleType = { ...baseArticle, title: '日本語のタイトル', category: 'NEWS' };
      const result = await service.enrich(article);

      expect(result.img).toBe('https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400');
    });

    it('should fallback to category placeholder if scraping throws network error', async () => {
      mockCacheGet.mockReturnValueOnce(null);
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error 500'));

      const article: ArticleType = { ...baseArticle, title: '日本語のタイトル', category: 'AI・ソフトウェア' };
      const result = await service.enrich(article);

      expect(result.img).toBe('https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400');
    });

    it('should translate non-Japanese title when geminiService is available', async () => {
      mockCacheGet.mockReturnValueOnce('https://example.com/cached.jpg');
      mockTranslateArticles.mockResolvedValueOnce([
        { title: '最新のAIブレークスルー', desc: '詳細な説明' },
      ]);

      const article: ArticleType = {
        ...baseArticle,
        title: 'Latest AI Breakthrough 2026',
        desc: 'Detailed description',
      };

      const result = await service.enrich(article);

      expect(mockTranslateArticles).toHaveBeenCalledWith([{
        title: 'Latest AI Breakthrough 2026',
        desc: 'Detailed description',
      }]);
      expect(result.title).toBe('[JP] 最新のAIブレークスルー');
      expect(result.desc).toBe('詳細な説明');
    });

    it('should not translate when title already contains Japanese characters', async () => {
      mockCacheGet.mockReturnValueOnce('https://example.com/cached.jpg');

      const article: ArticleType = {
        ...baseArticle,
        title: '最新のテクノロジーニュースまとめ',
      };

      const result = await service.enrich(article);

      expect(mockTranslateArticles).not.toHaveBeenCalled();
      expect(result.title).toBe('最新のテクノロジーニュースまとめ');
    });

    it('should handle translation failure gracefully without modifying title', async () => {
      mockCacheGet.mockReturnValueOnce('https://example.com/cached.jpg');
      mockTranslateArticles.mockRejectedValueOnce(new Error('AI API quota exceeded'));

      const article: ArticleType = {
        ...baseArticle,
        title: 'English Title',
      };

      const result = await service.enrich(article);

      expect(result.title).toBe('English Title');
    });

    it('should not translate if geminiService is null', async () => {
      const serviceWithoutGemini = new EnrichmentService(undefined);
      mockCacheGet.mockReturnValueOnce('https://example.com/cached.jpg');

      const article: ArticleType = {
        ...baseArticle,
        title: 'English Title',
      };

      const result = await serviceWithoutGemini.enrich(article);

      expect(result.title).toBe('English Title');
    });
  });

  describe('enrichAll', () => {
    it('should enrich multiple articles in parallel', async () => {
      mockCacheGet.mockReturnValue('https://example.com/img.jpg');
      const articles: ArticleType[] = [
        { ...baseArticle, link: 'https://example.com/1', title: '記事1' },
        { ...baseArticle, link: 'https://example.com/2', title: '記事2' },
      ];

      const results = await service.enrichAll(articles);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('記事1');
      expect(results[0].img).toBe('https://example.com/img.jpg');
      expect(results[1].title).toBe('記事2');
      expect(results[1].img).toBe('https://example.com/img.jpg');
    });

    it('should return empty array when articles array is empty', async () => {
      const results = await service.enrichAll([]);
      expect(results).toEqual([]);
    });
  });
});
