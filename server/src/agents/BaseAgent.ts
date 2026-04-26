import { GeminiService } from "../services/GeminiService.js";
import { ResponseSchema } from "@google/generative-ai";

/**
 * BaseAgent: すべての専門エージェントの基底クラス
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
   * エージェントのアイデンティティを定義するシステムプロンプト
   * @returns {string}
   */
  public getSystemPrompt(): string {
    return `You are ${this.name}, a specialized AI agent in the Aegis Nexus system.`;
  }

  /**
   * 基本的な思考プロセスを実行
   * @param {string} prompt 
   * @param {ResponseSchema} schema 
   */
  public async think<T>(prompt: string, schema: ResponseSchema): Promise<T> {
    const fullPrompt = `${this.getSystemPrompt()}\n\nTask: ${prompt}`;
    return await this.geminiService.generateStructured<T>(fullPrompt, schema);
  }
}
