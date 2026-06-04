import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsManager } from '../../src/services/SettingsManager';
import fs from 'fs/promises';
import { FeedConfig, SyncSettings } from '../../src/models/Schemas';

vi.mock('fs/promises');

describe('SettingsManager', () => {
    const dataDir = './test-data';
    let manager: SettingsManager;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new SettingsManager({ dataDir });
        vi.mocked(fs.access).mockResolvedValue(undefined);
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);
        vi.mocked(fs.copyFile).mockResolvedValue(undefined);
        vi.mocked(fs.unlink).mockResolvedValue(undefined);
        vi.mocked(fs.rename).mockResolvedValue(undefined);
    });

    describe('getApiKey', () => {
        it('should return API key from credentials.json', async () => {
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ geminiApiKey: 'test-api-key' }));
            const key = await manager.getApiKey();
            expect(key).toBe('test-api-key');
        });

        it('should return empty string if file missing and not dev', async () => {
            vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
            const key = await manager.getApiKey();
            expect(key).toBe('');
        });

        it('should fallback to env if in dev mode and file missing', async () => {
            process.env.GEMINI_API_KEY = 'env-key';
            const devManager = new SettingsManager({ dataDir, isDev: true });
            vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
            const key = await devManager.getApiKey();
            expect(key).toBe('env-key');
        });
    });

    describe('syncSettings', () => {
        it('should correctly normalize category names during sync', async () => {
            const currentInterests = {
                categories: {
                    'AI & ML': { emoji: '🤖', brands: [], keywords: [], score: 10 }
                },
                lastUpdated: 100
            };
            
            vi.mocked(fs.readFile).mockImplementation((p) => {
                if (String(p).includes('interests.json')) return Promise.resolve(JSON.stringify(currentInterests));
                if (String(p).includes('feed_config.json')) return Promise.resolve(JSON.stringify({}));
                return Promise.reject(new Error('File not found'));
            });

            const newSettings = {
                interests: {
                    categories: {
                        'AI & ML': { emoji: '🤖', brands: ['NewBrand'], keywords: [], score: 10 }
                    }
                },
                feedConfig: {
                    'AI&ML': { active: ['http://example.com/rss'], pool: [], failures: {} }
                },
                lastUpdated: 200
            };

            const result = await manager.syncSettings(newSettings as unknown as SyncSettings);
            expect(result.success).toBe(true);
            expect(result.validatedFeedConfig['AI & ML']).toBeDefined();
            expect(result.validatedFeedConfig['AI & ML'].active).toContain('http://example.com/rss');
        });

        it('should throw conflict error if incoming settings are older', async () => {
            const currentInterests = {
                categories: {},
                lastUpdated: 1000
            };
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(currentInterests));

            const newSettings = {
                interests: { categories: {} },
                lastUpdated: 500
            };

            await expect(manager.syncSettings(newSettings as unknown as SyncSettings)).rejects.toThrow('CONFLICT');
        });
    });

    describe('saveFeedConfig', () => {
        it('should validate and save feed configuration', async () => {
            const config = {
                'Category A': { active: ['https://example.com/rss'], pool: [], failures: {} }
            };
            await manager.saveFeedConfig(config);
            expect(fs.writeFile).toHaveBeenCalled();
            const lastCallArgs = vi.mocked(fs.writeFile).mock.calls.at(-1);
            const savedData = JSON.parse(lastCallArgs?.[1] as string);
            expect(savedData['Category A']).toBeDefined();
        });

        it('should throw error if configuration is invalid', async () => {
            const invalidConfig = {
                'Category A': { active: 'not-an-array' }
            };
            await expect(manager.saveFeedConfig(invalidConfig as unknown as FeedConfig)).rejects.toThrow();
        });
    });
});
