import { GoogleGenerativeAI, GenerativeModel, ChatSession, ResponseSchema, SchemaType, Content } from "@google/generative-ai";
import { Interests } from "../models/Schemas";

export interface CuratedArticle {
  id: number;
  title: string;
  url?: string;
  content?: string;
  category?: string;
  brand?: string;
  geminiReason?: string;
  [key: string]: unknown;
}

/**
 * GeminiService: Gemini 3.1 APIを中枢に、Structured Output（スキーマ強制）
 * を活用したAIリクエスト基盤。
 */
export class GeminiService {
  private genAI: GoogleGenerativeAI | null;

  /**
   * @param {string} apiKey - Google Gemini APIキー
   */
  constructor(apiKey: string | undefined) {
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  /**
   * APIキーを更新します。
   */
  updateApiKey(apiKey: string) {
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  /**
   * 構造化データを生成します。
   * @param {string} prompt - プロンプト
   * @param {ResponseSchema} schema - JSONスキーマ定義
   * @param {string} [modelName] - 使用するモデル名
   */
  async generateStructured<T>(prompt: string, schema: ResponseSchema, modelName: string = "gemini-3.1-flash-lite-preview"): Promise<T> {
    if (!this.genAI) throw new Error("Gemini APIキーが設定されていません。System Settingsタブで設定してください。");

    try {
      const model: GenerativeModel = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return JSON.parse(text) as T;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[GeminiService] Error with model ${modelName}:`, errorMessage);
      
      // ネットワークエラーや認証エラーなど、特定の原因を付与して再スロー
      const detailedError = new Error(`Gemini API Error (${modelName}): ${errorMessage}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (detailedError as any).originalError = error;
      throw detailedError;
    }
  }

  /**
   * チャットセッションを開始
   */
  createChatSession(modelName: string = "gemini-3.1-flash-lite-preview", history: Content[] = []): ChatSession {
    if (!this.genAI) throw new Error("Gemini APIキーが設定されていません。");

    const model: GenerativeModel = this.genAI.getGenerativeModel({
      model: modelName,
    });

    return model.startChat({
      history: history,
    });
  }

  // --- Backward Compatibility / Convenience Methods ---

  /**
   * ニュースの厳選
   */
  async curate(articlesPool: Record<string, unknown>[], interests: Interests): Promise<CuratedArticle[]> {
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
候補: ${JSON.stringify(articlesPool.slice(0, 30).map((a, i) => ({ id: i, title: String(a.title) })))}
`;
    const result = await this.generateStructured<{ selections: { id: number; reason: string }[] }>(prompt, schema);
    return result.selections.map(item => ({
      ...articlesPool[item.id],
      geminiReason: item.reason
    } as CuratedArticle));
  }

  async getEvolutionProposals(interests: Interests): Promise<Record<string, unknown>> {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        sites: { 
          type: SchemaType.ARRAY, 
          items: { 
            type: SchemaType.OBJECT, 
            properties: { 
              name: { type: SchemaType.STRING, description: "サイト名" }, 
              url: { type: SchemaType.STRING, description: "RSS/Atomフィードの直接のURL (例: https://example.com/feed)" }, 
              category: { type: SchemaType.STRING, description: "対応するカテゴリ名" }, 
              reason: { type: SchemaType.STRING, description: "推奨理由" } 
            }, 
            required: ["name", "url", "category", "reason"] 
          } 
        },
        brands: { 
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
        },
        keywords: { 
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
      required: ["sites", "brands", "keywords"]
    };

    const prompt = `
あなたはニュースソースの専門家です。現在の興味リストに基づき、進化提案（フィード、ブランド、キーワード）を生成してください。

**重要ルール:**
1. sitesのURLは、必ず「RSSフィード」または「Atomフィード」の直接のURLを指定してください。サイトのホームページURLは絶対に含めないでください。
2. 日本語の信頼できるニュースサイトを最優先してください。
3. フィードURLの例: \`https://www.famitsu.com/rss/all.xml\`, \`https://snrec.jp/feed\`, \`https://japan.googleblog.com/atom.xml\`
4. カテゴリ名は、入力された interests のキー名と正確に一致させてください。

現在の興味リスト: ${JSON.stringify(interests)}
`;
    return await this.generateStructured<Record<string, unknown>>(prompt, schema);
  }

  async getRestructureProposal(interests: Interests): Promise<Record<string, unknown>> {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        categories: { 
          type: SchemaType.ARRAY, 
          items: { 
            type: SchemaType.OBJECT, 
            properties: { 
              name: { type: SchemaType.STRING },
              emoji: { type: SchemaType.STRING }, 
              brands: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, 
              keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, 
              score: { type: SchemaType.NUMBER }, 
              reason: { type: SchemaType.STRING } 
            }, 
            required: ["name", "emoji", "brands", "keywords", "score", "reason"] 
          } 
        }
      },
      required: ["categories"]
    };
    const prompt = `現在の興味設定を分析し、再構築案を提示してください。出力は categories 配列として返してください: ${JSON.stringify(interests)}`;
    const result = await this.generateStructured<{ categories: Array<Record<string, unknown>> }>(prompt, schema);
    
    // 互換性のためにオブジェクト形式に変換
    const categories: Record<string, unknown> = {};
    result.categories.forEach(cat => {
      const name = String(cat.name);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { name: _, ...details } = cat;
      categories[name] = details;
    });
    
    return { categories };
  }

