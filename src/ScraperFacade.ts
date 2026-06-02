/**
 * @fileoverview スクレイピングとAI解析のワークフローを統合するファサード
 * 
 * 【設計思想: Façade パターン】
 * フィード取得(RSS)、カテゴリ判定、スコアリング、AIによる要約・推薦といった
 * 「情報のライフサイクル」に関わる複雑なサブシステム群を統合し、
 * 上位のオーケストラレーターやUIに対して「一貫したシンプルな窓口」を提供します。
 * 
 * これにより、内部ロジック（例：RSSライブラリの変更やAIプロンプトの調整）が
 * システム全体に波及するのを防ぎ、結合度を低く保ちます。
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
     * @param _interestsPath - 未使用（将来の拡張用）
     * @param feedsPath - フィード構成ファイルのパス
     * @param dataDir - 画像キャッシュなどのデータ保存先
     */
    constructor(_interestsPath: string, feedsPath: string, dataDir?: string) {
        this.feedManager = new FeedManager(feedsPath);
        this.rssFetcher = new RSSFetcher(20); // 同時実行数を20に制限し、ネットワーク負荷を制御
        this.geminiService = new GeminiService(process.env.GEMINI_API_KEY);
        this.enrichmentService = new EnrichmentService(this.geminiService, dataDir);
    }

    /**
     * AIサービス（Gemini）のAPIキーを更新します。
     * 設定変更時に即座に反映させるためのホットスワップを可能にします。
     */
    public updateApiKey(apiKey: string): void {
        this.geminiService.updateApiKey(apiKey);
    }

    /**
     * AIによる「おすすめ記事」のキュレーションを実行します。
     * 
     * 意図: 単なる新着順ではなく、ユーザーの興味関心（Interests）に基づき、
     * Gemini が文脈を理解した上で選定した「価値の高い情報」を提供します。
     */
    async getRecommendations(interests: Interests): Promise<Article[]> {
        try {
            await this.enrichmentService.init();
            const allArticles = await this.fetchAndProcessArticles(interests);
            // 上位30件を候補としてAIに渡し、コストと精度のバランスを最適化
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
                // AIが新しいリンクを提案した場合などのフォールバック
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

            // 最終候補に対して画像等のメタデータを補完（遅延実行による効率化）
            await this.enrichmentService.enrichAll(recommendedArticles);
            return recommendedArticles;
        } catch (e: unknown) {
            console.error(`[ScraperFacade] Recommendations Error: ${String(e)}`);
            return [];
        }
    }

    /**
     * カテゴリごとに整理されたダッシュボード用データを構築します。
     * 
     * 意図: ユーザーが設定した各カテゴリに対し、十分な鮮度の記事が届くように
     * 「直近90日」と「全期間」の二段構えでフェッチを試みます。
     */
    async getDashboard(interests: Interests): Promise<Record<string, { emoji: string | null, articles: ReturnType<Article['toJSON']>[] }>> {
        console.log(`[ScraperFacade] ダッシュボード構築を開始...`);
        await this.enrichmentService.init();

        const articlesNormal = await this.fetchAndProcessArticles(interests, false);
        
        let articlesExtended: Article[] | null = null;
        const dashboard: Record<string, { emoji: string | null, articles: ReturnType<Article['toJSON']>[] }> = {};
        const categories = Object.keys(interests.categories);

        const seenLinks = new Set<string>();

        for (const catName of categories) {
            const targetClean = normalizeCategoryName(catName);

            let filtered = articlesNormal.filter(a => {
                const isMatch = normalizeCategoryName(a.category) === targetClean;
                if (isMatch) seenLinks.add(a.link);
                return isMatch;
            });

            // 直近記事がない場合のフォールバック（期間制限解除）
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

        // どのカテゴリにも属さなかったが興味に近い記事を「未分類」として救い上げる
        const uncategorizedArticles: Article[] = [];
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

        console.log(`[ScraperFacade] ダッシュボード構築完了`);
        return dashboard;
    }

    /**
     * 全記事のメタデータから共通のパターンを見つけ、新しいトレンドとして提案します。
     */
    async discoverTrends(interests: Interests): Promise<TrendSuggestion[]> {
        try {
            const articles = await this.fetchAndProcessArticles(interests);
            if (articles.length === 0) return [];

            // AIの入力トークン制限を考慮し、上位50件に絞って解析
            const topArticles = articles.slice(0, 50).map(a => ({ title: a.title, desc: a.desc, brand: a.brand }));
            const suggestions = await this.geminiService.analyzeTrends(topArticles, interests);
            return suggestions as unknown as TrendSuggestion[];
        } catch (e: unknown) {
            console.error(`[ScraperFacade] discoverTrends Error: ${String(e)}`);
            return [];
        }
    }

    /**
     * 記事をスコア順（同一スコアなら日付順）でソートし、指定件数抽出します。
     */
    private _sortAndSlice(articles: Article[], count: number): Article[] {
        return articles
            .sort((a, b) => b.score - a.score || new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, count);
    }

    /**
     * 記事が0件の場合に期間制限を解除するフォールバック機能付きの取得メソッド。
     */
    async fetchAndProcessArticlesWithFallback(interests: Interests): Promise<Article[]> {
        let articles = await this.fetchAndProcessArticles(interests, false);
        if (articles.length === 0) {
            articles = await this.fetchAndProcessArticles(interests, true);
        }
        return articles;
    }

    /**
     * 各フィードから記事を並列取得し、スコアリングとカテゴリ判定を行います。
     * 
     * 意図: 大量のフィードを効率よく取得しつつ、ScoringService を利用して
     * ユーザーにとっての価値（スコア）を数値化します。
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
        const seenLinks = new Set<string>();

        for (const res of results) {
            // 取得失敗時は FeedManager に報告し、将来的なフィードの「健康診断」に役立てる
            if (!res.success || !res.items) {
                if (!res.success) await this.feedManager.reportFailure(res.category, res.url);
                continue;
            }
            
            this.feedManager.reportSuccess(res.category, res.url);

            for (const item of res.items) {
                try {
                    const record = item as Record<string, unknown>;
                    const link = String(record.link || '');
                    
                    // 重複URLの排除。複数のフィードが同じ記事を配信している場合の副作用（情報の重複）を防ぐ
                    if (!link || seenLinks.has(link)) continue;
                    seenLinks.add(link);

                    const pubDateStr = String(record.isoDate || record.pubDate || '');
                    const pubDate = new Date(pubDateStr);
                    const isDateValid = !isNaN(pubDate.getTime());

                    // 鮮度管理: ignoreDateLimit が無効な場合、古い記事はスキップ
                    if (!ignoreDateLimit && isDateValid && pubDate.getTime() < ninetyDaysAgo.getTime()) continue;

                    const title = String(record.title || '');
                    const snippet = String(record.contentSnippet || record.description || '');
                    
                    // カテゴリとスコアの判定ロジックを委譲
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
                    // 個別の記事処理失敗が、プロセス全体の停止に繋がらないようにガード
                    continue;
                }
            }
        }

        console.log(`[ScraperFacade] Processed ${allArticles.length} articles.`);
        return allArticles.sort((a, b) => b.score - a.score);
    }

    /**
     * 言語判定ロジック。
     * 日本語と英語を区別し、UIでの表示最適化やAI解析のヒントとして利用します。
     */
    private _detectLanguage(title: string, snippet: string): 'ja' | 'en' | 'other' {
        const text = title + snippet;
        const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
        if (hasKana) return 'ja';
        const hasKanji = /[\u4E00-\u9FAF]/.test(text);
        if (hasKanji) return 'other';
        return 'en';
    }
}
