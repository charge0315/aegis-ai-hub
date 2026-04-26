import { BaseAgent } from "./BaseAgent.js";

/**
 * ArchitectAgent: システム設計・変更計画立案を担当。
 */
export class ArchitectAgent extends BaseAgent {
    constructor(geminiService) {
        super("Architect", geminiService);
    }

    /**
     * 要件に基づいた設計プランを作成します。
     * @param {string} requirements - ユーザーまたはシステムからの要件
     */
    async plan(requirements) {
        const schema = {
            type: "object",
            properties: {
                rational: { type: "string", description: "なぜこの設計にするのかの理由" },
                architecture_changes: { 
                    type: "array", 
                    items: {
                        type: "object",
                        properties: {
                            file: { type: "string", description: "変更対象ファイル名" },
                            action: { type: "string", enum: ["modify", "create", "delete"] },
                            description: { type: "string", description: "どのような変更を行うか" }
                        },
                        required: ["file", "action", "description"]
                    }
                },
                verification_steps: {
                    type: "array",
                    items: { type: "string" },
                    description: "実装後の検証手順"
                }
            },
            required: ["rational", "architecture_changes", "verification_steps"]
        };

        const prompt = `
あなたは Aegis-Nexus のリードアーキテクトです。
以下の要件に基づき、システムの整合性を保ちつつ、最も効率的な実装プランを立案してください。

### 要件:
${requirements}

### システム現状:
- Node.js (Express) バックエンド
- Vanilla JS + Tailwind フロントエンド
- SQLite/JSON によるデータ永続化
`;

        return await this.ask(prompt, schema);
    }
}
