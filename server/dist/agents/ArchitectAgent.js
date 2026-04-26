import { BaseAgent } from "./BaseAgent.js";
import { SchemaType } from "@google/generative-ai";
/**
 * ArchitectAgent: システムの構造設計と実行プランの立案を担当。
 */
export class ArchitectAgent extends BaseAgent {
    constructor(geminiService) {
        super("Architect", geminiService);
    }
    getSystemPrompt() {
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
    async plan(requirements) {
        const schema = {
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
        return await this.think(`以下の要求に基づき、実行プランを策定してください: ${requirements}`, schema);
    }
}
