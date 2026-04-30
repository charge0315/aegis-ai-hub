import { FeedManager } from './services/FeedManager.js';
import { RSSFetcher } from './services/RSSFetcher.js';
import { ScoringService } from './services/ScoringService.js';
import { EnrichmentService } from './services/EnrichmentService.js';
import { Article } from './models/Article.js';
import { GeminiService } from './services/GeminiService.js';
/**
 * スクレイピング全体のワークフローを制御するファサードクラス。
 * データの取得、正規化、AI推薦をオーケストレートします。
 */
export class ScraperFacade {
    feedManager;
    rssFetcher;
    enrichmentService;
    geminiService;
    /**
     * @param interestsPath - 興味設定ファイルのパス
     * @param feedsPath - フィード構成ファイルのパス
     */
    constructor(interestsPath, feedsPath) {
        this.feedManager = new FeedManager(feedsPath);
        this.rssFetcher = new RSSFetcher(10);
        this.geminiService = new GeminiService(process.env.GEMINI_API_KEY);
        this.enrichmentService = new EnrichmentService(this.geminiService);
    }
    /**
     * Gemini APIを活用し、ユーザーの興味に最適化されたおすすめ記事10選を生成します。
     * @param interests - ユーザーの興味データ
     * @returns 厳選された記事リスト
     */
    async getRecommendations(interests) {
        try {
            const allArticles = await this._fetchAndProcessArticles(interests);
            const candidates = this._sortAndSlice(allArticles, 30);
            if (candidates.length === 0) {
                throw new Error("推薦用の記事候補が見つかりませんでした。フィード設定を確認してください。");
            }
            console.log(`[ScraperFacade] Geminiによるキュレーションを開始 (${candidates.length}件を評価中)...`);
            const recommendations = await this.geminiService.curate(candidates, interests);
            // 推薦された10件に対して優先的に画像補完を実行し、視覚的な品質を向上させる
            await Promise.all(recommendations.map(a => this.enrichmentService.enrich(a)));
            return recommendations;
        }
        catch (e) {
            console.error(`[ScraperFacade] Recommendations Error: ${e.message}`);
            throw e;
        }
    }
    /**
     * 最新のパーソナライズ済みダッシュボードデータを構築します。
     * @param interests - ユーザーの興味データ
     * @returns カテゴリ別に分類された記事データ
     */
    async getDashboard(interests) {
        console.log(`[ScraperFacade] パーソナライズド・ダッシュボードを構築中...`);
        const allArticles = await this._fetchAndProcessArticles(interests);
        // スコアと鮮度のバランスが良い上位50件を詳細エンリッチメントの対象とする
        const topArticles = this._sortAndSlice(allArticles, 50);
        await Promise.all(topArticles.map(a => this.enrichmentService.enrich(a)));
        const dashboard = {};
        for (const catName in interests.categories) {
            dashboard[catName] = {
                emoji: interests.categories[catName].emoji || null,
                articles: []
            };
        }
        topArticles.forEach(a => {
            if (dashboard[a.category]) {
                dashboard[a.category].articles.push(a.toJSON());
            }
        });
        // 各カテゴリ内を最終的に新着順で整列し、表示枠（15件）に最適化
        for (const catName in dashboard) {
            dashboard[catName].articles = dashboard[catName].articles
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 15);
        }
        return dashboard;
    }
    /**
     * 記事をスコア順および日付順でソートし、指定件数を抽出する内部ヘルパー。
     * @private
     */
    _sortAndSlice(articles, count) {
        return articles
            .sort((a, b) => b.score - a.score || new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, count);
    }
    /**
     * 各フィードから記事を並列取得し、パース・カテゴリ判定・スコアリングを行うコアロジック。
     * @param interests - ユーザーの興味データ
     * @returns 正規化された記事オブジェクトの配列
     */
    async _fetchAndProcessArticles(interests) {
        const scorer = new ScoringService(interests);
        const feeds = this.feedManager.getAllActiveFeeds();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const results = await this.rssFetcher.fetchAll(feeds);
        const allArticles = [];
        for (const res of results) {
            if (!res.success) {
                await this.feedManager.reportFailure(res.category, res.url);
                continue;
            }
            this.feedManager.reportSuccess(res.category, res.url);
            if (res.items) {
                for (const item of res.items) {
                    // 1ヶ月以上前の古い記事はノイズとして除外
                    const pubDate = new Date(item.isoDate || item.pubDate);
                    if (pubDate < oneMonthAgo)
                        continue;
                    // スコアリングとメタ情報の抽出
                    const detectedCat = scorer.detectCategory(item.title, item.contentSnippet, res.category);
                    const score = scorer.calculateScore(item.title, item.contentSnippet, detectedCat);
                    const brand = scorer.extractBrand(item.title);
                    allArticles.push(new Article({
                        title: item.title,
                        link: item.link,
                        desc: item.contentSnippet || item.description,
                        brand: brand,
                        score: score,
                        category: detectedCat,
                        date: item.isoDate || item.pubDate,
                        img: this.enrichmentService.extractBasicImage(item)
                    }));
                }
            }
        }
        return allArticles;
    }
}
