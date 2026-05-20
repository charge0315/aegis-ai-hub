/**
 * @fileoverview スクレイピングとAI解析のワークフローを統合するファサード
 * 
 * 意図: フィードの取得、カテゴリ判定、スコアリング、AIによる要約・推薦といった
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
 * スクレイピング全体のワークフローを制御するファサードクラス。
 * データの取得、正規化、AI推薦をオーケストレートします。
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
     * AIによるおすすめ記事10選を生成。
     */
    async getRecommendations(interests: Interests): Promise<Article[]> {
        try {
            await this.enrichmentService.init();
            const allArticles = await this.fetchAndProcessArticles(interests);
            const candidates = this._sortAndSlice(allArticles, 30);

            if (candidates.length === 0) {
                console.warn("[ScraperFacade] No candidates for recommendations.");
                return [];
            }

            console.log(`[ScraperFacade] AIキュレーション中 (${candidates.length}件)...`);
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
            return [];
        }
    }

    /**
     * 最新のダッシュボードデータを構築。
     */
    async getDashboard(interests: Interests): Promise<Record<string, { emoji: string | null, articles: ReturnType<Article['toJSON']>[] }>> {
        console.log(`[ScraperFacade] ダッシュボード構築を開始...`);
        await this.enrichmentService.init();

        const articlesNormal = await this.fetchAndProcessArticles(interests, false);
        console.log(`[ScraperFacade] 取得記事数 (通常): ${articlesNormal.length}`);
        
        let articlesExtended: Article[] | null = null;
        const dashboard: Record<string, { emoji: string | null, articles: ReturnType<Article['toJSON']>[] }> = {};
        const categories = Object.keys(interests.categories);

        // カテゴリ不一致記事のバッファ（後で統合フィードや未分類として表示可能）
        const uncategorizedArticles: Article[] = [];
        const seenLinks = new Set<string>();

        for (const catName of categories) {
            const targetClean = normalizeCategoryName(catName);

            let filtered = articlesNormal.filter(a => {
                const isMatch = normalizeCategoryName(a.category) === targetClean;
                if (isMatch) seenLinks.add(a.link);
                return isMatch;
            });

            if (filtered.length === 0) {
                if (!articlesExtended) {
                    console.log(`[ScraperFacade] カテゴリ "${catName}" の最新記事が0件のため期間解除探索中...`);
                    articlesExtended = await this.fetchAndProcessArticles(interests, true);
                }
                filtered = articlesExtended.filter(a => {
                    const isMatch = normalizeCategoryName(a.category) === targetClean;
                    if (isMatch) seenLinks.add(a.link);
                    return isMatch;
                });
            }

            const topArticles = this._sortAndSlice(filtered, 15);
            await this.enrichmentService.enrichAll(topArticles);

            dashboard[catName] = {
                emoji: interests.categories[catName].emoji || null,
                articles: topArticles.map(a => a.toJSON())
            };
        }

        // 未分類記事の収集
        articlesNormal.forEach(a => {
            if (!seenLinks.has(a.link)) uncategorizedArticles.push(a);
        });

        if (uncategorizedArticles.length > 0) {
            const topUncategorized = this._sortAndSlice(uncategorizedArticles, 15);
            await this.enrichmentService.enrichAll(topUncategorized);
            dashboard['Uncategorized'] = {
                emoji: '🌐',
                articles: topUncategorized.map(a => a.toJSON())
            };
        }

        console.log(`[ScraperFacade] ダッシュボード構築完了 (カテゴリ数: ${Object.keys(dashboard).length})`);
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
            return [];
        }
    }

    private _sortAndSlice(articles: Article[], count: number): Article[] {
        return articles
            .sort((a, b) => b.score - a.score || new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, count);
    }

    /**
     * フォールバック付き取得。
     */
    async fetchAndProcessArticlesWithFallback(interests: Interests): Promise<Article[]> {
        let articles = await this.fetchAndProcessArticles(interests, false);
        if (articles.length === 0) {
            articles = await this.fetchAndProcessArticles(interests, true);
        }
        return articles;
    }

    /**
     * 各フィードから記事を並列取得。
     */
    async fetchAndProcessArticles(interests: Interests, ignoreDateLimit: boolean = false): Promise<Article[]> {
        const scorer = new ScoringService(interests);
        const feeds = this.feedManager.getAllActiveFeeds();
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        if (feeds.length === 0) {
            console.warn("[ScraperFacade] No active feeds found.");
            return [];
        }

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
                    const record = item as Record<string, unknown>;
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
                        title,
                        link: String(record.link || ''),
                        desc: snippet,
                        brand,
                        score,
                        category: detectedCat,
                        date: isDateValid ? pubDate.toISOString() : new Date().toISOString(),
                        img: this.enrichmentService.extractBasicImage(record),
                        language
                    }));
                } catch {
                    continue;
                }
            }
        }

        console.log(`[ScraperFacade] Processed ${allArticles.length} articles.`);
        return allArticles.sort((a, b) => b.score - a.score);
    }

    private _detectLanguage(title: string, snippet: string): 'ja' | 'en' | 'other' {
        const text = title + snippet;
        const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
        if (hasKana) return 'ja';
        const hasKanji = /[\u4E00-\u9FAF]/.test(text);
        if (hasKanji) return 'other';
        return 'en';
    }
}
