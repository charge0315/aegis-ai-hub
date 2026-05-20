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
 * Aegis AI Hubの「思考エンジン」として機能する中核サービス。
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

  setUsageManager(manager: UsageManager): void {
    this.usageManager = manager;
  }

  updateApiKey(apiKey: string): void {
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  /**
   * 厳格なデータ構造でのみ返答を許すためのコア・インターフェース。
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

      if (this.usageManager && response.usageMetadata) {
        const { promptTokenCount = 0, candidatesTokenCount = 0 } = response.usageMetadata;
        this.usageManager.recordUsage(modelName, promptTokenCount, candidatesTokenCount).catch(console.error);
      }

      if (!text) throw new Error("Empty response");

      const parsed = JSON.parse(text) as T;
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

      if (modelName === this.highReasoningModelName) return this.generateStructured<T>(prompt, schema, this.primaryModelName, zodSchema);
      if (modelName === this.primaryModelName) return this.generateStructured<T>(prompt, schema, this.stableFallbackModelName, zodSchema);
      if (modelName === this.stableFallbackModelName) return this.generateStructured<T>(prompt, schema, "gemini-1.5-flash", zodSchema);

      throw new Error(`Gemini API execution failed: ${errorMessage}`, { cause: error });
    }
  }

  async curate(articlesPool: Record<string, unknown>[], interests: Interests): Promise<CuratedArticle[]> {
    const prompt = Prompts.curatePrompt(JSON.stringify(interests.categories), JSON.stringify(articlesPool.slice(0, 30).map((a, i) => ({ id: i, title: String(a.title) }))));
    const result = await this.generateStructured<z.infer<typeof AiSchemas.CurateResponseSchema>>(prompt, Prompts.CURATE_SCHEMA, this.primaryModelName, AiSchemas.CurateResponseSchema);
    return result.selections.map(item => ({ ...articlesPool[item.id], geminiReason: item.reason } as CuratedArticle));
  }

  async getEvolutionProposals(interests: Interests): Promise<z.infer<typeof AiSchemas.EvolutionProposalSchema>> {
    const prompt = Prompts.evolutionPrompt(JSON.stringify(interests));
    return await this.generateStructured<z.infer<typeof AiSchemas.EvolutionProposalSchema>>(prompt, Prompts.EVOLUTION_SCHEMA, this.primaryModelName, AiSchemas.EvolutionProposalSchema);
  }

  async getFallbackEvolutionProposals(interests: Interests): Promise<z.infer<typeof AiSchemas.FallbackEvolutionSchema>> {
    const prompt = Prompts.fallbackEvolutionPrompt(JSON.stringify(interests.categories));
    return await this.generateStructured<z.infer<typeof AiSchemas.FallbackEvolutionSchema>>(prompt, Prompts.FALLBACK_EVOLUTION_SCHEMA, this.primaryModelName, AiSchemas.FallbackEvolutionSchema);
  }

  async getRestructureProposal(interests: Interests, currentFeeds: FeedConfig, targetCount: number = 10, language: string = 'ja'): Promise<{ categories: Record<string, InterestCategory>, feedConfig: FeedConfig }> {
    const allExistingUrls = Object.entries(currentFeeds).flatMap(([cat, data]) => data.active.map((url: string) => ({ url, oldCategory: cat })));
    const allExistingBrands = [...new Set(Object.values(interests.categories).flatMap(c => c.brands))];
    const allExistingKeywords = [...new Set(Object.values(interests.categories).flatMap(c => c.keywords))];

    const prompt = Prompts.restructurePrompt(targetCount, language, allExistingBrands.join(', '), allExistingKeywords.join(', '), JSON.stringify(interests.categories), JSON.stringify(allExistingUrls));
    const result = await this.generateStructured<z.infer<typeof AiSchemas.RestructureResponseSchema>>(prompt, Prompts.RESTRUCTURE_SCHEMA(targetCount), this.highReasoningModelName, AiSchemas.RestructureResponseSchema);

    const categories: Record<string, InterestCategory> = {};
    const feedConfig: FeedConfig = {};

    result.categories.forEach(cat => {
      categories[cat.name] = { emoji: cat.emoji || '✨', brands: [...new Set(cat.brands)], keywords: [...new Set(cat.keywords)], score: cat.score, reason: cat.reason };
      feedConfig[cat.name] = { active: [], pool: [], failures: {} };
    });

    const categoryNames = Object.keys(categories);
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

    result.feedMapping.forEach(m => {
      const cat = mapToCat(m.newCategory);
      if (feedConfig[cat] && this._isValidUrl(m.url)) feedConfig[cat].active.push(m.url);
    });

    result.newSuggestedFeeds.forEach(s => {
      const cat = mapToCat(s.category);
      if (feedConfig[cat] && this._isValidUrl(s.url) && !feedConfig[cat].active.includes(s.url)) feedConfig[cat].active.push(s.url);
    });

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

  async discoverSites(interests: Interests): Promise<z.infer<typeof AiSchemas.DiscoverSitesSchema>['sites']> {
    const prompt = Prompts.discoverSitesPrompt(JSON.stringify(interests.categories));
    const result = await this.generateStructured<z.infer<typeof AiSchemas.DiscoverSitesSchema>>(prompt, Prompts.DISCOVER_SITES_SCHEMA, this.primaryModelName, AiSchemas.DiscoverSitesSchema);
    return result.sites;
  }

  async discoverEnglishSites(interests: Interests, targetCategories: string[]): Promise<z.infer<typeof AiSchemas.DiscoverEnglishSitesSchema>['sites']> {
    const targets = targetCategories.map(cat => ({ category: cat, details: interests.categories[cat] }));
    const prompt = Prompts.discoverEnglishSitesPrompt(JSON.stringify(targets));
    const result = await this.generateStructured<z.infer<typeof AiSchemas.DiscoverEnglishSitesSchema>>(prompt, Prompts.DISCOVER_ENGLISH_SITES_SCHEMA, this.primaryModelName, AiSchemas.DiscoverEnglishSitesSchema);
    return result.sites;
  }

  async translateArticles(articles: { title: string, desc: string }[]): Promise<{ title: string, desc: string }[]> {
    const prompt = Prompts.translateArticlesPrompt(JSON.stringify(articles));
    const result = await this.generateStructured<z.infer<typeof AiSchemas.TranslateArticlesSchema>>(prompt, Prompts.TRANSLATE_ARTICLES_SCHEMA, this.primaryModelName, AiSchemas.TranslateArticlesSchema);
    return result.translations;
  }

  async analyzeTrends(articles: Record<string, unknown>[], interests: Interests): Promise<z.infer<typeof AiSchemas.AnalyzeTrendsSchema>['suggestions']> {
    const prompt = Prompts.analyzeTrendsPrompt(Object.keys(interests.categories).join(', '), JSON.stringify(articles.slice(0, 30).map(a => ({ title: a.title, desc: a.desc }))));
    const result = await this.generateStructured<z.infer<typeof AiSchemas.AnalyzeTrendsSchema>>(prompt, Prompts.ANALYZE_TRENDS_SCHEMA, this.primaryModelName, AiSchemas.AnalyzeTrendsSchema);
    return result.suggestions;
  }

  async suggestCategoryDetails(categoryName: string): Promise<z.infer<typeof AiSchemas.SuggestCategoryDetailsSchema>> {
    const prompt = Prompts.suggestCategoryDetailsPrompt(categoryName);
    return await this.generateStructured<z.infer<typeof AiSchemas.SuggestCategoryDetailsSchema>>(prompt, Prompts.SUGGEST_CATEGORY_DETAILS_SCHEMA, this.primaryModelName, AiSchemas.SuggestCategoryDetailsSchema);
  }

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