  async discoverSites(interests: Interests): Promise<Record<string, unknown>[]> {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        sites: { 
          type: SchemaType.ARRAY, 
          items: { 
            type: SchemaType.OBJECT, 
            properties: { 
              name: { type: SchemaType.STRING }, 
              url: { type: SchemaType.STRING, description: "有効なRSS/Atomフィードの直接URL (例: https://example.com/rss)" }, 
              category: { type: SchemaType.STRING } 
            }, 
            required: ["name", "url", "category"] 
          } 
        }
      },
      required: ["sites"]
    };
    const prompt = `
以下の興味設定に合致する、新しいニュースソースを提案してください。
URLは必ず「RSSフィード」または「Atomフィード」の直接のURLを指定し、ホームページのURLは絶対に含めないでください。
日本語のサイトを優先してください。
興味設定: ${JSON.stringify(interests.categories)}
`;
    const result = await this.generateStructured<{ sites: Record<string, unknown>[] }>(prompt, schema);
    return result.sites;
  }

  /**
   * 特定のカテゴリに対して英語のRSSフィードを提案します。
   */
  async discoverEnglishSites(interests: Interests, targetCategories: string[]): Promise<Record<string, unknown>[]> {
    const schema: ResponseSchema = {
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
              lang: { type: SchemaType.STRING, enum: ["en"] }
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
    const result = await this.generateStructured<{ sites: Record<string, unknown>[] }>(prompt, schema);
    return result.sites;
  }

  /**
   * 複数の記事をまとめて日本語に翻訳します。
   */
  async translateArticles(articles: { title: string, desc: string }[]): Promise<{ title: string, desc: string }[]> {
    const schema: ResponseSchema = {
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

    const result = await this.generateStructured<{ translations: { title: string, desc: string }[] }>(prompt, schema);
    return result.translations;
  }

  async analyzeTrends(articles: Record<string, unknown>[], interests: Interests): Promise<Record<string, unknown>[]> {
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
    const result = await this.generateStructured<{ suggestions: Record<string, unknown>[] }>(prompt, schema);
    return result.suggestions;
  }

  /**
   * カテゴリ名からブランドとキーワードを提案します。
   */
  async suggestCategoryDetails(categoryName: string): Promise<{ brands: string[], keywords: string[], emoji: string, reason: string }> {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        brands: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "関連する主要なブランド5つ" },
        keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "関連する重要なキーワード5つ" },
        emoji: { type: SchemaType.STRING, description: "カテゴリを象徴する絵文字1つ" },
        reason: { type: SchemaType.STRING, description: "この提案의理由（1文）" }
      },
      required: ["brands", "keywords", "emoji", "reason"]
    };

    const prompt = `
以下の新しいインテリジェンス・カテゴリ名に関連する、主要なブランドを5つ、および重要なキーワードを5つ提案してください。
また、そのカテゴリにふさわしい絵文字を1つ選んでください。
カテゴリ名: "${categoryName}"
日本語で回答してください。
`;
    return await this.generateStructured<{ brands: string[], keywords: string[], emoji: string, reason: string }>(prompt, schema);
  }
}
