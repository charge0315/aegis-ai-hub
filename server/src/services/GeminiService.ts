import { GoogleGenerativeAI, GenerativeModel, ChatSession, ResponseSchema, SchemaType } from "@google/generative-ai";
import { Interests } from "../models/Schemas.js";

export interface ToolCall {
  name: string;
  args: any;
}

export interface ToolCallingResponse {
  text: string;
  toolCalls: ToolCall[];
}

export interface CuratedArticle {
  id: number;
  title: string;
  url?: string;
  content?: string;
  category?: string;
  geminiReason?: string;
  [key: string]: any;
}

/**
 * GeminiService: Gemini 3.1 APIを中枢に、Structured Output（スキーマ強制）
 * および Tool Calling を活用したAIリクエスト基盤。
 */
export class GeminiService {
  private genAI: GoogleGenerativeAI | null;
  private primaryModelName: string = "gemini-3.1-pro-preview";

  /**
   * @param {string} apiKey - Google Gemini APIキー
   */
  constructor(apiKey: string | undefined) {
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  /**
   * 構造化データを生成します。
   * @param {string} prompt - プロンプト
   * @param {ResponseSchema} schema - JSONスキーマ定義
   * @param {string} [modelName] - 使用するモデル名
   */
  async generateStructured<T>(prompt: string, schema: ResponseSchema, modelName: string = "gemini-3.1-pro-preview"): Promise<T> {
    if (!this.genAI) throw new Error("Gemini APIキーが設定されていません。");

    const model: GenerativeModel = this.genAI.getGenerativeModel({
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
      return JSON.parse(text) as T;
    } catch (error: any) {
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
  async generateWithTools(prompt: string, tools: any[], modelName: string = "gemini-3.1-pro-preview"): Promise<ToolCallingResponse> {
    if (!this.genAI) throw new Error("Gemini APIキーが設定されていません。");

    const model: GenerativeModel = this.genAI.getGenerativeModel({
      model: modelName,
      tools: [{ functionDeclarations: tools }],
    });

    const chat = model.startChat();
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    
    const parts = response.candidates?.[0]?.content?.parts || [];
    const toolCalls = parts.filter(p => p.functionCall).map(tc => ({
      name: tc.functionCall!.name,
      args: tc.functionCall!.args
    }));
    
    return {
      text: response.text(),
      toolCalls: toolCalls
    };
  }

  /**
   * チャットセッションを開始
   */
  createChatSession(modelName: string = "gemini-3.1-pro-preview", history: any[] = [], tools: any[] = []): ChatSession {
    if (!this.genAI) throw new Error("Gemini APIキーが設定されていません。");

    const model: GenerativeModel = this.genAI.getGenerativeModel({
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
  async curate(articlesPool: any[], interests: Interests): Promise<CuratedArticle[]> {
    const schema: ResponseSchema = {
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
    const result = await this.generateStructured<{ selections: { id: number; reason: string }[] }>(prompt, schema);
    return result.selections.map(item => ({
      ...articlesPool[item.id],
      geminiReason: item.reason
    }));
  }

  async getEvolutionProposals(interests: Interests): Promise<any> {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        sites: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { name: { type: SchemaType.STRING }, url: { type: SchemaType.STRING }, category: { type: SchemaType.STRING }, reason: { type: SchemaType.STRING } }, required: ["name", "url", "category", "reason"] } },
        brands: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { value: { type: SchemaType.STRING }, category: { type: SchemaType.STRING }, reason: { type: SchemaType.STRING } }, required: ["value", "category", "reason"] } },
        keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { value: { type: SchemaType.STRING }, category: { type: SchemaType.STRING }, reason: { type: SchemaType.STRING } }, required: ["value", "category", "reason"] } }
      },
      required: ["sites", "brands", "keywords"]
    };
    const prompt = `現在の興味リストに基づき、進化提案（サイト、ブランド、キーワード）を生成してください: ${JSON.stringify(interests)}`;
    return await this.generateStructured<any>(prompt, schema);
  }

  async getRestructureProposal(interests: Interests): Promise<any> {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        categories: { type: SchemaType.OBJECT, additionalProperties: { type: SchemaType.OBJECT, properties: { emoji: { type: SchemaType.STRING }, brands: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, score: { type: SchemaType.NUMBER }, reason: { type: SchemaType.STRING } }, required: ["emoji", "brands", "keywords", "score", "reason"] } } as any
      },
      required: ["categories"]
    };
    const prompt = `現在の興味設定を分析し、再構築案を提示してください: ${JSON.stringify(interests)}`;
    return await this.generateStructured<any>(prompt, schema);
  }

  async discoverSites(interests: Interests): Promise<any[]> {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        sites: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { name: { type: SchemaType.STRING }, url: { type: SchemaType.STRING }, category: { type: SchemaType.STRING } }, required: ["name", "url", "category"] } }
      },
      required: ["sites"]
    };
    const prompt = `ユーザーの興味に合致する新しいRSSフィードのURLを提案してください: ${JSON.stringify(interests)}`;
    const result = await this.generateStructured<{ sites: any[] }>(prompt, schema);
    return result.sites;
  }

  async analyzeTrends(articles: any[], interests: Interests): Promise<any[]> {
    const schema: ResponseSchema = {
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
    const result = await this.generateStructured<{ suggestions: any[] }>(prompt, schema);
    return result.suggestions;
  }
}
