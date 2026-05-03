import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedManager } from '../services/FeedManager.js';
import fs from 'fs';
import fsPromises from 'fs/promises';

vi.mock('fs');
vi.mock('fs/promises');

describe('FeedManager', () => {
    const mockConfigPath = '/mock/feed_config.json';
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should load config from file', () => {
        const mockConfig = {
            'Tech': {
                active: ['http://example.com/feed'],
                pool: ['http://example.com/pool'],
                failures: {}
            }
        };
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

        const manager = new FeedManager(mockConfigPath);

        expect(fs.readFileSync).toHaveBeenCalledWith(mockConfigPath, 'utf8');
        expect(manager.config).toEqual(mockConfig);
    });

    it('should return empty config on read error', () => {
        vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('File not found'); });

        const manager = new FeedManager(mockConfigPath);

        expect(manager.config).toEqual({});
    });

    it('should get active feeds for a category', () => {
        const mockConfig = {
            'Tech': { active: ['url1', 'url2'], pool: [], failures: {} }
        };
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

        const manager = new FeedManager(mockConfigPath);
        const feeds = manager.getActiveFeeds('Tech');

        expect(feeds).toEqual(['url1', 'url2']);
    });

    it('should get all active feeds', () => {
        const mockConfig = {
            'Tech': { active: ['url1'], pool: [], failures: {} },
            'News': { active: ['url2'], pool: [], failures: {} }
        };
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

        const manager = new FeedManager(mockConfigPath);
        const allFeeds = manager.getAllActiveFeeds();

        expect(allFeeds).toEqual([
            { category: 'Tech', url: 'url1' },
            { category: 'News', url: 'url2' }
        ]);
    });

    it('should report failure and switch feed if failed 3 times', async () => {
        const mockConfig = {
            'Tech': {
                active: ['url1'],
                pool: ['url_pool_1'],
                failures: { 'url1': 2 }
            }
        };
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
        vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined);

        const manager = new FeedManager(mockConfigPath);
        
        // Mock fetcher
        const mockFetcher = { validateFeed: vi.fn().mockResolvedValue({ ok: true }) };

        const newUrl = await manager.reportFailure('Tech', 'url1', mockFetcher);

        expect(newUrl).toBe('url_pool_1');
        expect(manager.config['Tech'].active).toContain('url_pool_1');
        expect(manager.config['Tech'].active).not.toContain('url1');
        expect(manager.config['Tech'].failures['url1']).toBeUndefined();
        expect(fsPromises.writeFile).toHaveBeenCalled();
    });
});
