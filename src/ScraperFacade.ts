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
        this.rssFetcher = new RSSFetcher(10);
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
     * 
     * 意図: 大量の記事の中から、ユーザーの現在の関心事に最も合致し、かつ価値の高い情報を
     * AIの判断（キュレーション）に基づいて厳選するためです。
     * 
     * @param interests - ユーザーの興味データ
     * @returns 厳選された記事リスト
     */
    async getRecommendations(interests: Interests): Promise<any[]> {
        try {
            await this.enrichmentService.init(); // キャッシュの初期化
            const allArticles = await this.fetchAndProcessArticles(interests);
            const candidates = this._sortAndSlice(allArticles, 30);

            if (candidates.length === 0) {
                throw new Error("推薦用の記事候補が見つかりませんでした。フィード設定を確認してください。");
            }

            console.log(`[ScraperFacade] Geminiによるキュレーションを開始 (${candidates.length}件を評価中)...`);
            const recommendations = await this.geminiService.curate(candidates as unknown as Record<string, unknown>[], interests);
            
            // 推薦された10件に対して優先的に画像補完を実行し、視覚的な品質を向上させる
            await this.enrichmentService.enrichAll(recommendations as any[]);

            return recommendations;
        } catch (e: any) {
            console.error(`[ScraperFacade] Recommendations Error: ${e.message}`);
            throw e;
        }
    }

    /**
     * 最新のパーソナライズ済みダッシュボードデータを構築します。
     * 
     * 意図: 全てのカテゴリにおける高品質な最新記事を収集し、
     * ユーザーが一目で全体像を把握できるパーソナライズされた画面データを提供するためです。
     * 記事が0件になるのを防ぐため、多段階のフォールバックロジックを搭載しています。
     * 
     * @param interests - ユーザーの興味データ
     * @returns カテゴリ別に分類された記事データ
     */
    async getDashboard(interests: Interests): Promise<Record<string, any>> {
        console.log(`[ScraperFacade] パーソナライズド・ダッシュボードを構築中...`);
        await this.enrichmentService.init(); // キャッシュの初期化
        
        // 1. 通常取得 (90日制限あり)
        const articlesNormal = await this.fetchAndProcessArticles(interests, false);
        
        // 2. 期間制限なし取得 (フォールバック用。全カテゴリが空の場合のみ使用するのではなく、カテゴリごとに判断)
        // パフォーマンスのため、一旦 normal で全カテゴリ埋まるか確認し、空がある場合のみ再取得する
        let articlesExtended: Article[] | null = null;

        const dashboard: Record<string, any> = {};
        const categories = Object.keys(interests.categories);

        for (const catName of categories) {
            // --- 多段階フォールバックロジック (カテゴリ単位) ---
            
            // Phase 1: 日本語 かつ 90日以内
            let filtered = articlesNormal.filter(a => a.category === catName && a.language === 'ja');
            
            // Phase 2: 全言語 かつ 90日以内
            if (filtered.length === 0) {
                filtered = articlesNormal.filter(a => a.category === catName);
            }

            // Phase 3: 全言語 かつ 期間制限なし
            if (filtered.length === 0) {
                if (!articlesExtended) {
                    console.log(`[ScraperFacade] カテゴリ "${catName}" の最新記事が0件のため、期間制限を解除して再探索します...`);
                    articlesExtended = await this.fetchAndProcessArticles(interests, true);
                }
                filtered = articlesExtended.filter(a => a.category === catName);
            }
            
            // スコアと鮮度のバランスが良い上位50件を詳細エンリッチメントの対象とする
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
     * 記事をスコア順および日付順でソートし、指定件数を抽出する内部ヘルパー。
     * @private
     */
    private _sortAndSlice(articles: Article[], count: number): Article[] {
        return articles
            .sort((a, b) => b.score - a.score || new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, count);
    }

    /**
     * 各フィードから記事を並列取得し、パース・カテゴリ判定・スコアリングを行うコアロジック。
     * @param interests - ユーザーの興味データ
     * @param ignoreDateLimit - 90日の期間制限を無視するかどうか
     * @returns 正規化された記事オブジェクト의配列
     */
    async fetchAndProcessArticles(interests: Interests, ignoreDateLimit: boolean = false): Promise<Article[]> {
        const scorer = new ScoringService(interests);
        const feeds = this.feedManager.getAllActiveFeeds();
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        const results = await this.rssFetcher.fetchAll(feeds);
        const allArticles: Article[] = [];

        for (const res of results) {
            if (!res.success) {
                await this.feedManager.reportFailure(res.category, res.url);
                continue;
            }
            this.feedManager.reportSuccess(res.category, res.url);

            if (res.items) {
                for (const item of res.items) {
                    const record = item as Record<string, unknown>;
                    const pubDate = new Date(String(record.isoDate || record.pubDate || ''));
                    
                    // 90日以上前の古い記事は原則として除外（フォールバック時以外）
                    if (!ignoreDateLimit && pubDate < ninetyDaysAgo) continue;

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
                        date: record.isoDate || record.pubDate,
                        img: this.enrichmentService.extractBasicImage(record),
                        language: language
                    }));
                }
            }
        }
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
