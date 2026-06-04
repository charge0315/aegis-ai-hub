import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsageManager } from '../../src/services/UsageManager';

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

import fs from 'fs/promises';

describe('UsageManager', () => {
  let manager: UsageManager;
  const statsPath = './test-usage_stats.json';

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new UsageManager(statsPath);
  });

  describe('init', () => {
    it('should load stats from file on init', async () => {
      const mockStats = {
        '2026-06-01': {
          'gemini-3.1-flash': { promptTokens: 100, candidatesTokens: 50, totalTokens: 150, callCount: 1 }
        }
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockStats));

      await manager.init();
      const stats = await manager.getStats();

      expect(stats['2026-06-01']).toBeDefined();
      expect(stats['2026-06-01']['gemini-3.1-flash'].totalTokens).toBe(150);
    });

    it('should initialize with empty stats if file does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      await manager.init();
      const stats = await manager.getStats();

      expect(stats).toEqual({});
    });

    it('should initialize with empty stats if file content is invalid JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json');

      await manager.init();
      const stats = await manager.getStats();

      expect(stats).toEqual({});
    });
  });

  describe('recordUsage', () => {
    it('should record usage correctly for a new model entry', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
      await manager.init();

      await manager.recordUsage('gemini-3.1-flash', 100, 50);

      const stats = await manager.getStats();
      const today = new Date().toISOString().split('T')[0];

      expect(stats[today]).toBeDefined();
      expect(stats[today]['gemini-3.1-flash']).toEqual({
        promptTokens: 100,
        candidatesTokens: 50,
        totalTokens: 150,
        callCount: 1,
      });
    });

    it('should accumulate usage across multiple calls', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
      await manager.init();

      await manager.recordUsage('gemini-3.1-pro', 200, 100);
      await manager.recordUsage('gemini-3.1-pro', 300, 150);

      const stats = await manager.getStats();
      const today = new Date().toISOString().split('T')[0];

      expect(stats[today]['gemini-3.1-pro']).toEqual({
        promptTokens: 500,
        candidatesTokens: 250,
        totalTokens: 750,
        callCount: 2,
      });
    });

    it('should persist stats by calling writeFile', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
      await manager.init();

      await manager.recordUsage('gemini-3.1-flash', 10, 5);

      expect(fs.writeFile).toHaveBeenCalled();
      const callArgs = vi.mocked(fs.writeFile).mock.calls.at(-1);
      const savedData = JSON.parse(callArgs?.[1] as string);
      const today = new Date().toISOString().split('T')[0];
      expect(savedData[today]['gemini-3.1-flash'].callCount).toBe(1);
    });

    it('should call onUpdate callback after recording', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
      await manager.init();

      const onUpdate = vi.fn();
      manager.onUpdate = onUpdate;

      await manager.recordUsage('gemini-3.1-flash', 10, 5);

      expect(onUpdate).toHaveBeenCalledOnce();
    });

    it('should track separate entries for different models', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
      await manager.init();

      await manager.recordUsage('gemini-3.1-flash', 100, 50);
      await manager.recordUsage('gemini-3.1-pro', 200, 100);

      const stats = await manager.getStats();
      const today = new Date().toISOString().split('T')[0];

      expect(stats[today]['gemini-3.1-flash'].callCount).toBe(1);
      expect(stats[today]['gemini-3.1-pro'].callCount).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return all stats currently in memory', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
      await manager.init();

      const stats = await manager.getStats();
      expect(stats).toEqual({});
    });
  });
});
