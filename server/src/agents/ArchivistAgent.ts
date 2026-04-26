import { BaseAgent } from "./BaseAgent.js";
import { GeminiService } from "../services/GeminiService.js";
import { ResponseSchema, SchemaType } from "@google/generative-ai";

export interface ArchiveResult {
  summary: string;
  key_takeaways: string[];
  tags: string[];
  metadata: {
    sentiment: "positive" | "neutral" | "negative";
    importance: number;
  };
}

/**
 * ArchivistAgent: データの保存、構造化、要約を担当。
 */
export class ArchivistAgent extends BaseAgent {
  constructor(geminiService: GeminiService) {
    super("Archivist", geminiService);
  }

  public override getSystemPrompt(): string {
    return `
あなたは Aegis Nexus の 'Archivist' エージェントです。
収集された情報を体系的に整理し、長期保存に適した形式で構造化します。
情報の要約、メタデータの付与、および過去のデータとの関連付けを得意とします。
`;
  }

  /**
   * コンテンツを要約し、構造化データを生成する
   */
  async summarizeAndArchive(content: string): Promise<ArchiveResult> {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        summary: { type: SchemaType.STRING },
        key_takeaways: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        metadata: {
          type: SchemaType.OBJECT,
          properties: {
            sentiment: { type: SchemaType.STRING, enum: ["positive", "neutral", "negative"], format: "enum" },
            importance: { type: SchemaType.NUMBER }
          }
        }
      },
      required: ["summary", "key_takeaways", "tags", "metadata"]
    };

    return await this.think<ArchiveResult>(`以下のコンテンツを要約し、メタデータを付与してアーカイブしてください: ${content}`, schema);
  }
}
