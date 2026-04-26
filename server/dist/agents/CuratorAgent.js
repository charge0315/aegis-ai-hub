import { BaseAgent } from "./BaseAgent.js";
import { SchemaType } from "@google/generative-ai";
/**
 * CuratorAgent: コンテンツの厳選とフィルタリングを担当。
 */
export class CuratorAgent extends BaseAgent {
    constructor(geminiService) {
        super("Curator", geminiService);
    }
    getSystemPrompt() {
        return `
あなたは Aegis Nexus の 'Curator' エージェントです。
大量の情報の中から、ユーザーの興味に最も合致し、かつ質の高い情報を厳選します。
ノイズを排除し、情報の真偽や重要度を評価することに長けています。
`;
    }
    /**
     * 記事リストをキュレーションする
     */
    async curate(articles, interests) {
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                selected_ids: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                reasoning: {
                    type: SchemaType.OBJECT,
                    additionalProperties: { type: SchemaType.STRING }
                }
            },
            required: ["selected_ids", "reasoning"]
        };
        const prompt = `
以下の記事リストから、ユーザーの興味（${JSON.stringify(interests)}）に合致するものを厳選してください。
各記事には ID が振られています。

記事リスト:
${articles.map(a => `ID: ${a.id}, Title: ${a.title}, Desc: ${a.description}`).join('\n')}
`;
        return await this.think(prompt, schema);
    }
}
