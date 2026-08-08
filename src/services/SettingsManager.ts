import fs from 'fs/promises';
import path from 'path';
import { InterestsSchema, FeedConfigSchema, WindowStateSchema, CredentialsSchema, UiSettingsSchema, type Interests, type FeedConfig, type Credentials, type UiSettings, type SyncSettings } from '../models/Schemas';
import { normalizeCategoryName } from '../utils/normalize';
import { UsageManager } from './UsageManager';

export interface SettingsManagerConfig {
  dataDir: string;
  isDev?: boolean;
}

/**
 * SettingsManager: アプリケーションの設定ファイル群（興味関心、フィード構成、認証情報等）を統合管理するサービス。
 * 
 * 役割:
 * - 各設定ファイルの読み書き、初期化、バリデーション。
 * - APIキーやUI設定（テーマ、自動起動等）の管理。
 * - 設定の同期（インポート/エクスポート）と、その際のデータ整合性（名寄せ、有効性確認）の確保。
 * - AI使用量統計（UsageManager）の統括。
 * 
 * 設計思想:
 * - 安全第一: 書き込み時のバックアップ自動生成（世代管理）により、予期せぬ電源断などによるファイル破損リスクを軽減。
 * - 型の保証: Zodスキーマによる厳格なバリデーションを実施し、不正な設定データによるシステムクラッシュを未然に防止。
 * - コンフリクト解消: `lastUpdated` タイムスタンプを用いた単純かつ堅牢な同期ロジックを実装。
 */
export class SettingsManager {
  protected dataDir: string;
  protected isDev: boolean;
  protected interestsPath: string;
  protected feedConfigPath: string;
  protected credentialsPath: string;
  public usageManager: UsageManager;

  constructor(config: SettingsManagerConfig) {
    this.dataDir = config.dataDir;
    this.isDev = config.isDev || false;
    this.interestsPath = path.join(this.dataDir, 'interests.json');
    this.feedConfigPath = path.join(this.dataDir, 'feed_config.json');
    this.credentialsPath = path.join(this.dataDir, 'credentials.json');
    const usagePath = path.join(this.dataDir, 'usage_stats.json');
    this.usageManager = new UsageManager(usagePath);
  }

  /**
   * 必要なディレクトリとファイルの初期化を確認・実行します。
   */
  async init(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    await this._ensureFile(this.interestsPath, { categories: {}, lastUpdated: Date.now() });
    await this._ensureFile(this.feedConfigPath, {});
    await this._ensureFile(this.credentialsPath, {
      activeProvider: 'google',
      activeModel: 'gemini-3.5-flash',
      google: {},
      anthropic: {},
      openai: {},
      ollama: { baseUrl: 'http://localhost:11434' }
    });
    await this.usageManager.init();
  }

  /**
   * 工場出荷時のデフォルト設定に戻します。
   * 現在の設定をクリアし、最小限の構造で初期化します。
   */
  async resetToDefaults(): Promise<boolean> {
    try {
      await this._safeWrite(this.interestsPath, { categories: {}, lastUpdated: Date.now() });
      await this._safeWrite(this.feedConfigPath, {});
      return true;
    } catch (err) {
      console.error('[SettingsManager] Reset failed:', err);
      return false;
    }
  }

  /**
   * AIモデルごとの使用量統計（トークン数）を取得します。
   */
  async getUsageStats() {
    return await this.usageManager.getStats();
  }


