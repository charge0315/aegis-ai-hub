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
     * @param _interestsPath - 興味設定ファイルのパス（現在は内部的に使用していません）
     * @param feedsPath - フィード構成ファイルのパス
     * @param dataDir - データディレクトリ（オプション。EnrichmentServiceのキャッシュ等に使用）
     */
    constructor(_interestsPath: string, feedsPath: string, dataDir?: string) {
        this.feedManager = new FeedManager(feedsPath);
        // 大量取得を考慮し並列数を20に設定
        this.rssFetcher = new RSSFetcher(20);
        this.geminiService = new GeminiService(process.env.GEMINI_API_KEY);
        this.enrichmentService = new EnrichmentService(this.geminiService, dataDir);
    }

    /**
     * APIキーを更新し、関連サービスに反映させます。
     */
    public updateApiKey(apiKey: string): void {
        this.geminiService.updateApiKey(apiKey);
    }

    /**
     * Gemini APIを活用し、ユーザーの興味に最適化されたおすすめ記事10選を生成します。
     */
    async getRecommendations(interests: Interests): Promise<any[]> {
        try {
            await this.enrichmentService.init();
            const allArticles = await this.fetchAndProcessArticles(interests);
            const candidates = this._sortAndSlice(allArticles, 30);

            if (candidates.length === 0) {
                throw new Error("推薦用の記事候補が見つかりませんでした。フィード設定を確認してください。");
            }

            console.log(`[ScraperFacade] Geminiによるキュレーションを開始 (${candidates.length}件を評価中)...`);
            const recommendations = await this.geminiService.curate(candidates as unknown as Record<string, unknown>[], interests);
            
            await this.enrichmentService.enrichAll(recommendations as any[]);
            return recommendations;
        } catch (e: any) {
            console.error(`[ScraperFacade] Recommendations Error: ${e.message}`);
            throw e;
        }
    }

    /**
     * 最新のパーソナライズ済みダッシュボードデータを構築します。
     */
    async getDashboard(interests: Interests): Promise<Record<string, any>> {
        console.log(`[ScraperFacade] パーソナライズド・ダッシュボードを構築中...`);
        await this.enrichmentService.init();
        
        const articlesNormal = await this.fetchAndProcessArticles(interests, false);
        let articlesExtended: Article[] | null = null;

        const dashboard: Record<string, any> = {};
        const categories = Object.keys(interests.categories);
        const clean = (s: string) => s.replace(/[＆&＆\s・]/g, '').toLowerCase();

        for (const catName of categories) {
            const targetClean = clean(catName);
            
            // 言語優先（日本語）かつカテゴリ一致
            let filtered = articlesNormal.filter(a => {
                return clean(a.category) === targetClean && a.language === 'ja';
            });
            
            // 日本語がない場合は全言語からカテゴリ一致で検索
            if (filtered.length === 0) {
                filtered = articlesNormal.filter(a => clean(a.category) === targetClean);
            }

            // それでも0件の場合は期間制限を解除
            if (filtered.length === 0) {
                if (!articlesExtended) {
                    console.log(`[ScraperFacade] カテゴリ "${catName}" の最新記事が0件のため、期間制限を解除して再探索します...`);
                    articlesExtended = await this.fetchAndProcessArticles(interests, true);
                }
                filtered = articlesExtended.filter(a => clean(a.category) === targetClean);
            }
            
            const topArticles = this._sortAndSlice(filtered, 50);
            await this.enrichmentService.enrichAll(topArticles);

            dashboard[catName] = {
                emoji: interests.categories[catName].emoji || null,
                articles: topArticles
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 15)
                    .map(a => a.toJSON())
            };
        }

        return dashboard;
    }

    /**
     * 最新の記事群から新しいトレンドキーワードやブランドを抽出します。
     */
    async discoverTrends(interests: Interests): Promise<TrendSuggestion[]> {
        console.log(`[ScraperFacade] トレンド探索を開始します...`);
        try {
            const articles = await this.fetchAndProcessArticles(interests);
            console.log(`[ScraperFacade] 解析対象の記事数: ${articles.length}`);
            
            if (articles.length === 0) {
                console.warn(`[ScraperFacade] 解析対象の記事が0件です。トレンド探索をスキップします。`);
                return [];
            }

            const topArticles = articles.slice(0, 50).map((a: Article) => ({ title: a.title, desc: a.desc, brand: a.brand }));
            console.log(`[ScraperFacade] Gemini API にリクエストを送信中 (上位50件)...`);
            
            const suggestions = await this.geminiService.analyzeTrends(topArticles, interests);
            console.log(`[ScraperFacade] AI から ${suggestions.length} 件の提案を受信しました。`);
            
            return suggestions as unknown as TrendSuggestion[];
        } catch (e: any) {
            console.error(`[ScraperFacade] discoverTrends でエラーが発生しました: ${e.message}`);
            throw e;
        }
    }

    private _sortAndSlice(articles: Article[], count: number): Article[] {
        return articles
            .sort((a, b) => b.score - a.score || new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, count);
    }

    /**
     * 記事が0件の場合に期間制限を解除するフォールバック機能付きの取得メソッド。
     */
    async fetchAndProcessArticlesWithFallback(interests: Interests): Promise<Article[]> {
        console.log(`[ScraperFacade] Starting fetchAndProcessArticlesWithFallback...`);
        // 1. 通常取得 (90日制限あり)
        let articles = await this.fetchAndProcessArticles(interests, false);
        
        // 2. 0件の場合、期間制限なしで再取得
        if (articles.length === 0) {
            console.warn(`[ScraperFacade] No articles found within 90 days. Retrying without date limit...`);
            articles = await this.fetchAndProcessArticles(interests, true);
        }
        
        return articles;
    }

    /**
     * 各フィードから記事を並列取得し、パース・カテゴリ判定・スコアリングを行うコアロジック。
     */
    async fetchAndProcessArticles(interests: Interests, ignoreDateLimit: boolean = false): Promise<Article[]> {
        const scorer = new ScoringService(interests);
        const feeds = this.feedManager.getAllActiveFeeds();
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        console.log(`[ScraperFacade] Fetching ${feeds.length} feeds (ignoreDateLimit: ${ignoreDateLimit})...`);

        const results = await this.rssFetcher.fetchAll(feeds);
        const allArticles: Article[] = [];
        let successCount = 0;
        let failCount = 0;

        for (const res of results) {
            if (!res.success) {
                failCount++;
                if (failCount <= 10) console.warn(`[ScraperFacade] Feed failed: ${res.url} - ${res.error}`);
                await this.feedManager.reportFailure(res.category, res.url);
                continue;
            }
            successCount++;
            this.feedManager.reportSuccess(res.category, res.url);

            if (res.items) {
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
                            title: record.title,
                            link: record.link,
                            desc: record.contentSnippet || record.description,
                            brand: brand,
                            score: score,
                            category: detectedCat,
                            date: isDateValid ? pubDate.toISOString() : new Date().toISOString(),
                            img: this.enrichmentService.extractBasicImage(record),
                            language: language
                        }));
                    } catch (err) {
                        // 個別の記事パースエラーは無視
                        continue;
                    }
                }
            }
        }
        
        console.log(`[ScraperFacade] Fetch completed. Success: ${successCount}, Failed: ${failCount}, Articles: ${allArticles.length}`);
        return allArticles;
    }

    /**
     * テキスト内容から言語を簡易的に判定します。
     * @private
     */
    private _detectLanguage(title: string, snippet: string): 'ja' | 'en' | 'other' {
        const text = title + snippet;
        // ひらがな、カタカナ、または漢字が含まれているかチェック
        const containsJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
        return containsJapanese ? 'ja' : 'en';
    }
}
