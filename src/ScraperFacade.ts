/**
 * @fileoverview スクレイピングとAI解析のワークフローを統合するファサードクラス。
 * 
 * 意図: フィードの取得、カテゴリー判定、スコアリング、AIによる要素の推論といった
 * 複雑なプロセスを隠蔽し、シンプルなインターフェースで上位レイヤーに機能を提供するためです。
 */

import { FeedManager } from './services/FeedManager';
import { RSSFetcher } from './services/RSSFetcher';
import { ScoringService } from './services/ScoringService';
import { EnrichmentService } from './services/EnrichmentService';
import { Article } from './models/Article';
import { GeminiService } from './services/GeminiService';
import type { Interests } from './models/Schemas';
import type { TrendSuggestion } from './types';
import { normalizeCategoryName } from './utils/normalize';

/**
 * スクレイピング全体を制御するファサードクラス。
 */
export class ScraperFacade {
    public feedManager: FeedManager;
    public rssFetcher: RSSFetcher;
    public enrichmentService: EnrichmentService;
    public geminiService: GeminiService;

    /**
     * @param _interestsPath - 未使用
     * @param feedsPath - フィード構成ファイルのパス
     * @param dataDir - データディレクトリ
     */
    constructor(_interestsPath: string, feedsPath: string, dataDir?: string) {
        this.feedManager = new FeedManager(feedsPath);
        this.rssFetcher = new RSSFetcher(20);
        this.geminiService = new GeminiService(process.env.GEMINI_API_KEY);
        this.enrichmentService = new EnrichmentService(this.geminiService, dataDir);
    }

    /**
     * APIキーを更新します。
     */
    public updateApiKey(apiKey: string): void {
        this.geminiService.updateApiKey(apiKey);
    }

    /**
     * AIによるおすすめ記事を生成します。
     */
    async getRecommendations(interests: Interests): Promise<Article[]> {
        try {
            await this.enrichmentService.init();
            const allArticles = await this.fetchAndProcessArticles(interests);
            const candidates = this._sortAndSlice(allArticles, 30);

            if (candidates.length === 0) {
                throw new Error("推薦用の記事候補が見つかりませんでした。");
            }

            console.log(`[ScraperFacade] AI推薦生成中 (${candidates.length}件)...`);
            const recommendations = await this.geminiService.curate(candidates.map(a => a.toJSON()), interests);

            const recommendedArticles = recommendations.map(r => {
                const matched = candidates.find(c => c.link === r.url);
                if (matched) {
                    matched.geminiReason = r.geminiReason;
                    return matched;
                }
                return new Article({
                    title: r.title,
                    link: r.url || '',
                    desc: r.content || '',
                    brand: '',
                    score: 0,
                    category: 'Uncategorized',
                    date: new Date().toISOString(),
                    img: null,
                    language: 'en',
                    geminiReason: r.geminiReason
                });
            });

            await this.enrichmentService.enrichAll(recommendedArticles);
            return recommendedArticles;
        } catch (e: unknown) {
            console.error(`[ScraperFacade] Recommendations Error: ${String(e)}`);
            throw e;
        }
    }

    /**
     * パーソナライズされたダッシュボードデータを構築します。
     */
    async getDashboard(interests: Interests): Promise<Record<string, { emoji: string | null, articles: ReturnType<Article['toJSON']>[] }>> {
        console.log(`[ScraperFacade] ダッシュボード構築中...`);
        await this.enrichmentService.init();

        const articlesNormal = await this.fetchAndProcessArticles(interests, false);
        let articlesExtended: Article[] | null = null;

        const dashboard: Record<string, { emoji: string | null, articles: ReturnType<Article['toJSON']>[] }> = {};
        const categories = Object.keys(interests.categories);

        for (const catName of categories) {
            const targetClean = normalizeCategoryName(catName);

            // カテゴリ一致する記事を抽出
            let filtered = articlesNormal.filter(a => {
                return normalizeCategoryName(a.category) === targetClean;
            });

            // 0件の場合は期間制限を解除して再探索
            if (filtered.length === 0) {
                if (!articlesExtended) {
                    console.log(`[ScraperFacade] カテゴリ "${catName}" の最新記事が0件のため期間解除探索中...`);
                    articlesExtended = await this.fetchAndProcessArticles(interests, true);
                }
                filtered = articlesExtended.filter(a => normalizeCategoryName(a.category) === targetClean);
            }

            const topArticles = this._sortAndSlice(filtered, 15);
            await this.enrichmentService.enrichAll(topArticles);

            dashboard[catName] = {
                emoji: interests.categories[catName].emoji || null,
                articles: topArticles.map(a => a.toJSON())
            };
        }

        return dashboard;
    }

