import { BaseAgent } from "./BaseAgent.js";
import { SchemaType } from "@google/generative-ai";
/**
 * ArchivistAgent: データの保存、構造化、要約を担当。
 */
export class ArchivistAgent extends BaseAgent {
    constructor(geminiService) {
        super("Archivist", geminiService);
    }
    getSystemPrompt() {
        return `
あなたは Aegis Nexus の 'Archivist' エージェントです。
収集された情報を体系的に整理し、長期保存に適した形式で構造化します。
情報の要約、メタデータの付与、および過去のデータとの関連付けを得意とします。
`;
    }
    /**
     * コンテンツを要約し、構造化データを生成する
     */
    async summarizeAndArchive(content) {
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                summary: { type: SchemaType.STRING },
                key_takeaways: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                metadata: {
                    type: SchemaType.OBJECT,
                    properties: {
                        sentiment: { type: SchemaType.STRING, enum: ["positive", "neutral", "negative"], format: "enum" },
                        importance: { type: SchemaType.NUMBER }
                    }
                }
            },
            required: ["summary", "key_takeaways", "tags", "metadata"]
        };
        return await this.think(`以下のコンテンツを要約し、メタデータを付与してアーカイブしてください: ${content}`, schema);
    }
}
