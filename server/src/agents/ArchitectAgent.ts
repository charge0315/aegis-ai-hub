import { BaseAgent } from "./BaseAgent.js";
import { GeminiService } from "../services/GeminiService.js";
import { ResponseSchema, SchemaType } from "@google/generative-ai";

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
 * ArchitectAgent: システムの構造設計と実行プランの立案を担当。
 */
export class ArchitectAgent extends BaseAgent {
  constructor(geminiService: GeminiService) {
    super("Architect", geminiService);
  }

  public override getSystemPrompt(): string {
    return `
あなたは Aegis Nexus の 'Architect' エージェントです。
システムの構造設計、カテゴリーの整理、および他のエージェントへの指令（プランニング）を担当します。
論理的で構造化された思考を好み、ユーザーの興味関心を最適なナレッジグラフに変換します。
`;
  }

  /**
   * ユーザーの要求から実行プランを策定する
   * @param {string} requirements 
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
