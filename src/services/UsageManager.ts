import fs from 'fs/promises';
import { UsageStatsSchema, type UsageStats } from '../models/Schemas';

/**
 * Gemini API の利用統計（トークン数、コール数）を永続化・管理するクラス。
 * 
 * 【設計思想】
 * AI機能の利用コスト（トークン消費）を可視化し、ユーザーが予算や制限を意識できるようにすることを目的としています。
 * また、異常なトークン消費（無限ループや予期せぬ大量リクエスト）を検知するための基礎データを提供します。
 * 日次の集計を行うことで、時間経過に伴う利用傾向の分析を可能にしています。
 */
export class UsageManager {
  private statsPath: string;
  private stats: UsageStats = {};
  public onUpdate?: (stats: UsageStats) => void;
  private savePromise: Promise<void> = Promise.resolve();

  constructor(statsPath: string) {
    this.statsPath = statsPath;
  }

  /**
   * 統計ファイルを読み込み、メモリ上に展開します。
   * Zodスキーマ（UsageStatsSchema）を使用してパースすることで、
   * 手動編集などによるデータの破損からアプリケーションを保護します。
   */
  async init(): Promise<void> {
    try {
      const data = await fs.readFile(this.statsPath, 'utf-8');
      this.stats = UsageStatsSchema.parse(JSON.parse(data));
    } catch {
      // ファイルが存在しない、または破損している場合は空の統計から開始
      this.stats = {};
    }
  }

  /**
   * 特定のモデルの利用実績を記録します。
   * 入力（prompt）と出力（candidates）を分けて記録することで、
   * モデルごとの料金体系に合わせた正確なコスト計算を将来的に可能にします。
   */
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

    // データの整合性を保つため、更新のたびに即座に永続化を行う
    await this.save();
  }

  /**
   * 現在保持している全期間の統計データを取得します。
   * ダッシュボード表示などのフロントエンド機能での利用を想定しています。
   */
  async getStats(): Promise<UsageStats> {
    return this.stats;
  }

  /**
   * 統計データをJSONファイルに書き出します。
   * 保存失敗時の副作用（メモリ上のデータとファイル間の不一致）を最小限にするため、
   * エラーはキャッチしてログ出力に留めます。
   */
  private async save(): Promise<void> {
    this.savePromise = this.savePromise.then(async () => {
      try {
        await fs.writeFile(this.statsPath, JSON.stringify(this.stats, null, 2), 'utf-8');
        if (this.onUpdate) {
          this.onUpdate(this.stats);
        }
      } catch (err) {
        console.error('[UsageManager] Save failed:', err);
      }
    });
    return this.savePromise;
  }
}
