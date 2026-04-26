import { BaseAgent } from "./BaseAgent.js";

/**
 * GeneratorAgent: コード生成およびファイル操作を担当。
 */
export class GeneratorAgent extends BaseAgent {
    constructor(geminiService) {
        super("Generator", geminiService);
    }

    /**
     * プランに基づいて実装を行います。
     * @param {object} plan - Architectによる設計プラン
     */
    async implement(plan) {
        const schema = {
            type: "object",
            properties: {
                implementations: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            file: { type: "string" },
                            content: { type: "string" },
                            explanation: { type: "string" }
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
- TypeScript ではなく、最新の ES Modules を使用してください。
- リンター警告が出ないよう、クリーンなコードを心がけてください。
- 必要に応じて既存の関数を再利用してください。
`;

        return await this.ask(prompt, schema);
    }
}
