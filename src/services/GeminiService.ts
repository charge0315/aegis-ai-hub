import { GoogleGenerativeAI, type GenerativeModel, type ResponseSchema } from "@google/generative-ai";
import { z } from 'zod';
import type { Interests, InterestCategory, FeedConfig } from "../models/Schemas";
import { normalizeCategoryName } from "../utils/normalize";
import { UsageManager } from "./UsageManager";
import * as Prompts from "./prompts/GeminiPrompts";
import * as AiSchemas from "../models/AiSchemas";

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
 * GeminiService: Aegis AI Hubの「思考エンジン」として機能する中核サービス。
 * 
 * 役割:
 * - Google Gemini APIとの通信を管理し、構造化されたデータ(JSON)を生成・パースする。
 * - コンテンツのキュレーション、興味の進化提案、記事の翻訳、トレンド分析など、AIを必要とする全機能のバックエンド。
 * 
 * 設計思想:
 * - 型安全性の確保: ZodとResponseSchemaを併用し、AIの出力がアプリケーションの期待する形式であることを厳密に検証。
 * - レジリエンス: モデルのフォールバック戦略（Pro -> Flash -> 安定版）により、高負荷やクォータ制限時でもサービスを継続。
 * - 自律学習の基盤: ユーザーの興味を分析し、新しいカテゴリやフィードを提案するためのプロンプト戦略を実装。
 * 
 * 依存関係:
 * - UsageManager: API使用量（トークン）の記録と制限。
 * - GeminiPrompts: 各タスク専用のシステムプロンプトとスキーマ定義。
 */
export class GeminiService {
  private genAI: GoogleGenerativeAI | null;
  private primaryModelName: string = "gemini-3.1-flash";
  private highReasoningModelName: string = "gemini-3.1-pro";
  private stableFallbackModelName: string = "gemini-2.5-flash";
  private usageManager: UsageManager | null = null;

