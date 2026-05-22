import { BaseAgent } from "./BaseAgent";
import { GeminiService } from "../services/GeminiService";
import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import type { Interests } from "../models/Schemas";

export interface CurationResult {
  selected_ids: string[];
  reasoning: Record<string, string>;
}

/**
 * CuratorAgent: コンテンツの厳選とフィルタリングを担当。
 * 
 * 役割:
 * - 大量の記事プールから、ユーザーの現在の興味設定に最も合致する「読むべき記事」を抽出する。
 * - 単なるキーワードマッチングではなく、記事の文脈や価値を推論して評価。
 * 
 * 設計思想:
 * - 価値の審美眼: ノイズ（広告、低品質なまとめ記事、無関係なトピック）を排除し、情報の真偽や重要度を評価。
 * - パーソナライズ: ユーザーの興味関心を「コンテキスト」として深く理解し、それに寄り添った選択を行う。
 */
export class CuratorAgent extends BaseAgent {
  constructor(geminiService: GeminiService) {
    super("Curator", geminiService);
  }

  public override getSystemPrompt(): string {
    return `
あなたは Aegis Nexus の 'Curator' エージェントです。
大量の情報の中から、ユーザーの興味に最も合致し、かつ質の高い情報を厳選します。
ノイズを排除し、情報の真偽や重要度を評価することに長けています。
`;
  }

  /**
   * 記事リストをキュレーション（厳選）する。
   * 
   * @param {Record<string, unknown>[]} articles 収集された生の記事データリスト
   * @param {Interests} interests ユーザーの現在の興味・関心設定
   */
  async curate(articles: Record<string, unknown>[], interests: Interests): Promise<CurationResult> {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        selected_ids: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        reasoning: {
          type: SchemaType.OBJECT,
          additionalProperties: { type: SchemaType.STRING }
        } as unknown as ResponseSchema
      },
      required: ["selected_ids", "reasoning"]
    };

    const prompt = `
以下の記事リストから、ユーザーの興味（${JSON.stringify(interests)}）に合致するものを厳選してください。
各記事には ID が振られています。

記事リスト:
${articles.map(a => `ID: ${a.id}, Title: ${a.title}, Desc: ${a.description}`).join('\n')}
`;

    return await this.think<CurationResult>(prompt, schema);
  }
}
