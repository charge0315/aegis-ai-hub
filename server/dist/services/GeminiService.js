import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
/**
 * GeminiService: Gemini 3.1 APIを中枢に、Structured Output（スキーマ強制）
 * および Tool Calling を活用したAIリクエスト基盤。
 */
export class GeminiService {
    genAI;
    primaryModelName = "gemini-3.1-pro-preview";
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
    async generateStructured(prompt, schema, modelName = "gemini-3.1-pro-preview") {
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
    async generateWithTools(prompt, tools, modelName = "gemini-3.1-pro-preview") {
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
    createChatSession(modelName = "gemini-3.1-pro-preview", history = [], tools = []) {
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
    /**
     * 特定のカテゴリに対して英語のRSSフィードを提案します。
     */
    async discoverEnglishSites(interests, targetCategories) {
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                sites: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            name: { type: SchemaType.STRING },
                            url: { type: SchemaType.STRING },
                            category: { type: SchemaType.STRING },
                            lang: { type: SchemaType.STRING, enum: ["en"], format: "enum" }
                        },
                        required: ["name", "url", "category", "lang"]
                    }
                }
            },
            required: ["sites"]
        };
        const targetInterests = targetCategories.map(cat => ({
            category: cat,
            details: interests.categories[cat]
        }));
        const prompt = `
以下のカテゴリにおいて、日本語のニュースソースが不足しています。
世界的に権威のある、英語のRSSフィード（Techニュース、公式ブログ、業界誌など）を提案してください。
対象カテゴリ: ${JSON.stringify(targetInterests)}
出力は必ず英語圏のサイトURLを含めてください。
`;
        const result = await this.generateStructured(prompt, schema);
        return result.sites;
    }
    /**
     * 複数の記事をまとめて日本語に翻訳します。
     */
    async translateArticles(articles) {
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                translations: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            title: { type: SchemaType.STRING },
                            desc: { type: SchemaType.STRING }
                        },
                        required: ["title", "desc"]
                    }
                }
            },
            required: ["translations"]
        };
        const prompt = `
以下の記事リストを、自然な日本語に翻訳してください。
技術用語や固有名詞は適切に扱い、ニュースとして読みやすい表現にしてください。
リスト: ${JSON.stringify(articles)}
`;
        const result = await this.generateStructured(prompt, schema);
        return result.translations;
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
    /**
     * カテゴリ名からブランドとキーワードを提案します。
     */
    async suggestCategoryDetails(categoryName) {
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                brands: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "関連する主要なブランド5つ" },
                keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "関連する重要なキーワード5つ" },
                emoji: { type: SchemaType.STRING, description: "カテゴリを象徴する絵文字1つ" },
                reason: { type: SchemaType.STRING, description: "この提案の理由（1文）" }
            },
            required: ["brands", "keywords", "emoji", "reason"]
        };
        const prompt = `
以下の新しいインテリジェンス・カテゴリ名に関連する、主要なブランドを5つ、および重要なキーワードを5つ提案してください。
また、そのカテゴリにふさわしい絵文字を1つ選んでください。
カテゴリ名: "${categoryName}"
日本語で回答してください。
`;
        return await this.generateStructured(prompt, schema);
    }
}
