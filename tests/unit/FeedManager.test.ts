import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedManager } from '../../src/services/FeedManager';

// fs/promises をモック化
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

// RSSFetcher のモック
const makeMockFetcher = (returnItems: unknown[] = [{ title: 'Article 1' }]) => ({
  fetch: vi.fn().mockResolvedValue(returnItems),
});

describe('FeedManager', () => {
  let manager: FeedManager;
  const configPath = './test-feed_config.json';

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new FeedManager(configPath);
    // 初期状態として設定を直接注入
    manager.config = {
      'AI & ML': { active: ['https://example.com/rss'], pool: [], failures: {} },
    };
  });

  describe('getActiveFeeds', () => {
    it('should return active feeds for a given category', () => {
      const result = manager.getActiveFeeds('AI & ML');
      expect(result).toEqual(['https://example.com/rss']);
    });

    it('should return empty array for unknown category', () => {
      const result = manager.getActiveFeeds('Unknown');
      expect(result).toEqual([]);
    });
  });

  describe('getAllActiveFeeds', () => {
    it('should return all active feeds as flat list', () => {
      manager.config = {
        'AI': { active: ['https://ai.com/rss'], pool: [], failures: {} },
        'Gaming': { active: ['https://gaming.com/rss', 'https://ign.com/rss'], pool: [], failures: {} },
      };
      const result = manager.getAllActiveFeeds();
      expect(result).toHaveLength(3);
      expect(result).toContainEqual({ category: 'AI', url: 'https://ai.com/rss' });
      expect(result).toContainEqual({ category: 'Gaming', url: 'https://gaming.com/rss' });
    });

    it('should return empty array when no feeds are configured', () => {
      manager.config = {};
      expect(manager.getAllActiveFeeds()).toEqual([]);
    });
  });

  describe('addFeed', () => {
    it('should add a valid feed to an existing category', async () => {
      const fetcher = makeMockFetcher();
      const result = await manager.addFeed('AI & ML', 'https://new.com/rss', fetcher as never);
      expect(result).toBe(true);
      expect(manager.config['AI & ML'].active).toContain('https://new.com/rss');
    });

    it('should create a new category if it does not exist', async () => {
      const fetcher = makeMockFetcher();
      await manager.addFeed('New Category', 'https://new.com/rss', fetcher as never);
      expect(manager.config['New Category']).toBeDefined();
      expect(manager.config['New Category'].active).toContain('https://new.com/rss');
    });

    it('should not add a duplicate URL', async () => {
      const fetcher = makeMockFetcher();
      const result = await manager.addFeed('AI & ML', 'https://example.com/rss', fetcher as never);
      expect(result).toBe(false);
      expect(manager.config['AI & ML'].active).toHaveLength(1);
    });

    it('should return false if fetcher returns empty items', async () => {
      const fetcher = makeMockFetcher([]);
      const result = await manager.addFeed('AI & ML', 'https://empty.com/rss', fetcher as never);
      expect(result).toBe(false);
    });

    it('should return false if fetcher throws an error', async () => {
      const fetcher = { fetch: vi.fn().mockRejectedValue(new Error('Network error')) };
      const result = await manager.addFeed('AI & ML', 'https://broken.com/rss', fetcher as never);
      expect(result).toBe(false);
    });
  });

  describe('removeFeed', () => {
    it('should remove an existing feed from the active list', async () => {
      await manager.removeFeed('AI & ML', 'https://example.com/rss');
      expect(manager.config['AI & ML'].active).not.toContain('https://example.com/rss');
    });

    it('should not throw when removing from an unknown category', async () => {
      await expect(manager.removeFeed('Unknown', 'https://example.com/rss')).resolves.not.toThrow();
    });
  });

  describe('reportSuccess', () => {
    it('should remove the failure record for a URL that succeeds', async () => {
      manager.config['AI & ML'].failures['https://example.com/rss'] = 2;
      await manager.reportSuccess('AI & ML', 'https://example.com/rss');
      expect(manager.config['AI & ML'].failures['https://example.com/rss']).toBeUndefined();
    });

    it('should not throw if there is no existing failure record', async () => {
      await expect(manager.reportSuccess('AI & ML', 'https://example.com/rss')).resolves.not.toThrow();
    });
  });

  describe('reportFailure', () => {
    it('should increment the failure count for a URL', async () => {
      await manager.reportFailure('AI & ML', 'https://example.com/rss');
      expect(manager.config['AI & ML'].failures['https://example.com/rss']).toBe(1);
    });

    it('should move a URL to pool after 5 failures', async () => {
      manager.config['AI & ML'].failures['https://example.com/rss'] = 4;
      await manager.reportFailure('AI & ML', 'https://example.com/rss');
      expect(manager.config['AI & ML'].active).not.toContain('https://example.com/rss');
      expect(manager.config['AI & ML'].pool).toContain('https://example.com/rss');
    });

    it('should not move URL to pool if failures are below threshold', async () => {
      manager.config['AI & ML'].failures['https://example.com/rss'] = 3;
      await manager.reportFailure('AI & ML', 'https://example.com/rss');
      expect(manager.config['AI & ML'].active).toContain('https://example.com/rss');
    });

    it('should not duplicate in pool if already there', async () => {
      manager.config['AI & ML'].pool = ['https://example.com/rss'];
      manager.config['AI & ML'].failures['https://example.com/rss'] = 4;
      await manager.reportFailure('AI & ML', 'https://example.com/rss');
      const poolCount = manager.config['AI & ML'].pool.filter(u => u === 'https://example.com/rss').length;
      expect(poolCount).toBe(1);
    });
  });

  describe('cleanConfig', () => {
    it('should remove duplicate URLs from active and pool lists', async () => {
      manager.config = {
        'AI': {
          active: ['https://ai.com/rss', 'https://ai.com/rss'],
          pool: ['https://pool.com/rss', 'https://pool.com/rss'],
          failures: {}
        }
      };
      await manager.cleanConfig();
      expect(manager.config['AI'].active).toHaveLength(1);
      expect(manager.config['AI'].pool).toHaveLength(1);
    });
  });
});
