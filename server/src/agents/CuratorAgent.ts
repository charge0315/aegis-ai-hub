import { BaseAgent } from "./BaseAgent.js";
import { GeminiService } from "../services/GeminiService.js";
import { ResponseSchema, SchemaType } from "@google/generative-ai";
import { Interests } from "../models/Schemas.js";

export interface CurationResult {
  selected_ids: string[];
  reasoning: Record<string, string>;
}

/**
 * CuratorAgent: コンテンツの厳選とフィルタリングを担当。
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
   * 記事リストをキュレーションする
   */
  async curate(articles: any[], interests: Interests): Promise<CurationResult> {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        selected_ids: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        reasoning: { 
          type: SchemaType.OBJECT,
          additionalProperties: { type: SchemaType.STRING }
        } as any
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
