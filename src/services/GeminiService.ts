import { GoogleGenerativeAI, type GenerativeModel, type ChatSession, type ResponseSchema, SchemaType, type Content } from "@google/generative-ai";
import type { Interests, InterestCategory, FeedConfig } from "../models/Schemas";

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
 * Aegis AI Hubの「思考エンジン」として機能する中核サービス。
 * Google Gemini 3.1 APIを利用し、ただテキストを生成するのではなく「Structured Output（スキーマ強制）」
 * を用いることで、AIの出力をプログラムが確実に解釈できる堅牢なデータ構造へと変換します。
 * これにより、AIの推論結果をシームレスにシステムのビジネスロジックへ組み込むことを可能にします。
 */
export class GeminiService {
  private genAI: GoogleGenerativeAI | null;
  private primaryModelName: string = "gemini-3.1-flash";
  private highReasoningModelName: string = "gemini-3.1-pro";

  /**
   * @param {string} apiKey - Google Gemini APIキー
   */
  constructor(apiKey: string | undefined) {
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  /**
   * ユーザーがシステム設定からAPIキーを変更した際、アプリケーションを再起動することなく
   * 即座にAIエンジンを再起動（モデルへの接続を再確立）するためのフックメソッド。
   */
  updateApiKey(apiKey: string): void {
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  /**
   * AIの「自由な発話」を封じ、あらかじめシステムが定義したZod（JSON）スキーマ通りの
   * 厳格なデータ構造でのみ返答を許すためのコア・インターフェース。
   * これにより、"JSONパースエラー" という生成AI特有の不確実性を根本から排除します。
   * 
   * @param {string} prompt - AIに与える指示文（コンテキスト）
   * @param {ResponseSchema} schema - 返してほしいデータの構造定義（バリデーションの要）
   * @param {string} [modelName] - タスクの複雑さに応じてモデルを切り替えるためのオプション
   */
  async generateStructured<T>(prompt: string, schema: ResponseSchema, modelName: string = this.primaryModelName): Promise<T> {
    if (!this.genAI) {
      throw new Error("Gemini APIキーが設定されていません。System Settingsタブで設定してください。");
    }

    try {
      console.log(`[GeminiService] Requesting structured output from model: ${modelName}`);
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
      
      if (!text) {
        throw new Error(`Empty response received from model ${modelName}`);
      }
      
      return JSON.parse(text) as T;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[GeminiService] Error with model ${modelName}: ${errorMessage}`);
      
      // Pro で失敗した場合は Flash へ、Flash で失敗した場合は GA 安定版への階層型フォールバック
      if (modelName === this.highReasoningModelName) {
        console.warn(`[GeminiService] ${modelName} failed. Falling back to primary model: ${this.primaryModelName}`);
        return this.generateStructured<T>(prompt, schema, this.primaryModelName);
      }
      
      if (modelName === this.primaryModelName && !errorMessage.includes("2.5-flash")) {
        console.warn(`[GeminiService] ${modelName} failed. Falling back to GA stable model: gemini-2.5-flash`);
        return this.generateStructured<T>(prompt, schema, "gemini-2.5-flash");
      }

      throw new Error(`Gemini API execution failed after multiple retries. Last error: ${errorMessage}`);
    }
  }

  /**
   * チャットセッションを開始
   */
  createChatSession(modelName: string = this.primaryModelName, history: Content[] = []): ChatSession {
    if (!this.genAI) throw new Error("Gemini APIキーが設定されていません。");

    const model: GenerativeModel = this.genAI.getGenerativeModel({
      model: modelName,
    });

    return model.startChat({
      history: history,
    });
  }

  // --- Convenience Methods ---

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
              url: { type: SchemaType.STRING, description: "RSS/Atomフィードの直接のURL" },
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
1. sitesのURLは、必ず「RSSフィード」または「Atomフィード」の直接のURLを指定してください。
2. 日本語の信頼できるニュースサイトを最優先してください。
3. **【重要】日本語の専門サイトが見つからない、または不足している場合は、世界的に権威のある英語のRSSフィード（Techニュース、公式ブログ、業界誌など）を必ず提案に含めてください。**
4. 出力を空（0件）にしないでください。特定の専門ソースがない場合は、そのトピックをカバーする一般的な大手ニュースサイト（ITmedia, TechCrunch, The Verge等）の関連セクションを提案してください。
5. カテゴリ名は、入力された interests のキー名と正確に一致させてください。

現在の興味リスト: ${JSON.stringify(interests)}
`;
    return await this.generateStructured<Record<string, unknown>>(prompt, schema);
  }

  /**
   * 特定のカテゴリで高品質なソースが見つからない場合のフォールバック提案を取得します。
   */
  async getFallbackEvolutionProposals(interests: Interests): Promise<Record<string, unknown>> {
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
              reason: { type: SchemaType.STRING }
            },
            required: ["name", "url", "category", "reason"]
          }
        }
      },
      required: ["sites"]
    };

    const prompt = `
特定の興味カテゴリに対して専門的なニュースソースが見つかりませんでした。
代わりに、幅広いトピックをカバーする日本の大手信頼できるニュースサイト（ITmedia, ギズモード・ジャパン, TechCrunch Japan, ロイター, BBC等）から、以下の興味に関連するセクションのRSSフィードを提案してください。
必ず有効なRSSフィードのURL（ホームページのURLではない）を3件提案してください。

興味設定: ${JSON.stringify(interests.categories)}
`;
    return await this.generateStructured<Record<string, unknown>>(prompt, schema);
  }

  /**
   * 現在の興味設定とフィード構成を分析し、最適な10カテゴリに再構築した完全なプロファイルを提示します。
   * 既存のフィードの再割り当てと、新しい高品質なソースの発見を含みます。
   */
  async getRestructureProposal(interests: Interests, currentFeeds: FeedConfig): Promise<{ categories: Record<string, InterestCategory>, feedConfig: FeedConfig }> {
    const schema: ResponseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        categories: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING, description: "新しいカテゴリ名" },
              emoji: { type: SchemaType.STRING, description: "カテゴリにふさわしい絵文字" },
              brands: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "既存のブランド全て + AIによる新規提案5つ" },
              keywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "既存のキーワード全て + AIによる新規提案5つ" },
              score: { type: SchemaType.NUMBER, description: "重要度（0-10）" },
              reason: { type: SchemaType.STRING, description: "この分類の理由" }
            },
            required: ["name", "emoji", "brands", "keywords", "score", "reason"]
          },
          minItems: 10,
          maxItems: 10
        },
        feedMapping: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              url: { type: SchemaType.STRING, description: "既存のフィードURL" },
              newCategory: { type: SchemaType.STRING, description: "割り当て先の新しいカテゴリ名" }
            },
            required: ["url", "newCategory"]
          }
        },
        newSuggestedFeeds: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING, description: "サイト名" },
              url: { type: SchemaType.STRING, description: "RSS/AtomフィードのURL" },
              category: { type: SchemaType.STRING, description: "新しいカテゴリ名" }
            },
            required: ["name", "url", "category"]
          }
        }
      },
      required: ["categories", "feedMapping", "newSuggestedFeeds"]
    };

    const allExistingUrls = Object.entries(currentFeeds).flatMap(([cat, data]) => 
      data.active.map((url: string) => ({ url, oldCategory: cat }))
    );

    const allExistingBrands = [...new Set(Object.values(interests.categories).flatMap(c => c.brands))];
    const allExistingKeywords = [...new Set(Object.values(interests.categories).flatMap(c => c.keywords))];

    const prompt = `
あなたはインテリジェンス・アーキテクトです。
ユーザーのニュース収集環境を根本から再構築し、情報を【正確に10個の洗練されたカテゴリ】に整理してください。

**ミッション:**
1. **カテゴリーの再生成**: 既存の興味関心を分析し、モダンで包括的な10個の新しいカテゴリーを生成してください。
2. **既存データの完全保持と自動割り当て**: 以下の【既存データ】にある全てのブランドとキーワードを、重複を除いて、新しい10カテゴリーのいずれかに最適に割り当ててください。**一つも削除してはいけません。**
3. **AIによる拡張（SUGGEST機能）**: 割り当て後、各カテゴリーの専門性を高めるために、新しいブランドとキーワードをそれぞれ5個ずつ新規に提案して追加してください。
4. **既存フィードの移設**: ユーザーが現在購読しているフィードを、新しい10カテゴリーのいずれかに最適に割り当て直してください。
5. **新規ソースの注入**: 各カテゴリーに対して、情報の質を高めるための高品質なRSS/Atomフィードを2〜3個ずつ新しく提案してください。

**重要ルール:**
- 出力カテゴリー数は【必ず正確に10個】。
- **既存のブランドとキーワードは絶対に変更・削除せず、必ず新カテゴリーのいずれかに含めてください。**
- 新規提案のブランド/キーワードは、既存のものとは別に新しく「絞り出して」追加してください。
- **【網羅性の保証】: 各カテゴリーに対して必ず新規ソースを提案してください。適切な日本語ソースがない場合は、世界的権威の英語ソースや、国内大手メディアの関連フィードを必ず割り当ててください。0件の提案は認められません。**

**【既存データ: ブランド】**
${allExistingBrands.join(', ')}

**【既存データ: キーワード】**
${allExistingKeywords.join(', ')}

**現在のカテゴリー構成:**
${JSON.stringify(interests.categories, null, 2)}

**現在の購読フィード:**
${JSON.stringify(allExistingUrls, null, 2)}

日本語で回答してください。
`;
    const result = await this.generateStructured<{ 
      categories: Array<any>, 
      feedMapping: Array<{ url: string, newCategory: string }>,
      newSuggestedFeeds: Array<{ name: string, url: string, category: string }>
    }>(prompt, schema, this.highReasoningModelName);

    const categories: Record<string, InterestCategory> = {};
    const feedConfig: FeedConfig = {};

    // 1. カテゴリの初期化とAI結果の反映
    result.categories.forEach(cat => {
      categories[cat.name] = {
        emoji: cat.emoji || '🌐',
        brands: Array.isArray(cat.brands) ? [...new Set((cat.brands as any[]).map(String))] : [],
        keywords: Array.isArray(cat.keywords) ? [...new Set((cat.keywords as any[]).map(String))] : [],
        score: typeof cat.score === 'number' ? cat.score : 5,
        reason: cat.reason || ''
      };
      feedConfig[cat.name] = { active: [], pool: [], failures: {} };
    });

    // 2. データ完全保持リカバリーロジック (AIの取りこぼし防止)
    const categoryNames = Object.keys(categories);
    const firstCategory = categoryNames[0];

    if (categoryNames.length > 0) {
      const returnedBrands = new Set(Object.values(categories).flatMap(c => c.brands));
      allExistingBrands.forEach(b => {
        if (!returnedBrands.has(b)) {
          // AIが返し忘れたブランドを先頭のカテゴリー（または適切な場所）に強制復元
          categories[firstCategory].brands.push(b);
        }
      });

      const returnedKeywords = new Set(Object.values(categories).flatMap(c => c.keywords));
      allExistingKeywords.forEach(k => {
        if (!returnedKeywords.has(k)) {
          // AIが返し忘れたキーワードを先頭のカテゴリーに強制復元
          categories[firstCategory].keywords.push(k);
        }
      });
    }

    // 3. カテゴリ名整合性チェック・正規化ロジック (AIの名称揺れ対策)
    const normalizeCategoryName = (name: string): string => {
      if (categories[name]) return name;
      
      // 完全一致しない場合、記号や空白を無視して再検索
      const clean = (s: string) => s.replace(/[＆&＆\s・]/g, '').toLowerCase();
      const targetClean = clean(name);
      
      for (const catName of Object.keys(categories)) {
        if (clean(catName) === targetClean) return catName;
      }

      // それでも見つからない場合は、最も名前が似ているもの、あるいは先頭のカテゴリを返す
      console.warn(`[GeminiService] AI returned unknown category "${name}". Mapping to "${Object.keys(categories)[0]}"`);
      return Object.keys(categories)[0];
    };

    // 4. 既存フィードのマッピング反映
    result.feedMapping.forEach(m => {
      const normalizedCat = normalizeCategoryName(m.newCategory);
      if (feedConfig[normalizedCat]) {
        // 有効なURLのみ追加 (Zodバリデーション落ちを防ぐ)
        if (this._isValidUrl(m.url)) {
          feedConfig[normalizedCat].active.push(m.url);
        }
      }
    });

    // 5. 新規提案フィードの追加
    result.newSuggestedFeeds.forEach(s => {
      const normalizedCat = normalizeCategoryName(s.category);
      if (feedConfig[normalizedCat]) {
        if (this._isValidUrl(s.url) && !feedConfig[normalizedCat].active.includes(s.url)) {
          feedConfig[normalizedCat].active.push(s.url);
        }
      }
    });

    // 6. 【網羅性の最終ガード】各カテゴリに少なくとも1つのフィードを保証
    Object.keys(categories).forEach(catName => {
      if (feedConfig[catName].active.length === 0) {
        console.log(`[GeminiService] カテゴリ "${catName}" のフィードが空のため、Google News RSS をフォールバックとして設定します。`);
        const fallbackUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(catName)}&hl=ja&gl=JP&ceid=JP:ja`;
        feedConfig[catName].active.push(fallbackUrl);
      }
    });

    return { categories, feedConfig };
  }

  /**
   * URLが有効な形式（http/https）かつZodの期待する形式に合致するかチェック
   */
  private _isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
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
              url: { type: SchemaType.STRING, description: "有効なRSS/Atomフィードの直接URL" },
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
              lang: { type: SchemaType.STRING, description: "Language code (e.g. 'en')" }
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
        brands: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "関連する主要なブランドを【必ず正確に5つ】",
          minItems: 1,
          maxItems: 10
        },
        keywords: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "関連する重要なキーワードを【必ず正確に5つ】",
          minItems: 1,
          maxItems: 10
        },
        emoji: { type: SchemaType.STRING, description: "カテゴリーを象徴する絵文字1つ" },
        reason: { type: SchemaType.STRING, description: "この提案の理由（1文）" }
      },
      required: ["brands", "keywords", "emoji", "reason"]
    };

    const prompt = `
以下の新しいインテリジェンス・カテゴリ名に関連する、主要なブランドを【必ず5つ】、および重要なキーワードを【必ず5つ】提案してください。
5つ未満や5つを超える提案は一切認められません。必ず正確に5つずつ生成してください。
また、そのカテゴリにふさわしい絵文字を1つ選んでください。

カテゴリ名: "${categoryName}"
日本語で回答してください。
`;
    return await this.generateStructured<{ brands: string[], keywords: string[], emoji: string, reason: string }>(prompt, schema);
  }
}
