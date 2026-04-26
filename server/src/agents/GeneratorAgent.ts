import { BaseAgent } from "./BaseAgent.js";
import { GeminiService } from "../services/GeminiService.js";
import { ResponseSchema, SchemaType } from "@google/generative-ai";

export interface Implementation {
  file: string;
  content: string;
  explanation: string;
}

export interface GeneratorResult {
  implementations: Implementation[];
}

/**
 * GeneratorAgent: コード生成およびファイル操作を担当。
 */
export class GeneratorAgent extends BaseAgent {
  constructor(geminiService: GeminiService) {
    super("Generator", geminiService);
  }

  /**
   * プランに基づいて実装を行います。
   * @param {any} plan - Architectによる設計プラン
   */
  async implement(plan: any): Promise<GeneratorResult> {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        implementations: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              file: { type: SchemaType.STRING },
              content: { type: SchemaType.STRING },
              explanation: { type: SchemaType.STRING }
            },
            required: ["file", "content", "explanation"]
          }
        }
      },
      required: ["implementations"]
    };

    const prompt = `
あなたは Aegis-Nexus のシニアエンジニア（Generator）です。
以下の設計プランに基づき、最高品質のコードを生成してください。

### 設計プラン:
${JSON.stringify(plan, null, 2)}

### 制約事項:
- TypeScript を使用し、厳密な型定義を行ってください。
- リンター警告が出ないよう、クリーンなコードを心がけてください。
- 必要に応じて既存の関数を再利用してください。
`;

    return await this.think<GeneratorResult>(prompt, schema);
  }
}
