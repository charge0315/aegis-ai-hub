import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UsageManager } from '../../src/services/UsageManager';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('UsageManager', () => {
  let tempDir: string;
  let usageManager: UsageManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'usage-manager-test-'));
    usageManager = new UsageManager(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should record usage correctly and aggregate by day and model', async () => {
    const model1 = 'gemini-3.1-flash';
    const model2 = 'gemini-3.1-pro';
    const today = new Date().toISOString().split('T')[0];

    // First recording
    await usageManager.recordUsage(model1, 100, 200);
    
    let stats = await usageManager.getStats();
    expect(stats[today][model1]).toEqual({
      promptTokens: 100,
      candidatesTokens: 200,
      totalTokens: 300,
      callCount: 1,
    });

    // Second recording same model same day
    await usageManager.recordUsage(model1, 50, 50);
    stats = await usageManager.getStats();
    expect(stats[today][model1]).toEqual({
      promptTokens: 150,
      candidatesTokens: 250,
      totalTokens: 400,
      callCount: 2,
    });

    // Recording different model same day
    await usageManager.recordUsage(model2, 10, 20);
    stats = await usageManager.getStats();
    expect(stats[today][model2]).toEqual({
      promptTokens: 10,
      candidatesTokens: 20,
      totalTokens: 30,
      callCount: 1,
    });
  });

  it('should handle different days correctly', async () => {
    const model = 'gemini-3.1-flash';
    
    // Set system time to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    vi.useFakeTimers();
    vi.setSystemTime(yesterday);
    
    await usageManager.recordUsage(model, 100, 100);

    // Restore real time
    vi.useRealTimers();

    await usageManager.recordUsage(model, 50, 50);

    const stats = await usageManager.getStats();
    expect(stats[yesterdayStr][model].totalTokens).toBe(200);
    expect(stats[todayStr][model].totalTokens).toBe(100);
  });

  it('should maintain backups', async () => {
    const filePath = path.join(tempDir, 'usage_stats.json');
    const model = 'test-model';

    // 1st write
    await usageManager.recordUsage(model, 1, 1);
    expect(await fs.access(filePath).then(() => true)).toBe(true);
    
    // 2nd write should create .bak
    await usageManager.recordUsage(model, 1, 1);
    expect(await fs.access(`${filePath}.bak`).then(() => true)).toBe(true);

    // 3rd write should shift .bak to .bak2
    await usageManager.recordUsage(model, 1, 1);
    expect(await fs.access(`${filePath}.bak2`).then(() => true)).toBe(true);

    // 4th write should shift .bak2 to .bak3
    await usageManager.recordUsage(model, 1, 1);
    expect(await fs.access(`${filePath}.bak3`).then(() => true)).toBe(true);

    // 5th write should not create .bak4 but rotate
    await usageManager.recordUsage(model, 1, 1);
    expect(await fs.access(`${filePath}.bak3`).then(() => true)).toBe(true);
    try {
      await fs.access(`${filePath}.bak4`);
      expect(true).toBe(false); // Should not reach here
    } catch {
      expect(true).toBe(true);
    }
  });

  it('should return empty object if file does not exist', async () => {
    const stats = await usageManager.getStats();
    expect(stats).toEqual({});
  });

  it('should handle concurrent usage recording without race conditions', async () => {
    const model = 'gemini-3.1-flash';
    const today = new Date().toISOString().split('T')[0];
    const iterations = 20;
    const promptPerCall = 10;
    const candidatesPerCall = 5;

    // 同時に複数のrecordUsageを呼び出す
    await Promise.all(
      Array.from({ length: iterations }).map(() => 
        usageManager.recordUsage(model, promptPerCall, candidatesPerCall)
      )
    );

    const stats = await usageManager.getStats();
    const item = stats[today][model];

    expect(item.callCount).toBe(iterations);
    expect(item.promptTokens).toBe(iterations * promptPerCall);
    expect(item.candidatesTokens).toBe(iterations * candidatesPerCall);
    expect(item.totalTokens).toBe(iterations * (promptPerCall + candidatesPerCall));
  });
});
