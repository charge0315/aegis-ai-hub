import { GeminiService } from './GeminiService';
import { RSSFetcher } from './RSSFetcher';
import { FeedManager } from './FeedManager';
import { Interests } from '../models/Schemas';

interface SuggestedSite {
    name: string;
    url: string;
    category: string;
    reason?: string;
    lang?: 'ja' | 'en';
}

interface EvolutionProposals {
    sites: SuggestedSite[];
    failedSites: (SuggestedSite & { error: string })[];
    brands: { value: string; category: string; reason: string }[];
    keywords: { value: string; category: string; reason: string }[];
    modelName?: string;
}

/**
 * AIを活用して新しいニュースソースを発見し、有効性を検証するサービス。
 */
export class DiscoveryService {
    private geminiService: GeminiService;
    private rssFetcher: RSSFetcher;
    private feedManager: FeedManager;

    /**
     * @param geminiService 
     * @param rssFetcher 
     * @param feedManager 
     */
    constructor(geminiService: GeminiService, rssFetcher: RSSFetcher, feedManager: FeedManager) {
        this.geminiService = geminiService;
        this.rssFetcher = rssFetcher;
        this.feedManager = feedManager;
    }

    /**
     * 興味リストに基づき新しいサイトを探索し、有効なものを設定に追加します。
     * @param interests 
     */
    async run(interests: Interests): Promise<SuggestedSite[]> {
        console.log("[DiscoveryService] サイト探索プロセスを開始します...");
        
        // 1. Gemini にサイトを提案させる
        let suggestedSites: SuggestedSite[] = await this.geminiService.discoverSites(interests);
        console.log(`[DiscoveryService] AIから ${suggestedSites.length} 件のサイト提案がありました。`);

        // 日本語ソースが少ないカテゴリを特定
        const categoriesWithFewFeeds = Object.keys(interests.categories).filter(cat => {
            const activeCount = this.feedManager.getActiveFeeds(cat).length;
            return activeCount < 2;
        });

        if (categoriesWithFewFeeds.length > 0) {
            console.log(`[DiscoveryService] 以下のカテゴリでソースが不足しているため、英語ソースを探索します: ${categoriesWithFewFeeds.join(', ')}`);
            try {
                const englishSites = await this.geminiService.discoverEnglishSites(interests, categoriesWithFewFeeds);
                console.log(`[DiscoveryService] 英語サイト ${englishSites.length} 件を提案リストに追加しました。`);
                suggestedSites = [...suggestedSites, ...englishSites];
            } catch (err) {
                console.error("[DiscoveryService] 英語サイトの探索に失敗しました:", err);
            }
        }

        const validFeeds: SuggestedSite[] = [];
        const existingUrls = this.feedManager.getAllActiveFeeds().map(f => f.url);

        // 2. 提案された各サイトの有効性を検証
        for (const site of suggestedSites) {
            if (existingUrls.includes(site.url)) {
                console.log(`[DiscoveryService] スキップ: ${site.name} は既に登録済みです。`);
                continue;
            }

            console.log(`[DiscoveryService] 検証中: ${site.name} (${site.url})`);
            try {
                const items = await this.rssFetcher.fetch(site.url);
                if (items && items.length > 0) {
                    console.log(`[DiscoveryService] OK: ${site.name} は有効なRSSフィードです。 (${items.length}件の記事を確認)`);
                    validFeeds.push(site);
                } else {
                    console.log(`[DiscoveryService] NG: ${site.name} から記事を取得できませんでした。`);
                }
            } catch (e: unknown) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                console.log(`[DiscoveryService] NG: ${site.name} 検証中にエラーが発生しました: ${errorMessage}`);
            }
        }

        // 3. 有効なフィードを feed_config.json に追加
        if (validFeeds.length > 0) {
            for (const feed of validFeeds) {
                await this.feedManager.addFeed(feed.category, feed.url, this.rssFetcher, feed.name);
            }
            console.log(`[DiscoveryService] 完了: ${validFeeds.length} 件の新しいフィードを登録しました。`);
        } else {
            console.log("[DiscoveryService] 今回新しく追加されたフィードはありません。");
        }

        return validFeeds;
    }

    /**
     * サイトの疎通確認を含めた、総合的な進化提案を取得します。
     */
    async getProposals(interests: Interests): Promise<EvolutionProposals> {
        console.log("[DiscoveryService] 総合進化案の生成を開始します...");
        const result = await this.geminiService.getEvolutionProposals(interests);

        const validatedSites: SuggestedSite[] = [];
        const failedSites: (SuggestedSite & { error: string })[] = [];

        // サイトの健康診断 (RSS疎通確認)
        if (result.sites) {
            for (const site of result.sites) {
                console.log(`[DiscoveryService] フィード検証中: ${site.name} (${site.url})`);
                try {
                    const items = await this.rssFetcher.fetch(site.url);
                    if (items && items.length > 0) {
                        console.log(`[DiscoveryService] 検証成功: ${site.name} (${items.length} 記事)`);
                        validatedSites.push(site);
                    } else {
                        throw new Error("記事が見つかりませんでした。");
                    }
                } catch (e: unknown) {
                    const errorMessage = e instanceof Error ? e.message : String(e);
                    console.warn(`[DiscoveryService] 検証失敗: ${site.name} - ${errorMessage}`);
                    failedSites.push({ ...site, error: errorMessage });
                }
            }
        }

        return {
            sites: validatedSites,
            failedSites: failedSites,
            brands: result.brands || [],
            keywords: result.keywords || [],
            modelName: result.modelName
        };
    }
}
