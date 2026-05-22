import fs from 'fs/promises';
import type { FeedConfig } from '../models/Schemas';
import type { RSSFetcher } from './RSSFetcher';

/**
 * FeedManager: 購読フィードのリストと、その健康状態（フェッチ成功・失敗履歴）を管理するクラス。
 * 
 * 役割:
 * - `feed_config.json` の読み書きと、メモリ上でのフィードリストの保持。
 * - 各フィードの生存確認（フェッチの成否）に基づいた自動的なリスト整理。
 * - 重複したフィードURLのクリーニング。
 * 
 * 設計思想:
 * - 自動修復（自己浄化）: 連続してフェッチに失敗するフィードを自動的に「アクティブ」から「プール」へ移動させ、
 *   システムの全体的な収集効率と信頼性を維持する。
 * - 永続化の保証: フィードの追加や削除、失敗回数のカウント更新のたびにファイルへ保存し、不測の終了に備える。
 */
export class FeedManager {
  public config: FeedConfig = {};
  private configPath: string;
  private saveHandler?: (config: FeedConfig) => Promise<void>;

  constructor(configPath: string, saveHandler?: (config: FeedConfig) => Promise<void>) {
    this.configPath = configPath;
    this.saveHandler = saveHandler;
  }

  /**
   * 保存用ハンドラをセットします。
   * SettingsManagerなど、外部の安全な書き込み機構を利用する場合に使用します。
   */
  setSaveHandler(handler: (config: FeedConfig) => Promise<void>) {
    this.saveHandler = handler;
  }

  /**
   * 設定ファイルを非同期に読み込みます。
   * ファイルが存在しない、または破損している場合は空の設定で初期化します。
   */
  async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(data);
    } catch {
      this.config = {};
    }
  }

  /**
   * 現在の設定状態をファイルへ保存します。
   */
  async saveConfig(): Promise<void> {
    try {
      if (this.saveHandler) {
        await this.saveHandler(this.config);
      } else {
        await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('[FeedManager] Failed to save config:', err);
    }
  }

  /**
   * 特定のカテゴリに属するアクティブなフィードURLリストを取得します。
   */
  getActiveFeeds(category: string): string[] {
    return this.config[category]?.active || [];
  }

  /**
   * 全カテゴリのアクティブなフィードURLを、カテゴリ名と共にフラットなリストで取得します。
   */
  getAllActiveFeeds(): { category: string; url: string }[] {
    const all: { category: string; url: string }[] = [];
    for (const [category, data] of Object.entries(this.config)) {
      data.active.forEach(url => all.push({ category, url }));
    }
    return all;
  }

  /**
   * 新しいフィードURLを検証した上で追加します。
   * すでに存在する場合や、RSSとして正しく機能しない場合は追加されません。
   */
  async addFeed(category: string, url: string, fetcher: RSSFetcher): Promise<boolean> {
    if (!this.config[category]) {
      this.config[category] = { active: [], pool: [], failures: {} };
    }

    const group = this.config[category];
    if (group.active.includes(url)) return false;

    // 有効性チェック: 実際にフェッチして1件以上記事が取れるか確認
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

  /**
   * フィードURLをリストから削除します。
   */
  async removeFeed(category: string, url: string): Promise<void> {
    if (this.config[category]) {
      this.config[category].active = this.config[category].active.filter(u => u !== url);
      await this.saveConfig();
    }
  }

  /**
   * フェッチ成功を記録し、そのURLの失敗カウントをリセットします。
   */
  async reportSuccess(category: string, url: string): Promise<void> {
    const group = this.config[category];
    if (group && group.failures[url]) {
      delete group.failures[url];
      await this.saveConfig();
    }
  }

  /**
   * フェッチ失敗を記録し、失敗回数が閾値を超えた場合は自動的にリストから除外します。
   * 
   * 設計意図:
   * - 一時的なネットワークエラーによる除外を防ぎつつ、完全に死んでいるソースを排除する。
   */
  async reportFailure(category: string, url: string): Promise<void> {
    const group = this.config[category];
    if (group) {
      group.failures[url] = (group.failures[url] || 0) + 1;
      // 5回連続で失敗したフィードはアクティブから外し、予備の「プール」へ移動
      if (group.failures[url] >= 5) {
        group.active = group.active.filter(u => u !== url);
        if (!group.pool.includes(url)) group.pool.push(url);
      }
      await this.saveConfig();
    }
  }

  /**
   * 全てのフィードリストから重複を排除し、最新の状態に最適化します。
   */
  async cleanConfig(): Promise<void> {
    for (const cat in this.config) {
      this.config[cat].active = [...new Set(this.config[cat].active)];
      this.config[cat].pool = [...new Set(this.config[cat].pool)];
    }
    await this.saveConfig();
  }
}
