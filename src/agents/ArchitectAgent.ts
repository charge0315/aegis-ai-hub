import { BaseAgent } from "./BaseAgent";
import { GeminiService } from "../services/GeminiService";
import { SchemaType, type ResponseSchema } from "@google/generative-ai";

export interface ExecutionPlan {
  goals: string[];
  strategy: string;
  steps: {
    agent: "Curator" | "Discovery" | "Archivist";
    action: string;
    expected_output: string;
  }[];
}

/**
 * ArchitectAgent: システムの環境設計と実行プランの立案を担当。
 * 
 * 役割:
 * - ユーザーの漠然とした要求を、具体的なタスクとエージェントへの指示（プラン）に分解する。
 * - カテゴリの再構成や、収集戦略の全体最適化を司る。
 * 
 * 設計思想:
 * - 統括者: 自ら動くのではなく、他のエージェント（Curator, Discovery, Archivist）をどのように動かすべきかを決定する「指揮官」。
 * - 論理的構造化: ユーザーの興味関心を最適なナレッジグラフやカテゴリ構成へ変換する思考モデルを持つ。
 */
export class ArchitectAgent extends BaseAgent {
  constructor(geminiService: GeminiService) {
    super("Architect", geminiService);
  }

  public override getSystemPrompt(): string {
    return `
あなたは Aegis Nexus の 'Architect' エージェントです。
システムの環境設計、カテゴリーの整理、および他のエージェントへの指示（プランニング）を担当します。
論理的で構造化された思考を好み、ユーザーの興味関心を最適なナレッジグラフに変換します。
`;
  }

  /**
   * ユーザーの要求から実行プランを策定する。
   * 
   * @param {string} requirements ユーザーの要望（例：「AIニュースをもっと多角的かつ深く知りたい」）
   */
  async plan(requirements: string): Promise<ExecutionPlan> {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        goals: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        strategy: { type: SchemaType.STRING },
        steps: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              agent: { type: SchemaType.STRING, enum: ["Curator", "Discovery", "Archivist"], format: "enum" },
              action: { type: SchemaType.STRING },
              expected_output: { type: SchemaType.STRING }
            },
            required: ["agent", "action", "expected_output"]
          }
        }
      },
      required: ["goals", "strategy", "steps"]
    };

    return await this.think<ExecutionPlan>(`以下の要求に基づき、実行プランを策定してください: ${requirements}`, schema);
  }
}
