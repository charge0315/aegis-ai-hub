import { GeminiService } from "../services/GeminiService";
import type { ResponseSchema } from "@google/generative-ai";

/**
 * BaseAgent: Aegis Nexusにおける「専門家エージェント」の基底クラス。
 * 
 * 役割:
 * - 各特化型エージェント（Architect, Curator等）に共通の機能を提供。
 * - GeminiServiceを介した構造化思考（thinkメソッド）のインターフェースを定義。
 * 
 * 設計思想:
 * - 疎結合: エージェントはGeminiServiceにのみ依存し、具体的なAIモデルの詳細は隠蔽。
 * - 拡張性: getSystemPromptをオーバーライドすることで、サブクラスが独自の性格や専門性を持てる。
 */
export class BaseAgent {
  protected name: string;
  protected geminiService: GeminiService;

  /**
   * @param {string} name - エージェント名
   * @param {GeminiService} geminiService - Geminiサービスインスタンス
   */
  constructor(name: string, geminiService: GeminiService) {
    this.name = name;
    this.geminiService = geminiService;
  }

  /**
   * APIキーを更新（ユーザー設定の変更を反映）。
   */
  public updateApiKey(apiKey: string): void {
    this.geminiService.updateApiKey(apiKey);
  }

  /**
   * エージェントのアイデンティティを定義するシステムプロンプト。
   * サブクラスで具体的な役割（設計、収集、分析など）を定義。
   * @returns {string}
   */
  public getSystemPrompt(): string {
    return `You are ${this.name}, a specialized AI agent in the Aegis Nexus system.`;
  }

  /**
   * 基本的な思考プロセスを実行。
   * 指定されたスキーマに従って構造化された結果を返す。
   * 
   * @param {string} prompt タスクの具体的な指示内容
   * @param {ResponseSchema} schema AIからのレスポンスを検証するためのスキーマ定義
   */
  public async think<T>(prompt: string, schema: ResponseSchema): Promise<T> {
    const fullPrompt = `${this.getSystemPrompt()}\n\nTask: ${prompt}`;
    return await this.geminiService.generateStructured<T>(fullPrompt, schema);
  }
}
