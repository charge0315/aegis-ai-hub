import fs from 'fs/promises';
import path from 'path';
import { InterestsSchema, FeedConfigSchema, WindowStateSchema, CredentialsSchema, UiSettingsSchema, type Interests, type FeedConfig, type Credentials, type UiSettings } from '../models/Schemas';

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

  /**
   * UI表示設定を取得します。
   */
  async getUiSettings(): Promise<UiSettings> {
    const filePath = path.join(this.dataDir, 'ui_settings.json');
    try {
      const data = await this._safeRead(filePath);
      return UiSettingsSchema.parse(data);
    } catch {
      return UiSettingsSchema.parse({}); // デフォルト値を返す
    }
  }

  /**
   * UI表示設定を保存します。
   */
  async saveUiSettings(settings: UiSettings): Promise<void> {
    const filePath = path.join(this.dataDir, 'ui_settings.json');
    const validated = UiSettingsSchema.parse(settings);
    await this._safeWrite(filePath, validated);
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
    const data = await fs.readFile(this.interestsPath, 'utf8');
    return InterestsSchema.parse(JSON.parse(data));
  }

  async getFeedConfig(): Promise<FeedConfig> {
    const data = await fs.readFile(this.feedConfigPath, 'utf8');
    return FeedConfigSchema.parse(JSON.parse(data));
  }

  /**
   * クラウド（またはインポート）からの設定を同期します。
   */
  async syncSettings(settings: any, fetcher?: { validateFeed: (url: string) => Promise<{ ok: boolean; status: number | string }> }): Promise<any> {
    const { interests, feed_urls, windowState, lastUpdated } = settings || {};

    if (!interests) {
      throw new Error('INVALID_ARGUMENT: "interests" is required for sync.');
    }

    // 型バリデーション
    const validatedInterests = InterestsSchema.parse(interests);
    const validatedWindowState = windowState ? WindowStateSchema.parse(windowState) : null;
    
    let validatedFeedConfig: FeedConfig = {};
    
    // カテゴリ名の正規化（Mojibakeや表記揺れの吸収）
    const normalizedFeedConfig: FeedConfig = {};
    const interestCats = Object.keys(validatedInterests.categories);
    const clean = (s: string) => s.replace(/[＆&＆\s・]/g, '').toLowerCase();

    const incomingFeeds = feed_urls || {};
    for (const [feedCatName, data] of Object.entries(incomingFeeds as FeedConfig)) {
      const targetClean = clean(feedCatName);
      
      // 1. 完全一致
      let finalName = interestCats.find(c => c === feedCatName);
      
      // 2. 正規化一致
      if (!finalName) {
        finalName = interestCats.find(c => clean(c) === targetClean);
      }

      // 3. どちらにせよ、interests に存在する名称を優先（存在しない場合はそのまま保持）
      const keyToUse = finalName || feedCatName;
      normalizedFeedConfig[keyToUse] = data;
    }
    validatedFeedConfig = normalizedFeedConfig;

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
        // 並列で検証を実行
        await Promise.all(newUrls.map(async (item) => {
          const check = await fetcher.validateFeed(item.url);
          if (!check.ok) {
            throw new Error(`VALIDATION_FAILED: ${item.url} is invalid (Status: ${check.status})`);
          }
        }));
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

    return { 
      success: true, 
      timestamp: new Date().toISOString(), 
      lastUpdated: now,
      validatedInterests,
      validatedFeedConfig
    };
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

  protected async _safeRead(filePath: string): Promise<unknown> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch {
      throw new Error(`Read failed: ${filePath}`);
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
