import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
/**
 * GeminiService: Gemini 3.1 APIを中枢に、Structured Output（スキーマ強制）
 * および Tool Calling を活用したAIリクエスト基盤。
 */
export class GeminiService {
    genAI;
    primaryModelName = "gemini-2.0-flash";
    /**
     * @param {string} apiKey - Google Gemini APIキー
     */
    constructor(apiKey) {
        this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    }
    /**
     * 構造化データを生成します。
     * @param {string} prompt - プロンプト
     * @param {ResponseSchema} schema - JSONスキーマ定義
     * @param {string} [modelName] - 使用するモデル名
     */
    async generateStructured(prompt, schema, modelName = "gemini-1.5-pro") {
        if (!this.genAI)
            throw new Error("Gemini APIキーが設定されていません。");
        const model = this.genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return JSON.parse(text);
        }
        catch (error) {
            console.error(`[GeminiService] Error with model ${modelName}: ${error.message}`);
            throw error;
        }
    }
    /**
     * Tool Calling (Function Calling) を利用した生成
     * @param {string} prompt
     * @param {any[]} tools
     * @param {string} modelName
     */
    async generateWithTools(prompt, tools, modelName = "gemini-1.5-pro") {
        if (!this.genAI)
            throw new Error("Gemini APIキーが設定されていません。");
        const model = this.genAI.getGenerativeModel({
            model: modelName,
            tools: [{ functionDeclarations: tools }],
        });
        const chat = model.startChat();
        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        const parts = response.candidates?.[0]?.content?.parts || [];
        const toolCalls = parts.filter(p => p.functionCall).map(tc => ({
            name: tc.functionCall.name,
            args: tc.functionCall.args
        }));
        return {
            text: response.text(),
            toolCalls: toolCalls
        };
    }
    /**
     * チャットセッションを開始
     */
    createChatSession(modelName = "gemini-1.5-pro", history = [], tools = []) {
        if (!this.genAI)
            throw new Error("Gemini APIキーが設定されていません。");
        const model = this.genAI.getGenerativeModel({
            model: modelName,
            tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
        });
        return model.startChat({
            history: history,
        });
    }
    // --- Backward Compatibility / Convenience Methods ---
    /**
     * ニュースの厳選
     */
    async curate(articlesPool, interests) {
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                selections: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            id: { type: SchemaType.NUMBER },
                            reason: { type: SchemaType.STRING }
                        },
                        required: ["id", "reason"]
                    }
                }
            },
            required: ["selections"]
        };
        const prompt = `
ユーザーの興味に基づいて、最新記事候補の中から最適な10件を選んでください。
興味: ${JSON.stringify(interests.categories)}
候補: ${JSON.stringify(articlesPool.slice(0, 30).map((a, i) => ({ id: i, title: a.title })))}
`;
        const result = await this.generateStructured(prompt, schema);
        return result.selections.map(item => ({
            ...articlesPool[item.id],
            geminiReason: item.reason
        }));
    }
    async getEvolutionProposals(interests) {
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                sites: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { name: { type: SchemaType.STRING }, url: { type: SchemaType.STRING }, category: { type: SchemaType.STRING }, reason: { type: SchemaType.STRING } }, required: ["name", "url", "category", "reason"] } },
                brands: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { value: { type: SchemaType.STRING }, category: { type: SchemaType.STRING }, reason: { type: SchemaType.STRING } }, required: ["value", "category", "reason"] } },
                keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { value: { type: SchemaType.STRING }, category: { type: SchemaType.STRING }, reason: { type: SchemaType.STRING } }, required: ["value", "category", "reason"] } }
            },
            required: ["sites", "brands", "keywords"]
        };
        const prompt = `現在の興味リストに基づき、進化提案（サイト、ブランド、キーワード）を生成してください: ${JSON.stringify(interests)}`;
        return await this.generateStructured(prompt, schema);
    }
    async getRestructureProposal(interests) {
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                categories: { type: SchemaType.OBJECT, additionalProperties: { type: SchemaType.OBJECT, properties: { emoji: { type: SchemaType.STRING }, brands: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, score: { type: SchemaType.NUMBER }, reason: { type: SchemaType.STRING } }, required: ["emoji", "brands", "keywords", "score", "reason"] } }
            },
            required: ["categories"]
        };
        const prompt = `現在の興味設定を分析し、再構築案を提示してください: ${JSON.stringify(interests)}`;
        return await this.generateStructured(prompt, schema);
    }
    async discoverSites(interests) {
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                sites: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { name: { type: SchemaType.STRING }, url: { type: SchemaType.STRING }, category: { type: SchemaType.STRING } }, required: ["name", "url", "category"] } }
            },
            required: ["sites"]
        };
        const prompt = `ユーザーの興味に合致する新しいRSSフィードのURLを提案してください: ${JSON.stringify(interests)}`;
        const result = await this.generateStructured(prompt, schema);
        return result.sites;
    }
    async analyzeTrends(articles, interests) {
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                suggestions: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            value: { type: SchemaType.STRING },
                            category: { type: SchemaType.STRING },
                            reason: { type: SchemaType.STRING }
                        },
                        required: ["value", "category", "reason"]
                    }
                }
            },
            required: ["suggestions"]
        };
        const prompt = `
以下の最新記事リストと現在の興味設定を分析し、ユーザーが興味を持ちそうな新しいキーワードやブランドを提案してください。
興味設定: ${JSON.stringify(interests.categories)}
最新記事: ${JSON.stringify(articles)}
`;
        const result = await this.generateStructured(prompt, schema);
        return result.suggestions;
    }
}
