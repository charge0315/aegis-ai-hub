import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini 3.1 APIを中枢に、Structured Output（スキーマ強制）を利用したAIリクエスト基盤。
 */
export class GeminiService {
    /**
     * @param {string} apiKey - Google Gemini APIキー
     */
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
        this.primaryModel = "gemini-3.1-pro";
        this.fallbackModels = [
            "gemini-3.1-flash",
            "gemini-2.0-flash",
            "gemini-1.5-pro"
        ];
    }

    /**
     * 構造化データを生成します。
     * @param {string} prompt - プロンプト
     * @param {object} schema - JSONスキーマ定義
     * @param {string} [modelName] - 使用するモデル名（オプション）
     */
    async generateStructured(prompt, schema, modelName = this.primaryModel) {
        if (!this.genAI) throw new Error("Gemini APIキーが設定されていません。");

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
        } catch (error) {
            console.error(`[GeminiService] Error with model ${modelName}: ${error.message}`);
            
            // フォールバック試行
            if (modelName === this.primaryModel) {
                for (const fallback of this.fallbackModels) {
                    console.log(`[GeminiService] Attempting fallback with ${fallback}...`);
                    try {
                        return await this.generateStructured(prompt, schema, fallback);
                    } catch (e) {
                        continue;
                    }
                }
            }
            throw error;
        }
    }

    /**
     * チャット形式でのやり取り（履歴保持）
     */
    async chat(history, message, schema = null) {
        if (!this.genAI) throw new Error("Gemini APIキーが設定されていません。");

        const config = {
            model: this.primaryModel,
        };

        if (schema) {
            config.generationConfig = {
                responseMimeType: "application/json",
                responseSchema: schema,
            };
        }

        const model = this.genAI.getGenerativeModel(config);
        const chatSession = model.startChat({
            history: history.map(h => ({
                role: h.role === "assistant" ? "model" : "user",
                parts: [{ text: h.content }],
            })),
        });

        const result = await chatSession.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        return schema ? JSON.parse(text) : text;
    }

    /**
     * ニュースの厳選
     */
    async curate(articlesPool, interests) {
        const schema = {
            type: "object",
            properties: {
                selections: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "number" },
                            reason: { type: "string" }
                        },
                        required: ["id", "reason"]
                    }
                }
            },
            required: ["selections"]
        };

        const prompt = `
あなたはガジェット専門のAIコンシェルジュです。
ユーザーの興味に基づいて、最新記事候補の中から最適な10件を選んでください。

### ユーザーの興味:
${JSON.stringify(interests.categories, null, 2)}

### 最新記事候補:
${JSON.stringify(articlesPool.slice(0, 30).map((a, i) => ({ id: i, title: a.title, brand: a.brand, desc: a.desc })))}
`;

        const result = await this.generateStructured(prompt, schema);
        return result.selections.map(item => ({
            ...articlesPool[item.id],
            geminiReason: item.reason
        }));
    }

    /**
     * 進化提案（サイト、ブランド、キーワード）
     */
    async getEvolutionProposals(interests) {
        const schema = {
            type: "object",
            properties: {
                sites: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            url: { type: "string" },
                            category: { type: "string" },
                            reason: { type: "string" }
                        },
                        required: ["name", "url", "category", "reason"]
                    }
                },
                brands: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            value: { type: "string" },
                            category: { type: "string" },
                            reason: { type: "string" }
                        },
                        required: ["value", "category", "reason"]
                    }
                },
                keywords: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            value: { type: "string" },
                            category: { type: "string" },
                            reason: { type: "string" }
                        },
                        required: ["value", "category", "reason"]
                    }
                }
            },
            required: ["sites", "brands", "keywords"]
        };

        const prompt = `
あなたはガジェットと最新テクノロジーのトレンド分析のエキスパートです。
現在の興味リストを分析し、能力を拡張するための進化提案（新規サイト、注目ブランド、新規キーワード）を生成してください。

### 現在の興味:
${JSON.stringify(interests.categories, null, 2)}
`;

        return await this.generateStructured(prompt, schema);
    }

    /**
     * 構造再構築の提案
     */
    async getRestructureProposal(interests) {
        const schema = {
            type: "object",
            properties: {
                categories: {
                    type: "object",
                    additionalProperties: {
                        type: "object",
                        properties: {
                            emoji: { type: "string" },
                            brands: { type: "array", items: { type: "string" } },
                            keywords: { type: "array", items: { type: "string" } },
                            score: { type: "number" },
                            reason: { type: "string" }
                        },
                        required: ["emoji", "brands", "keywords", "score", "reason"]
                    }
                }
            },
            required: ["categories"]
        };

        const prompt = `
あなたはナレッジグラフと情報整理の専門家です。
現在の興味設定を分析し、より効率的で網羅的な構造への再構築案を提示してください。

### 現在の構造:
${JSON.stringify(interests, null, 2)}
`;

        return await this.generateStructured(prompt, schema);
    }
}
