import fs from 'fs/promises';
import { UsageStatsSchema, type UsageStats } from '../models/Schemas';

/**
 * Gemini API の利用統計（トークン数、コール数）を管理するクラス。
 */
export class UsageManager {
  private statsPath: string;
  private stats: UsageStats = {};

  constructor(statsPath: string) {
    this.statsPath = statsPath;
  }

  async init(): Promise<void> {
    try {
      const data = await fs.readFile(this.statsPath, 'utf-8');
      this.stats = UsageStatsSchema.parse(JSON.parse(data));
    } catch {
      this.stats = {};
    }
  }

  async recordUsage(model: string, promptTokens: number, candidatesTokens: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    if (!this.stats[today]) this.stats[today] = {};
    if (!this.stats[today][model]) {
      this.stats[today][model] = { promptTokens: 0, candidatesTokens: 0, totalTokens: 0, callCount: 0 };
    }

    const s = this.stats[today][model];
    s.promptTokens += promptTokens;
    s.candidatesTokens += candidatesTokens;
    s.totalTokens = s.promptTokens + s.candidatesTokens;
    s.callCount += 1;

    await this.save();
  }

  async getStats(): Promise<UsageStats> {
    return this.stats;
  }

  private async save(): Promise<void> {
    try {
      await fs.writeFile(this.statsPath, JSON.stringify(this.stats, null, 2), 'utf-8');
    } catch (err) {
      console.error('[UsageManager] Save failed:', err);
    }
  }
}