  protected async _ensureFile(filePath: string, defaultContent: unknown): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
    }
  }

  /**
   * UI表示設定（ダークモード、自動起動、言語設定等）を取得します。
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

  /**
   * APIキーや認証情報全体を取得します。
   */
  async getCredentials(): Promise<Credentials> {
    try {
      const data = await fs.readFile(this.credentialsPath, 'utf8');
      const json = JSON.parse(data);
      const parsed = CredentialsSchema.parse(json);
      // 後方互換性：もし旧形式でgeminiApiKeyだけがあった場合、google.apiKeyに移行する
      if (parsed.geminiApiKey && (!parsed.google || !parsed.google.apiKey)) {
        if (!parsed.google) parsed.google = {};
        parsed.google.apiKey = parsed.geminiApiKey;
      }
      return parsed;
    } catch {
      // 初期値またはフォールバック
      return CredentialsSchema.parse({
        activeProvider: 'google',
        activeModel: 'gemini-3.5-flash',
        google: {},
        anthropic: {},
        openai: {},
        ollama: { baseUrl: 'http://localhost:11434' }
      });
    }
  }

  /**
   * 認証情報全体を保存します。
   */
  async saveCredentials(creds: Credentials): Promise<void> {
    const validated = CredentialsSchema.parse(creds);
    await this._safeWrite(this.credentialsPath, validated);
  }

  /**
   * 保存されているGemini APIキーを取得します。
   * 開発環境では環境変数からの取得もサポート。
   */
  async getApiKey(): Promise<string> {
    try {
      const creds = await this.getCredentials();
      const key = creds.google?.apiKey || creds.geminiApiKey || '';
      if (!key && this.isDev) {
        return process.env.GEMINI_API_KEY || '';
      }
      return key;
    } catch {
      return this.isDev ? (process.env.GEMINI_API_KEY || '') : '';
    }
  }

  /**
   * Gemini APIキーを安全に保存します。
   */
  async saveApiKey(apiKey: string): Promise<void> {
    const creds = await this.getCredentials();
    creds.geminiApiKey = apiKey;
    if (!creds.google) creds.google = {};
    creds.google.apiKey = apiKey;
    await this.saveCredentials(creds);
  }

  /**
   * ユーザーの興味関心設定を取得します。
   */
  async getInterests(): Promise<Interests> {
    const data = await fs.readFile(this.interestsPath, 'utf8');
    return InterestsSchema.parse(JSON.parse(data));
  }

  /**
   * フィードの購読設定を取得します。
   */
  async getFeedConfig(): Promise<FeedConfig> {
    try {
      const data = await this._safeRead(this.feedConfigPath);
      return FeedConfigSchema.parse(data);
    } catch {
      return {};
    }
  }

  /**
   * フィード購読設定を保存します。
   */
  async saveFeedConfig(config: FeedConfig): Promise<void> {
    const validated = FeedConfigSchema.parse(config);
    await this._safeWrite(this.feedConfigPath, validated);
  }

  /**
   * 設定データの同期（外部からの上書き保存）を行います。
   * 
   * 処理内容:
   * 1. データの型バリデーション。
   * 2. カテゴリ名やフィード構成の正規化（表記揺れや名寄せ）。
   * 3. タイムスタンプによるコンフリクト確認（デバイス上の設定が新しい場合は拒否）。
   * 4. 新規追加されるフィードの有効性チェック（オプション）。
   * 5. 安全な永続化とバックアップ。
   */
  async syncSettings(settings: Partial<SyncSettings>, fetcher?: { validateFeed: (url: string) => Promise<{ ok: boolean; status: number | string }> }): Promise<{ success: boolean, timestamp: string, lastUpdated: number, validatedInterests: Interests, validatedFeedConfig: FeedConfig }> {
    const { interests, feedConfig, windowState, lastUpdated } = settings || {};

    if (!interests) {
      throw new Error('INVALID_ARGUMENT: "interests" is required for sync.');
    }

    // 型バリデーション
    const validatedInterests = InterestsSchema.parse(interests);
    const validatedWindowState = windowState ? WindowStateSchema.parse(windowState) : null;
    
    // カテゴリ名の正規化（Mojibakeや表記揺れの吸収、interestsとの紐付け強化）
    const normalizedFeedConfig: FeedConfig = {};
    const categoriesObj = validatedInterests.categories || {};
    const interestCats = Object.keys(categoriesObj);

    const incomingFeeds = feedConfig || {};
    for (const [feedCatName, data] of Object.entries(incomingFeeds)) {
      if (!data) continue;
      const targetClean = normalizeCategoryName(feedCatName);
      
      // 1. 完全一致
      let finalName = interestCats.find(c => c === feedCatName);
      
      // 2. 正規化一致
      if (!finalName) {
        finalName = interestCats.find(c => normalizeCategoryName(c) === targetClean);
      }

      // 3. どちらにせよ、interests に存在する名称を優先（存在しない場合はそのまま保持）
      const keyToUse = finalName || feedCatName;
      normalizedFeedConfig[keyToUse] = data;
    }
    const validatedFeedConfig = normalizedFeedConfig;

    // コンフリクトの解決: デバイス上のデータがより新しい場合は、データの喪失を防ぐためエラーを投げる
    const currentInterests = await this.getInterests();
    const serverLastUpdated = currentInterests.lastUpdated || 0;

    if (lastUpdated && lastUpdated < serverLastUpdated) {
      throw new Error('CONFLICT: Settings on device are newer.');
    }

    // 新規フィードのヘルスチェック: 同期対象に含まれる未知のURLが正しく機能するか確認
    if (fetcher) {
      const currentFeedConfig = (await this.getFeedConfig()) || {};
      const currentUrls = new Set(
        Object.values(currentFeedConfig)
          .filter(c => c && typeof c === 'object')
          .flatMap(c => [...(c.active || []), ...(c.pool || [])])
      );
      
      const newUrls: { url: string; category: string }[] = [];

      for (const [category, data] of Object.entries(validatedFeedConfig)) {
        if (!data || typeof data !== 'object') continue;
        const urlsToCheck = [...(data.active || []), ...(data.pool || [])];
        for (const url of urlsToCheck) {
          if (!currentUrls.has(url)) {
            newUrls.push({ url, category });
          }
        }
      }

      if (newUrls.length > 0) {
        // 並列で検証を実行し、1つでも失敗すれば同期を中断（安全策）
        await Promise.all(newUrls.map(async (item) => {
          try {
            const check = await fetcher.validateFeed(item.url);
            if (!check.ok) {
              throw new Error(`VALIDATION_FAILED: ${item.url} is invalid (Status: ${check.status})`);
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(`[SettingsManager] Feed validation failed for ${item.url}:`, msg);
            throw e;
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

  /**
   * 前回の終了時のウィンドウ位置やサイズを取得します。
   */
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

  /**
   * ファイルへの安全な書き込み処理。
   * 既存ファイルがある場合、最大3世代のバックアップ(.bak, .bak2, .bak3)を自動作成し、
   * 書き込み失敗時のデータ全ロスを防止します。
   */
  protected async _safeWrite(filePath: string, data: unknown): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    try {
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      if (exists) {
        // バックアップの世代管理
        for (let i = 3; i >= 1; i--) {
          const oldBak = i === 1 ? filePath : `${filePath}.bak${i - 1 === 1 ? '' : i - 1}`;
          const newBak = `${filePath}.bak${i === 1 ? '' : i}`;
          
          const bakExists = await fs.access(oldBak).then(() => true).catch(() => false);
          if (bakExists) {
            if (i === 3) {
              // 最古の第3世代を削除
              await fs.unlink(newBak).catch(() => {});
            }
            if (i === 1) {
              await fs.copyFile(filePath, newBak);
            } else {
              await fs.rename(oldBak, newBak).catch(() => {});
            }
          }
        }
      }
      await fs.writeFile(filePath, content, 'utf8');
    } catch (writeError: unknown) {
      const msg = writeError instanceof Error ? writeError.message : String(writeError);
      console.error(`[SettingsManager] Write failed for ${filePath}: ${msg}`);
      throw writeError;
    }
  }
}
