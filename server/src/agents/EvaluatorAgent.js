import { BaseAgent } from "./BaseAgent.js";

/**
 * EvaluatorAgent: 品質チェックとフィードバックを担当。
 */
export class EvaluatorAgent extends BaseAgent {
    constructor(geminiService) {
        super("Evaluator", geminiService);
    }

    /**
     * 実装結果を評価します。
     * @param {object} plan - 元の設計プラン
     * @param {object} implementations - 生成されたコード
     */
    async evaluate(plan, implementations) {
        const schema = {
            type: "object",
            properties: {
                score: { type: "number", description: "0-100の品質スコア" },
                passed: { type: "boolean", description: "要件を満たしているか" },
                feedback: { type: "string", description: "具体的な評価フィードバック" },
                security_review: { type: "string", description: "セキュリティの観点からの指摘" },
                improvement_suggestions: { 
                    type: "array", 
                    items: { type: "string" },
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

        return await this.ask(prompt, schema);
    }
}
