/**
 * AIを活用して新しいニュースソースを発見し、有効性を検証するサービス。
 */
export class DiscoveryService {
    geminiService;
    rssFetcher;
    feedManager;
    /**
     * @param geminiService
     * @param rssFetcher
     * @param feedManager
     */
    constructor(geminiService, rssFetcher, feedManager) {
        this.geminiService = geminiService;
        this.rssFetcher = rssFetcher;
        this.feedManager = feedManager;
    }
    /**
     * 興味リストに基づき新しいサイトを探索し、有効なものを設定に追加します。
     * @param interests
     */
    async run(interests) {
        console.log("[DiscoveryService] サイト探索プロセスを開始します...");
        // 1. Gemini にサイトを提案させる
        const suggestedSites = await this.geminiService.discoverSites(interests);
        console.log(`[DiscoveryService] AIから ${suggestedSites.length} 件のサイト提案がありました。`);
        const validFeeds = [];
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
                }
                else {
                    console.log(`[DiscoveryService] NG: ${site.name} から記事を取得できませんでした。`);
                }
            }
            catch (e) {
                console.log(`[DiscoveryService] NG: ${site.name} 検証中にエラーが発生しました: ${e.message}`);
            }
        }
        // 3. 有効なフィードを feed_config.json に追加
        if (validFeeds.length > 0) {
            for (const feed of validFeeds) {
                this.feedManager.addFeed(feed.category, feed.url, feed.name);
            }
            console.log(`[DiscoveryService] 完了: ${validFeeds.length} 件の新しいフィードを登録しました。`);
        }
        else {
            console.log("[DiscoveryService] 今回新しく追加されたフィードはありません。");
        }
        return validFeeds;
    }
    /**
     * サイトの疎通確認を含めた、総合的な進化提案を取得します。
     */
    async getProposals(interests) {
        console.log("[DiscoveryService] 総合進化案の生成を開始します...");
        const result = await this.geminiService.getEvolutionProposals(interests);
        const validatedSites = [];
        const failedSites = [];
        // サイトの健康診断 (RSS疎通確認)
        if (result.sites) {
            for (const site of result.sites) {
                console.log(`[DiscoveryService] フィード検証中: ${site.name} (${site.url})`);
                try {
                    const items = await this.rssFetcher.fetch(site.url);
                    if (items && items.length > 0) {
                        console.log(`[DiscoveryService] 検証成功: ${site.name} (${items.length} 記事)`);
                        validatedSites.push(site);
                    }
                    else {
                        throw new Error("記事が見つかりませんでした。");
                    }
                }
                catch (e) {
                    console.warn(`[DiscoveryService] 検証失敗: ${site.name} - ${e.message}`);
                    failedSites.push({ ...site, error: e.message });
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
