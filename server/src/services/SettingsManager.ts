import fs from 'fs/promises';
import path from 'path';
import { InterestsSchema, FeedConfigSchema, Interests, FeedConfig, WindowStateSchema, CredentialsSchema, Credentials } from '../models/Schemas.js';

export interface SettingsManagerConfig {
  dataDir: string;
}

/**
 * 設定ファイル管理の統合版。
 * サーバーモード: コンストラクタで dataDir を指定。
 * Electronモード: ElectronSettingsManager を使用して Electron 固有のロジックを追加。
 */
export class SettingsManager {
  protected dataDir: string;
  protected interestsPath: string;
  protected feedConfigPath: string;
  protected credentialsPath: string;

  constructor(config: SettingsManagerConfig) {
    this.dataDir = config.dataDir;
    this.interestsPath = path.join(this.dataDir, 'interests.json');
    this.feedConfigPath = path.join(this.dataDir, 'feed_config.json');
    this.credentialsPath = path.join(this.dataDir, 'credentials.json');
  }

  async init(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    await this._ensureFile(this.interestsPath, { categories: {}, lastUpdated: Date.now() });
    await this._ensureFile(this.feedConfigPath, {});
    await this._ensureFile(this.credentialsPath, { geminiApiKey: '' });
  }

  protected async _ensureFile(filePath: string, defaultContent: unknown): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
    }
  }

  async getApiKey(): Promise<string> {
    try {
      const data = await fs.readFile(this.credentialsPath, 'utf8');
      const json = JSON.parse(data);
      const creds = CredentialsSchema.parse(json);
      return creds.geminiApiKey || process.env.GEMINI_API_KEY || '';
    } catch {
      return process.env.GEMINI_API_KEY || '';
    }
  }

  async saveApiKey(apiKey: string): Promise<void> {
    const creds: Credentials = { geminiApiKey: apiKey };
    await this._safeWrite(this.credentialsPath, creds);
  }

  async getInterests(): Promise<Interests> {
    try {
      const data = await fs.readFile(this.interestsPath, 'utf8');
      const json = JSON.parse(data);
      return InterestsSchema.parse(json);
    } catch {
      return { categories: {}, lastUpdated: Date.now() };
    }
  }

  async getFeedConfig(): Promise<FeedConfig> {
    try {
      const data = await fs.readFile(this.feedConfigPath, 'utf8');
      const json = JSON.parse(data);
      return FeedConfigSchema.parse(json);
    } catch {
      return {};
    }
  }

  async syncSettings(
    { interests, feedConfig, windowState, lastUpdated }: { interests: Interests; feedConfig: FeedConfig; windowState?: unknown; lastUpdated?: number },
    fetcher?: { validateFeed: (url: string) => Promise<{ ok: boolean; status: string | number }> }
  ): Promise<{ success: boolean; timestamp: string; lastUpdated: number }> {
    const validatedInterests = InterestsSchema.parse(interests);
    const validatedFeedConfig = FeedConfigSchema.parse(feedConfig);
    const validatedWindowState = windowState ? WindowStateSchema.parse(windowState) : undefined;

    // Conflict Resolution
    const currentInterests = await this.getInterests();
    const serverLastUpdated = currentInterests.lastUpdated || 0;

    if (lastUpdated && lastUpdated < serverLastUpdated) {
      throw new Error('CONFLICT: Settings on device are newer.');
    }

    // New Feed Health Check
    if (fetcher) {
      const currentFeedConfig = await this.getFeedConfig();
      const currentUrls = new Set(Object.values(currentFeedConfig).flatMap(c => [...c.active, ...c.pool]));
      const newUrls: { url: string; category: string }[] = [];

      for (const [category, data] of Object.entries(validatedFeedConfig)) {
        for (const url of [...data.active, ...data.pool]) {
          if (!currentUrls.has(url)) {
            newUrls.push({ url, category });
          }
        }
      }

      if (newUrls.length > 0) {
        for (const item of newUrls) {
          const check = await fetcher.validateFeed(item.url);
          if (!check.ok) {
            throw new Error(`VALIDATION_FAILED: ${item.url} is invalid (Status: ${check.status})`);
          }
        }
      }
    }

    const now = Date.now();
    validatedInterests.lastUpdated = now;

    await this._safeWrite(this.interestsPath, validatedInterests);
    await this._safeWrite(this.feedConfigPath, validatedFeedConfig);

    if (validatedWindowState) {
      const windowStatePath = path.join(this.dataDir, 'window_state.json');
      await this._safeWrite(windowStatePath, validatedWindowState);
    }

    return { success: true, timestamp: new Date().toISOString(), lastUpdated: now };
  }

  async getWindowState(): Promise<unknown | null> {
    const windowStatePath = path.join(this.dataDir, 'window_state.json');
    try {
      const content = await fs.readFile(windowStatePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  protected async _safeWrite(filePath: string, data: unknown): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    try {
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      if (exists) {
        await fs.copyFile(filePath, `${filePath}.bak`);
      }
      await fs.writeFile(filePath, content, 'utf8');
    } catch (writeError: unknown) {
      const msg = writeError instanceof Error ? writeError.message : String(writeError);
      console.error(`[SettingsManager] Write failed for ${filePath}: ${msg}`);
      throw writeError;
    }
  }
}
