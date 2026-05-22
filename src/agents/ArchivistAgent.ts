import { BaseAgent } from "./BaseAgent";
import { GeminiService } from "../services/GeminiService";
import { SchemaType, type ResponseSchema } from "@google/generative-ai";

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
 * 
 * 役割:
 * - 収集された情報を体系的に整理し、長期保存に適した形式で構造化する。
 * - 記事の要約、主要なポイントの抽出、メタデータ（感情分析、重要度）の付与を行う。
 * 
 * 設計思想:
 * - 知識の永続化: 単なるデータの蓄積ではなく、後から再利用しやすい「知識（ナレッジ）」へと変換する。
 * - コンテキストの保持: 過去のデータとの関連付けや、その時の世相を反映したタグ付けを得意とする。
 */
export class ArchivistAgent extends BaseAgent {
  constructor(geminiService: GeminiService) {
    super("Archivist", geminiService);
  }

  public override getSystemPrompt(): string {
    return `
あなたは Aegis Nexus の 'Archivist' エージェントです。
収集された情報を体系的に整理し、長期保存に適した形式で構造化します。
情報の要約、メタデータの付与、および過去のデータとの関連付けを得意としています。
`;
  }

  /**
   * コンテンツを要約し、構造化データを生成する。
   * 
   * @param {string} content 要約・分析対象となる記事の本文または概要
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
