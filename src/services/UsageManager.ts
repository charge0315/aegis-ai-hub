import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { UsageStatsSchema, type UsageStats } from '../models/Schemas';

/**
 * Gemini APIの利用統計（トークン消費量）を管理するマネージャー。
 * 日次およびモデル別の統計情報を data/usage_stats.json に永続化します。
 */
export class UsageManager extends EventEmitter {
  private statsPath: string;
  private writeLock: Promise<void> = Promise.resolve();

  constructor(dataDir: string) {
    super();
    this.statsPath = path.join(dataDir, 'usage_stats.json');
  }

  /**
   * 統計データを取得します。
   */
  async getStats(): Promise<UsageStats> {
    try {
      const content = await fs.readFile(this.statsPath, 'utf8');
      const data = JSON.parse(content);
      return UsageStatsSchema.parse(data);
    } catch {
      return {}; // ファイルが存在しない、または破損している場合は空の統計を返す
    }
  }

  /**
   * 利用量を記録します。
   * 
   * @param modelName 使用したモデル名
   * @param promptTokens プロンプト（入力）トークン数
   * @param candidatesTokens 候補（出力）トークン数
   */
  async recordUsage(modelName: string, promptTokens: number, candidatesTokens: number): Promise<void> {
    // 競合状態を防ぐためにロックを使用
    this.writeLock = this.writeLock.then(async () => {
      try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const stats = await this.getStats();

        if (!stats[today]) {
          stats[today] = {};
        }

        if (!stats[today][modelName]) {
          stats[today][modelName] = {
            promptTokens: 0,
            candidatesTokens: 0,
            totalTokens: 0,
            callCount: 0,
          };
        }

        const item = stats[today][modelName];
        item.promptTokens += promptTokens;
        item.candidatesTokens += candidatesTokens;
        item.totalTokens += (promptTokens + candidatesTokens);
        item.callCount += 1;

        await this._safeWrite(this.statsPath, stats);

        // 更新イベントを発火
        this.emit('usage-updated', stats);
      } catch (error) {
        console.error('[UsageManager] recordUsage failed:', error);
      }
    });

    return this.writeLock;
  }

  /**
   * 指定した期間の統計をリセットします（オプション）。
   */
  async resetStats(): Promise<void> {
    await this._safeWrite(this.statsPath, {});
  }

  /**
   * SettingsManagerと同様の安全な書き込みとバックアップ機構。
   */
  private async _safeWrite(filePath: string, data: unknown): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    try {
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      if (exists) {
        // バックアップの世代管理 (最大3世代)
        for (let i = 3; i >= 1; i--) {
          const oldBak = i === 1 ? filePath : `${filePath}.bak${i - 1 === 1 ? '' : i - 1}`;
          const newBak = `${filePath}.bak${i === 1 ? '' : i}`;
          
          const bakExists = await fs.access(oldBak).then(() => true).catch(() => false);
          if (bakExists) {
            if (i === 3) await fs.unlink(newBak).catch(() => {});
            if (i === 1) await fs.copyFile(filePath, newBak);
            else await fs.rename(oldBak, newBak).catch(() => {});
          }
        }
      }
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      console.error(`[UsageManager] Write failed for ${filePath}:`, error);
      throw error;
    }
  }
}
