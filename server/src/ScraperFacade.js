import { FeedManager } from './services/FeedManager.js';
import { RSSFetcher } from './services/RSSFetcher.js';
import { ScoringService } from './services/ScoringService.js';
import { EnrichmentService } from './services/EnrichmentService.js';
import { Article } from './models/Article.js';

/**
 * スクレイピング全体のワークフローを制御するファサードクラス。
 * 外部（APIやMCP）はこのクラスを通じてニュースを取得します。
 */
export class ScraperFacade {
    constructor(interestsPath, feedsPath) {
        this.feedManager = new FeedManager(feedsPath);
        this.rssFetcher = new RSSFetcher(10); // 並列数を10に設定
        this.enrichmentService = new EnrichmentService();
        this.interestsPath = interestsPath; // 毎回読み込む必要があるため
    }

    /**
     * 最新のニュースを取得し、パーソナライズされた形式で返します。
     */
    async getDashboard(interests) {
        const scorer = new ScoringService(interests);
        const activeFeeds = this.feedManager.getAllActiveFeeds();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        console.log(`ScraperFacade: ${activeFeeds.length}個のフィードから取得を開始します...`);

        // 1. RSSを一括並列取得
        const results = await this.rssFetcher.fetchAll(activeFeeds);
        const allArticles = [];

        // 2. 正規化・カテゴリ判定・スコアリング
        for (const res of results) {
            if (!res.success) {
                console.error(`ScraperFacade: フィードエラー [${res.category}]: ${res.url} - ${res.error}`);
                this.feedManager.reportFailure(res.category, res.url);
                continue;
            }

            this.feedManager.reportSuccess(res.category, res.url);

            for (const item of res.items) {
                const pubDate = new Date(item.isoDate || item.pubDate);
                if (pubDate < oneMonthAgo) continue;

                // スコアリングサービスによる動的な再判定
                const detectedCat = scorer.detectCategory(item.title, item.contentSnippet, res.category);
                const score = scorer.calculateScore(item.title, item.contentSnippet, detectedCat);
                const brand = scorer.extractBrand(item.title);

                const article = new Article({
                    title: item.title,
                    link: item.link,
                    desc: item.contentSnippet || item.description,
                    brand: brand,
                    score: score,
                    category: detectedCat,
                    date: item.isoDate || item.pubDate,
                    img: this.enrichmentService.extractBasicImage(item)
                });

                allArticles.push(article);
            }
        }

        // 3. 高スコア記事へのエンリッチメント（画像補完）
        // ※ 負荷軽減のため、上位30件程度に限定
        const topArticles = allArticles
            .sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date))
            .slice(0, 50);

        console.log(`ScraperFacade: 上位${topArticles.length}件の記事をエンリッチします...`);
        await Promise.all(topArticles.map(a => this.enrichmentService.enrich(a)));

        // 4. カテゴリ別に整理して返却
        const dashboard = {};
        // 興味のある全カテゴリを初期化
        for (const cat in interests.categories) {
            dashboard[cat] = [];
        }

        topArticles.forEach(a => {
            if (dashboard[a.category]) {
                dashboard[a.category].push(a.toJSON());
            }
        });

        // 各カテゴリ内を日付順にソートし、15件に絞り込み
        for (const cat in dashboard) {
            dashboard[cat] = dashboard[cat]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 15);
        }

        return dashboard;
    }
}