  constructor(apiKey: string | undefined) {
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  /**
   * 使用量統計を記録するためのマネージャーを設定。
   */
  setUsageManager(manager: UsageManager): void {
    this.usageManager = manager;
  }

  /**
   * APIキーを動的に更新（設定画面からの変更に対応）。
   */
  updateApiKey(apiKey: string): void {
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  /**
   * 厳格なデータ構造でのみ返答を許すためのコア・インターフェース。
   * 
   * 設計意図:
   * - GeminiのJSONモード(responseMimeType: "application/json")を活用。
   * - フォールバック処理: 特定のモデルでエラー（特にクォータ不足や一時的な不調）が発生した場合、
   *   自動的に下位モデルへリクエストをリトライし、ユーザー体験を損なわないようにする。
   */
  async generateStructured<T>(prompt: string, schema: ResponseSchema, modelName: string = this.primaryModelName, zodSchema?: z.ZodSchema<T>): Promise<T> {
    if (!this.genAI) throw new Error("Gemini APIキーが設定されていません。");

    try {
      console.log(`[GeminiService] Model: ${modelName}`);
      const model: GenerativeModel = this.genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json", responseSchema: schema },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // トークン使用量の記録
      if (this.usageManager && response.usageMetadata) {
        const { promptTokenCount = 0, candidatesTokenCount = 0 } = response.usageMetadata;
        this.usageManager.recordUsage(modelName, promptTokenCount, candidatesTokenCount).catch(console.error);
      }

      if (!text) throw new Error("Empty response");

      const parsed = JSON.parse(text) as T;
      // Zodによる最終的な型検証
      if (zodSchema) {
        const validation = zodSchema.safeParse(parsed);
        if (!validation.success) {
          console.error(`[GeminiService] Zod Validation Failed:`, validation.error.format());
          throw new Error(`AI response schema validation failed: ${validation.error.message}`);
        }
        return validation.data;
      }
      return parsed;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isQuotaError = errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota");

      if (isQuotaError) throw new Error("QUOTA_EXCEEDED", { cause: error });

      // モデルのダウングレードによる再試行（自己修復的なフォールバック戦略）
      if (modelName === this.highReasoningModelName) return this.generateStructured<T>(prompt, schema, this.primaryModelName, zodSchema);
      if (modelName === this.primaryModelName) return this.generateStructured<T>(prompt, schema, this.stableFallbackModelName, zodSchema);
      if (modelName === this.stableFallbackModelName) return this.generateStructured<T>(prompt, schema, "gemini-1.5-flash", zodSchema);

      throw new Error(`Gemini API execution failed: ${errorMessage}`, { cause: error });
    }
  }

  /**
   * 収集された記事プールから、ユーザーの興味に合致するものを厳選。
   * 「なぜこの記事を選んだのか」という推論理由（geminiReason）を含めて返す。
   */
  async curate(articlesPool: Record<string, unknown>[], interests: Interests): Promise<CuratedArticle[]> {
    const prompt = Prompts.curatePrompt(JSON.stringify(interests.categories), JSON.stringify(articlesPool.slice(0, 30).map((a, i) => ({ id: i, title: String(a.title) }))));
    const result = await this.generateStructured<z.infer<typeof AiSchemas.CurateResponseSchema>>(prompt, Prompts.CURATE_SCHEMA, this.primaryModelName, AiSchemas.CurateResponseSchema);
    return result.selections.map(item => ({ ...articlesPool[item.id], geminiReason: item.reason } as CuratedArticle));
  }

  /**
   * 自律進化のための提案を取得。
   * 新しいニュースソース、注視すべきブランド、関連キーワードをAIに考察させる。
   */
  async getEvolutionProposals(interests: Interests): Promise<z.infer<typeof AiSchemas.EvolutionProposalSchema>> {
    const prompt = Prompts.evolutionPrompt(JSON.stringify(interests));
    return await this.generateStructured<z.infer<typeof AiSchemas.EvolutionProposalSchema>>(prompt, Prompts.EVOLUTION_SCHEMA, this.primaryModelName, AiSchemas.EvolutionProposalSchema);
  }

  /**
   * 通常の進化提案に失敗した場合や、リソースが見つからない場合のフォールバック提案。
   */
  async getFallbackEvolutionProposals(interests: Interests): Promise<z.infer<typeof AiSchemas.FallbackEvolutionSchema>> {
    const prompt = Prompts.fallbackEvolutionPrompt(JSON.stringify(interests.categories));
    return await this.generateStructured<z.infer<typeof AiSchemas.FallbackEvolutionSchema>>(prompt, Prompts.FALLBACK_EVOLUTION_SCHEMA, this.primaryModelName, AiSchemas.FallbackEvolutionSchema);
  }

  /**
   * 大規模な興味・フィード構成の再構築（整理整頓）。
   * 重複を排除し、現在の興味関心に合わせてカテゴリを最適化する。
   */
  async getRestructureProposal(interests: Interests, currentFeeds: FeedConfig, targetCount: number = 10, language: string = 'ja'): Promise<{ categories: Record<string, InterestCategory>, feedConfig: FeedConfig }> {
    const allExistingUrls = Object.entries(currentFeeds).flatMap(([cat, data]) => data.active.map((url: string) => ({ url, oldCategory: cat })));
    const allExistingBrands = [...new Set(Object.values(interests.categories).flatMap(c => c.brands))];
    const allExistingKeywords = [...new Set(Object.values(interests.categories).flatMap(c => c.keywords))];

    const prompt = Prompts.restructurePrompt(targetCount, language, allExistingBrands.join(', '), allExistingKeywords.join(', '), JSON.stringify(interests.categories), JSON.stringify(allExistingUrls));
    // 再構築は推論の難易度が高いため、highReasoningModelName(Pro)を使用。
    const result = await this.generateStructured<z.infer<typeof AiSchemas.RestructureResponseSchema>>(prompt, Prompts.RESTRUCTURE_SCHEMA(targetCount), this.highReasoningModelName, AiSchemas.RestructureResponseSchema);

    const categories: Record<string, InterestCategory> = {};
    const feedConfig: FeedConfig = {};

    result.categories.forEach(cat => {
      categories[cat.name] = { emoji: cat.emoji || '✨', brands: [...new Set(cat.brands)], keywords: [...new Set(cat.keywords)], score: cat.score, reason: cat.reason };
      feedConfig[cat.name] = { active: [], pool: [], failures: {} };
    });

    const categoryNames = Object.keys(categories);
    // 既存のブランド・キーワードの移行（AIが落とした場合の救済策）
    if (categoryNames.length > 0) {
      const first = categoryNames[0];
      const returnedBrands = new Set(Object.values(categories).flatMap(c => c.brands));
      allExistingBrands.forEach(b => { if (!returnedBrands.has(b)) categories[first].brands.push(b); });
      const returnedKeywords = new Set(Object.values(categories).flatMap(c => c.keywords));
      allExistingKeywords.forEach(k => { if (!returnedKeywords.has(k)) categories[first].keywords.push(k); });
    }

    const mapToCat = (name: string): string => {
      if (categories[name]) return name;
      const clean = normalizeCategoryName(name);
      for (const key of Object.keys(categories)) { if (normalizeCategoryName(key) === clean) return key; }
      return Object.keys(categories)[0];
    };

    // AIによるフィードのマッピング適用
    result.feedMapping.forEach(m => {
      const cat = mapToCat(m.newCategory);
      if (feedConfig[cat] && this._isValidUrl(m.url)) feedConfig[cat].active.push(m.url);
    });

    // 新規提案フィードの追加
    result.newSuggestedFeeds.forEach(s => {
      const cat = mapToCat(s.category);
      if (feedConfig[cat] && this._isValidUrl(s.url) && !feedConfig[cat].active.includes(s.url)) feedConfig[cat].active.push(s.url);
    });

    // 各カテゴリに最低1つのフィードを保証（Googleニュースによるフォールバック）
    Object.keys(categories).forEach(cat => {
      if (feedConfig[cat].active.length === 0) {
        feedConfig[cat].active.push(`https://news.google.com/rss/search?q=${encodeURIComponent(cat)}&hl=ja&gl=JP&ceid=JP:ja`);
      }
    });

    return { categories, feedConfig };
  }

  private _isValidUrl(url: string): boolean {
    try { const u = new URL(url); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
  }

  /**
   * 興味に沿った新しいRSS/Atomサイトの探索。
   */
  async discoverSites(interests: Interests): Promise<z.infer<typeof AiSchemas.DiscoverSitesSchema>['sites']> {
    const prompt = Prompts.discoverSitesPrompt(JSON.stringify(interests.categories));
    const result = await this.generateStructured<z.infer<typeof AiSchemas.DiscoverSitesSchema>>(prompt, Prompts.DISCOVER_SITES_SCHEMA, this.primaryModelName, AiSchemas.DiscoverSitesSchema);
    return result.sites;
  }

  /**
   * グローバル展開のための英語圏ソースの探索。
   */
  async discoverEnglishSites(interests: Interests, targetCategories: string[]): Promise<z.infer<typeof AiSchemas.DiscoverEnglishSitesSchema>['sites']> {
    const targets = targetCategories.map(cat => ({ category: cat, details: interests.categories[cat] }));
    const prompt = Prompts.discoverEnglishSitesPrompt(JSON.stringify(targets));
    const result = await this.generateStructured<z.infer<typeof AiSchemas.DiscoverEnglishSitesSchema>>(prompt, Prompts.DISCOVER_ENGLISH_SITES_SCHEMA, this.primaryModelName, AiSchemas.DiscoverEnglishSitesSchema);
    return result.sites;
  }

  /**
   * 多言語対応: 英語記事のタイトルと概要を日本語に翻訳。
   */
  async translateArticles(articles: { title: string, desc: string }[]): Promise<{ title: string, desc: string }[]> {
    const prompt = Prompts.translateArticlesPrompt(JSON.stringify(articles));
    const result = await this.generateStructured<z.infer<typeof AiSchemas.TranslateArticlesSchema>>(prompt, Prompts.TRANSLATE_ARTICLES_SCHEMA, this.primaryModelName, AiSchemas.TranslateArticlesSchema);
    return result.translations;
  }

  /**
   * トレンド分析: 流れてきた最新ニュースから、新しい関心事の兆候を検知。
   */
  async analyzeTrends(articles: Record<string, unknown>[], interests: Interests): Promise<z.infer<typeof AiSchemas.AnalyzeTrendsSchema>['suggestions']> {
    const prompt = Prompts.analyzeTrendsPrompt(Object.keys(interests.categories).join(', '), JSON.stringify(articles.slice(0, 30).map(a => ({ title: a.title, desc: a.desc }))));
    const result = await this.generateStructured<z.infer<typeof AiSchemas.AnalyzeTrendsSchema>>(prompt, Prompts.ANALYZE_TRENDS_SCHEMA, this.primaryModelName, AiSchemas.AnalyzeTrendsSchema);
    return result.suggestions;
  }

  /**
   * 指定したカテゴリ名に基づき、ふさわしいブランド、キーワード、絵文字を自動補完。
   */
  async suggestCategoryDetails(categoryName: string): Promise<z.infer<typeof AiSchemas.SuggestCategoryDetailsSchema>> {
    const prompt = Prompts.suggestCategoryDetailsPrompt(categoryName);
    return await this.generateStructured<z.infer<typeof AiSchemas.SuggestCategoryDetailsSchema>>(prompt, Prompts.SUGGEST_CATEGORY_DETAILS_SCHEMA, this.primaryModelName, AiSchemas.SuggestCategoryDetailsSchema);
  }

  /**
   * 既存設定の全翻訳。主に英語設定への移行時に使用。
   */
  async translateInterests(interests: Interests): Promise<{ interests: Interests, feedConfig: FeedConfig }> {
    const prompt = Prompts.translateInterestsPrompt(JSON.stringify(interests.categories));
    const result = await this.generateStructured<z.infer<typeof AiSchemas.TranslateInterestsSchema>>(prompt, Prompts.TRANSLATE_INTERESTS_SCHEMA, this.primaryModelName, AiSchemas.TranslateInterestsSchema);
    const translatedCategories: Record<string, InterestCategory> = {};
    const translatedFeedConfig: FeedConfig = {};

    for (const cat of result.categories) {
      const { name, ...rest } = cat;
      translatedCategories[name] = rest;
      translatedFeedConfig[name] = { active: [], pool: [], failures: {} };
    }
    return { interests: { ...interests, categories: translatedCategories }, feedConfig: translatedFeedConfig };
  }
}
