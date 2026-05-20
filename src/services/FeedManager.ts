import fs from 'fs/promises';
import type { FeedConfig } from '../models/Schemas';
import type { RSSFetcher } from './RSSFetcher';

/**
 * 購読フィードのリストと、その健康状態（フェッチ失敗回数等）を管理するクラス。
 */
export class FeedManager {
  public config: FeedConfig = {};
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  /**
   * 設定ファイルを非同期に読み込みます。
   */
  async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(data);
    } catch {
      this.config = {};
    }
  }

  async saveConfig(): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (err) {
      console.error('[FeedManager] Failed to save config:', err);
    }
  }

  getActiveFeeds(category: string): string[] {
    return this.config[category]?.active || [];
  }

  getAllActiveFeeds(): { category: string; url: string }[] {
    const all: { category: string; url: string }[] = [];
    for (const [category, data] of Object.entries(this.config)) {
      data.active.forEach(url => all.push({ category, url }));
    }
    return all;
  }

  async addFeed(category: string, url: string, fetcher: RSSFetcher): Promise<boolean> {
    if (!this.config[category]) {
      this.config[category] = { active: [], pool: [], failures: {} };
    }

    const group = this.config[category];
    if (group.active.includes(url)) return false;

    // 有効性チェック
    try {
      const items = await fetcher.fetch(url);
      if (items && items.length > 0) {
        group.active.push(url);
        await this.saveConfig();
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  async removeFeed(category: string, url: string): Promise<void> {
    if (this.config[category]) {
      this.config[category].active = this.config[category].active.filter(u => u !== url);
      await this.saveConfig();
    }
  }

  async reportSuccess(category: string, url: string): Promise<void> {
    const group = this.config[category];
    if (group && group.failures[url]) {
      delete group.failures[url];
      await this.saveConfig();
    }
  }

  async reportFailure(category: string, url: string): Promise<void> {
    const group = this.config[category];
    if (group) {
      group.failures[url] = (group.failures[url] || 0) + 1;
      // 5回以上失敗したらアクティブから外す
      if (group.failures[url] >= 5) {
        group.active = group.active.filter(u => u !== url);
        if (!group.pool.includes(url)) group.pool.push(url);
      }
      await this.saveConfig();
    }
  }

  async cleanConfig(): Promise<void> {
    for (const cat in this.config) {
      this.config[cat].active = [...new Set(this.config[cat].active)];
      this.config[cat].pool = [...new Set(this.config[cat].pool)];
    }
    await this.saveConfig();
  }
}
