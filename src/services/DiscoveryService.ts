import type { GeminiService } from './GeminiService';
import type { RSSFetcher } from './RSSFetcher';
import type { FeedManager } from './FeedManager';
import type { Interests } from '../models/Schemas';

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
}

/**
 * AIを活用して新しいニュースソースを発見し、有効性を検証するサービス。
 */
export class DiscoveryService {
  private geminiService: GeminiService;
  private rssFetcher: RSSFetcher;
  private feedManager: FeedManager;

  constructor(geminiService: GeminiService, rssFetcher: RSSFetcher, feedManager: FeedManager) {
    this.geminiService = geminiService;
    this.rssFetcher = rssFetcher;
    this.feedManager = feedManager;
  }

  /**
   * APIキーを更新します。
   */
  public updateApiKey(apiKey: string): void {
    this.geminiService.updateApiKey(apiKey);
  }

  async run(interests: Interests): Promise<SuggestedSite[]> {
    console.log("[DiscoveryService] サイト探索プロセスを開始します...");

    let suggestedSites: SuggestedSite[] = await this.geminiService.discoverSites(interests) as unknown as SuggestedSite[];
    console.log(`[DiscoveryService] AIから ${suggestedSites.length} 件のサイト提案がありました。`);

    // 日本語ソースが少ないカテゴリを特定
    const categoriesWithFewFeeds = Object.keys(interests.categories).filter(cat => {
      const activeCount = this.feedManager.getActiveFeeds(cat).length;
      return activeCount < 2;
    });

    if (categoriesWithFewFeeds.length > 0) {
      try {
        const englishSites = await this.geminiService.discoverEnglishSites(interests, categoriesWithFewFeeds) as unknown as SuggestedSite[];
        suggestedSites = [...suggestedSites, ...englishSites];
      } catch (err) {
        console.error("[DiscoveryService] 英語サイトの探索に失敗しました:", err);
      }
    }

    const validFeeds: SuggestedSite[] = [];
    const existingUrls = this.feedManager.getAllActiveFeeds().map(f => f.url);

    for (const site of suggestedSites) {
      if (existingUrls.includes(site.url)) continue;

      try {
        const items = await this.rssFetcher.fetch(site.url);
        if (items && items.length > 0) {
          validFeeds.push(site);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`[DiscoveryService] NG: ${site.name} - ${msg}`);
      }
    }

    if (validFeeds.length > 0) {
      for (const feed of validFeeds) {
        await this.feedManager.addFeed(feed.category, feed.url, this.rssFetcher, feed.name);
      }
      console.log(`[DiscoveryService] 完了: ${validFeeds.length} 件の新しいフィードを登録しました。`);
    }

    return validFeeds;
  }

  async getProposals(interests: Interests): Promise<EvolutionProposals> {
    let result = await this.geminiService.getEvolutionProposals(interests) as Record<string, unknown>;

    const validatedSites: SuggestedSite[] = [];
    const failedSites: (SuggestedSite & { error: string })[] = [];

    const validate = async (sitesToValidate: SuggestedSite[]) => {
      await Promise.all(sitesToValidate.map(async (site) => {
        try {
          const items = await this.rssFetcher.fetch(site.url);
          if (items && items.length > 0) {
            validatedSites.push(site);
          } else {
            throw new Error("記事が見つかりませんでした。");
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          failedSites.push({ ...site, error: msg });
        }
      }));
    };

    let sites = (result.sites || []) as SuggestedSite[];
    await validate(sites);

    // 1件もヒットしなかった場合のフォールバック（広域検索）
    if (validatedSites.length === 0) {
      console.log("[DiscoveryService] 専門ソースが見つからないため、大手ニュースサイトからのフォールバックを開始します...");
      const fallbackResult = await this.geminiService.getFallbackEvolutionProposals(interests) as Record<string, unknown>;
      const fallbackSites = (fallbackResult.sites || []) as SuggestedSite[];
      await validate(fallbackSites);
    }

    const brands = (result.brands || []) as { value: string; category: string; reason: string }[];
    const keywords = (result.keywords || []) as { value: string; category: string; reason: string }[];

    return { sites: validatedSites, failedSites, brands, keywords };
  }
}