    /**
     * トレンド探索。
     */
    async discoverTrends(interests: Interests): Promise<TrendSuggestion[]> {
        try {
            const articles = await this.fetchAndProcessArticles(interests);
            if (articles.length === 0) return [];

            const topArticles = articles.slice(0, 50).map(a => ({ title: a.title, desc: a.desc, brand: a.brand }));
            const suggestions = await this.geminiService.analyzeTrends(topArticles, interests);
            return suggestions as unknown as TrendSuggestion[];
        } catch (e: unknown) {
            console.error(`[ScraperFacade] discoverTrends Error: ${String(e)}`);
            throw e;
        }
    }

    private _sortAndSlice(articles: Article[], count: number): Article[] {
        return articles
            .sort((a, b) => b.score - a.score || new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, count);
    }

    /**
     * フォールバック付き記事取得。
     */
    async fetchAndProcessArticlesWithFallback(interests: Interests): Promise<Article[]> {
        let articles = await this.fetchAndProcessArticles(interests, false);
        if (articles.length === 0) {
            articles = await this.fetchAndProcessArticles(interests, true);
        }
        return articles;
    }

    /**
     * 各フィードから記事を取得・加工するコアロジック。
     */
    async fetchAndProcessArticles(interests: Interests, ignoreDateLimit: boolean = false): Promise<Article[]> {
        const scorer = new ScoringService(interests);
        const feeds = this.feedManager.getAllActiveFeeds();
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        console.log(`[ScraperFacade] Fetching ${feeds.length} feeds...`);

        const results = await this.rssFetcher.fetchAll(feeds);
        const allArticles: Article[] = [];

        for (const res of results) {
            if (!res.success || !res.items) {
                if (!res.success) await this.feedManager.reportFailure(res.category, res.url);
                continue;
            }
            
            this.feedManager.reportSuccess(res.category, res.url);

            for (const item of res.items) {
                try {
                    const record = item as any;
                    const pubDateStr = String(record.isoDate || record.pubDate || '');
                    const pubDate = new Date(pubDateStr);
                    const isDateValid = !isNaN(pubDate.getTime());

                    if (!ignoreDateLimit && isDateValid && pubDate.getTime() < ninetyDaysAgo.getTime()) continue;

                    const title = String(record.title || '');
                    const snippet = String(record.contentSnippet || record.description || '');
                    const detectedCat = scorer.detectCategory(title, snippet, res.category);
                    const score = scorer.calculateScore(title, snippet, detectedCat);
                    const brand = scorer.extractBrand(title);
                    const language = this._detectLanguage(title, snippet);

                    allArticles.push(new Article({
                        title: title,
                        link: String(record.link || ''),
                        desc: snippet,
                        brand: brand,
                        score: score,
                        category: detectedCat,
                        date: isDateValid ? pubDate.toISOString() : new Date().toISOString(),
                        img: this.enrichmentService.extractBasicImage(record),
                        language: language
                    }));
                } catch (err) {
                    continue;
                }
            }
        }

        return allArticles.sort((a, b) => b.score - a.score);
    }

    private _detectLanguage(title: string, desc: string): 'ja' | 'en' | 'other' {
        const text = (title + desc).toLowerCase();
        const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
        if (hasKana) return 'ja';
        const hasKanji = /[\u4E00-\u9FAF]/.test(text);
        if (hasKanji) return 'other';
        return 'en';
    }
}
