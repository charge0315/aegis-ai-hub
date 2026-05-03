import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import { SettingsManager } from '../services/SettingsManager.js';
import { Interests, FeedConfig } from '../models/Schemas';

vi.mock('fs/promises');

describe('SettingsManager', () => {
  const mockInterests: Interests = {
    categories: {
      'tech': {
        emoji: '🚀',
        brands: ['OpenAI', 'Google'],
        keywords: ['ai', 'robotics'],
        score: 8,
        reason: 'Interested in AI'
      }
    },
    lastUpdated: 1000
  };

  const mockFeedConfig: FeedConfig = {
    'tech': {
      active: ['https://example.com/rss'],
      pool: [],
      failures: {}
    }
  };

  let settingsManager: SettingsManager;

  beforeEach(() => {
    vi.clearAllMocks();
    settingsManager = new SettingsManager({ dataDir: '/mock/data' });
  });

  it('should read interests and feed config correctly', async () => {
    // getInterests calls readFile
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockInterests));
    const interests = await settingsManager.getInterests();
    expect(interests).toEqual(mockInterests);

    // getFeedConfig calls readFile
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(mockFeedConfig));
    const feedConfig = await settingsManager.getFeedConfig();
    expect(feedConfig).toEqual(mockFeedConfig);
  });

  it('should return default interests if validation fails', async () => {
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify({ invalid: 'data' }));
    const result = await settingsManager.getInterests();
    expect(result.categories).toEqual({});
  });

  it('should sync settings successfully if there is no conflict', async () => {
    // Mock getInterests for conflict check (server has lastUpdated: 1000)
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockInterests));
    vi.mocked(fs.access).mockResolvedValue(undefined); // Mock file exists for backup

    const syncData = {
      interests: { ...mockInterests, lastUpdated: 1500 },
      feedConfig: mockFeedConfig,
      lastUpdated: 1500 // Same or newer than server's 1000
    };

    const result = await settingsManager.syncSettings(syncData);

    expect(result.success).toBe(true);
    expect(result.lastUpdated).toBeGreaterThan(1000);
    expect(fs.writeFile).toHaveBeenCalled();
    expect(fs.copyFile).toHaveBeenCalled(); // Backup should be created
  });

  it('should throw conflict error if client lastUpdated is older than server', async () => {
    // server has lastUpdated: 1000
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockInterests));

    const syncData = {
      interests: mockInterests,
      feedConfig: mockFeedConfig,
      lastUpdated: 500 // Client has 500, which is older than server's 1000
    };

    await expect(settingsManager.syncSettings(syncData)).rejects.toThrow(/CONFLICT/);
  });
});
