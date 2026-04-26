import { BaseAgent } from "./BaseAgent.js";
import { GeminiService } from "../services/GeminiService.js";
import { ResponseSchema, SchemaType } from "@google/generative-ai";

export interface EvaluationResult {
  score: number;
  passed: boolean;
  feedback: string;
  security_review: string;
  improvement_suggestions: string[];
}

/**
 * EvaluatorAgent: 品質チェックとフィードバックを担当。
 */
export class EvaluatorAgent extends BaseAgent {
  constructor(geminiService: GeminiService) {
    super("Evaluator", geminiService);
  }

  /**
   * 実装結果を評価します。
   * @param {any} plan - 元の設計プラン
   * @param {any} implementations - 生成されたコード
   */
  async evaluate(plan: any, implementations: any): Promise<EvaluationResult> {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        score: { type: SchemaType.NUMBER, description: "0-100の品質スコア" },
        passed: { type: SchemaType.BOOLEAN, description: "要件を満たしているか" },
        feedback: { type: SchemaType.STRING, description: "具体的な評価フィードバック" },
        security_review: { type: SchemaType.STRING, description: "セキュリティの観点からの指摘" },
        improvement_suggestions: { 
          type: SchemaType.ARRAY, 
          items: { type: SchemaType.STRING },
          description: "さらなる改善のための提案"
        }
      },
      required: ["score", "passed", "feedback", "security_review", "improvement_suggestions"]
    };

    const prompt = `
あなたは Aegis-Nexus のクオリティ・アシュアランス（QA）エンジニアです。
設計プランに対して、実装されたコードが適切であるか、また品質基準を満たしているかを厳格に評価してください。

### 元の設計プラン:
${JSON.stringify(plan, null, 2)}

### 実装されたコード:
${JSON.stringify(implementations, null, 2)}

### 評価基準:
1. 設計プランの全ステップが完了しているか。
2. セキュリティ上の脆弱性がないか（XSS, Injection 等）。
3. コードの可読性とメンテナンス性は高いか。
`;

    return await this.think<EvaluationResult>(prompt, schema);
  }
}
