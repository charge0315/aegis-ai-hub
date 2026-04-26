import { BaseAgent } from "./BaseAgent.js";
import { SchemaType } from "@google/generative-ai";
/**
 * DiscoveryAgent: 新しい情報源やトレンドの発見を担当。
 */
export class DiscoveryAgent extends BaseAgent {
    constructor(geminiService) {
        super("Discovery", geminiService);
    }
    getSystemPrompt() {
        return `
あなたは Aegis Nexus の 'Discovery' エージェントです。
Webを探索し、ユーザーがまだ知らない新しい情報源（RSSフィード、ブログ等）や、急上昇中のトレンドを発見します。
好奇心旺盛で、未知の領域を探索することを得意とします。
`;
    }
    /**
     * 新しい情報源を提案する
     */
    async discoverSources(currentInterests) {
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                new_sources: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            name: { type: SchemaType.STRING },
                            url: { type: SchemaType.STRING },
                            category: { type: SchemaType.STRING },
                            reason: { type: SchemaType.STRING }
                        },
                        required: ["name", "url", "category", "reason"]
                    }
                }
            },
            required: ["new_sources"]
        };
        const prompt = `現在の興味（${JSON.stringify(currentInterests)}）を補完する、新しい信頼できる情報源を5つ提案してください。`;
        return await this.think(prompt, schema);
    }
}
