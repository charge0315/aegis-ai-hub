import fs from 'fs';
import fsPromises from 'fs/promises';
import { FeedConfigSchema, FeedConfig } from '../models/Schemas.js';

/**
 * RSSフィード設定の管理、故障検知、自動切り替えを担当するサービス。
 * サーバー・Electron両環境で共有される統合版。
 */
export class FeedManager {
  private configPath: string;
  public config: FeedConfig;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.config = this.loadConfig();
  }

  private loadConfig(): FeedConfig {
    try {
      const rawContent = fs.readFileSync(this.configPath, 'utf8');
      const raw = JSON.parse(rawContent);
      const result = FeedConfigSchema.safeParse(raw);
      if (!result.success) {
        console.error("FeedManager Validation Errors:", JSON.stringify(result.error.issues, null, 2));
        return raw as FeedConfig;
      }
      return result.data;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`FeedManager: 設定の読み込みに失敗しました: ${msg}`);
      return {} as FeedConfig;
    }
  }

  getActiveFeeds(category: string): string[] {
    return this.config[category]?.active || [];
  }

  getAllActiveFeeds(): { category: string; url: string }[] {
    return Object.entries(this.config).flatMap(([category, data]) =>
      data.active.map(url => ({ category, url }))
    );
  }

  async reportFailure(
    category: string,
    url: string,
    fetcher?: { validateFeed: (url: string) => Promise<{ ok: boolean }> }
  ): Promise<string | null> {
    const catData = this.config[category];
    if (!catData) return null;

    catData.failures[url] = (catData.failures[url] || 0) + 1;

    if (catData.failures[url] >= 3 && catData.pool.length > 0) {
      console.warn(`[FeedManager] Feed ${url} has failed ${catData.failures[url]} times. Attempting replacement...`);

      while (catData.pool.length > 0) {
        const nextUrl = catData.pool.shift();
        if (!nextUrl) break;

        if (fetcher) {
          const check = await fetcher.validateFeed(nextUrl);
          if (!check.ok) {
            console.warn(`[FeedManager] Pool feed ${nextUrl} is also invalid. Skipping...`);
            continue;
          }
        }

        console.log(`FeedManager: フィードを差し替えます [${category}]: ${url} -> ${nextUrl}`);
        catData.active = catData.active.map(u => u === url ? nextUrl : u);
        delete catData.failures[url];
        await this.saveConfig();
        return nextUrl;
      }

      console.error(`[FeedManager] No valid replacement found in pool for [${category}]`);
    }
    return null;
  }

  reportSuccess(category: string, url: string): void {
    const catData = this.config[category];
    if (catData?.failures?.[url]) {
      delete catData.failures[url];
    }
  }

  async addFeed(
    category: string,
    url: string,
    fetcher: { validateFeed: (url: string) => Promise<{ ok: boolean }> },
    name: string = ""
  ): Promise<boolean> {
    if (!this.config[category]) {
      this.config[category] = { active: [], pool: [], failures: {} };
    }

    const catData = this.config[category];
    const allUrls = [...catData.active, ...catData.pool];
    if (allUrls.includes(url)) return false;

    const check = await fetcher.validateFeed(url);
    if (!check.ok) {
      console.warn(`[FeedManager] 追加拒否: フィードが不通または無効です: ${url}`);
      return false;
    }

    catData.pool.push(url);
    console.log(`[FeedManager] New valid feed added to pool [${category}]: ${name || url}`);
    await this.saveConfig();
    return true;
  }

  async cleanConfig(): Promise<void> {
    for (const cat in this.config) {
      const data = this.config[cat];
      data.active = [...new Set(data.active)];
      data.pool = [...new Set(data.pool)];
      data.pool = data.pool.filter(url => !data.active.includes(url));
    }
    await this.saveConfig();
  }

  private savePromise: Promise<void> = Promise.resolve();

  async saveConfig(): Promise<void> {
    this.savePromise = this.savePromise.then(async () => {
      const content = JSON.stringify(this.config, null, 2);
      let retries = 3;
      while (retries > 0) {
        try {
          await fsPromises.writeFile(this.configPath, content, 'utf8');
          return;
        } catch (e: unknown) {
          const error = e as { code?: string; message: string };
          if (error.code === 'EBUSY' && retries > 1) {
            console.warn(`[FeedManager] Resource busy, retrying... (${retries} left)`);
            await new Promise(resolve => setTimeout(resolve, 200));
            retries--;
            continue;
          }
          console.error("FeedManager: 設定の保存に失敗しました。", error.message);
          break;
        }
      }
    });
    return this.savePromise;
  }
}
