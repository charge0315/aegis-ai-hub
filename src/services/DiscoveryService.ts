import type { GeminiService } from './GeminiService';
import type { RSSFetcher } from './RSSFetcher';
import type { FeedManager } from './FeedManager';
import type { Interests, FeedConfig, InterestCategory } from '../models/Schemas';

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
 * DiscoveryService: AIを活用して新しいニュースソースを発掘し、その有効性を自動検証するサービス。
 * 
 * 役割:
 * - ユーザーの現在の興味設定に基づき、AI(Gemini)に新しいRSSフィードを提案させる。
 * - 提案されたURLが実際に機能するか（RSSとしてパース可能か）を非同期で検証。
 * - 多言語対応: 国内ソースが不足しているカテゴリに対して、自動的に海外（英語圏）のソースを探索。
 * - カテゴリの再構成や設定の翻訳など、システム構成の大きな変更を支援。
 * 
 * 設計思想:
 * - 信頼性の確保: AIの提案をそのまま信じず、必ずRSSFetcherによる実地検証を行う。
 * - 多様性の促進: フィルターバブルに陥らないよう、必要に応じて海外ソースを混ぜる戦略を採用。
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
   * AIによるカテゴリ再編の提案を取得します。
   * カテゴリの統合、リネーミング、およびフィードの再割り当てをAIに考案させます。
   */
  async getRestructureProposal(interests: Interests, targetCount: number = 10, language: string = 'ja'): Promise<{ categories: Record<string, InterestCategory>, feedConfig: FeedConfig }> {
    const currentFeeds = this.feedManager.config;
    return await this.geminiService.getRestructureProposal(interests, currentFeeds, targetCount, language);
  }

  /**
   * カテゴリ名や説明など、興味設定全体の多言語翻訳を行います。
   */
  async translateInterests(interests: Interests): Promise<{ interests: Interests, feedConfig: FeedConfig }> {
    return await this.geminiService.translateInterests(interests);
  }

  /**
   * APIキーを更新します。
   */
  public updateApiKey(apiKey: string): void {
    this.geminiService.updateApiKey(apiKey);
  }

  /**
   * 新しいサイトの探索サイクルを実行します。
   */
  async run(interests: Interests): Promise<SuggestedSite[]> {
    console.log("[DiscoveryService] サイト探索プロセスを開始します...");

    let suggestedSites: SuggestedSite[] = await this.geminiService.discoverSites(interests) as unknown as SuggestedSite[];
    console.log(`[DiscoveryService] AIから ${suggestedSites.length} 件のサイト提案がありました。`);

    // 日本語ソースが少ないカテゴリを特定（情報の偏りを防ぐためのロジック）
    const categoriesWithFewFeeds = Object.keys(interests.categories).filter(cat => {
      const activeCount = this.feedManager.getActiveFeeds(cat).length;
      return activeCount < 2;
    });

    // ソースが足りない場合は英語サイトも探索対象に含める
    if (categoriesWithFewFeeds.length > 0) {
      try {
        const englishSites = await this.geminiService.discoverEnglishSites(interests, categoriesWithFewFeeds) as unknown as SuggestedSite[];
        suggestedSites = [...suggestedSites, ...englishSites];
      } catch (err) {
        console.error("[DiscoveryService] 英語サイトの探索に失敗しました:", err);
      }
    }

    const existingUrls = this.feedManager.getAllActiveFeeds().map(f => f.url);
    const sitesToValidate = suggestedSites.filter(s => !existingUrls.includes(s.url));

    // 並列検証: 提案されたURLが本当に生きているかチェック
    const validFeeds: SuggestedSite[] = [];
    await Promise.all(sitesToValidate.map(async (site) => {
      try {
        const items = await this.rssFetcher.fetch(site.url);
        if (items && items.length > 0) {
          validFeeds.push(site);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`[DiscoveryService] NG: ${site.name} - ${msg}`);
      }
    }));

    // 検証済みフィードを自動登録
    if (validFeeds.length > 0) {
      for (const feed of validFeeds) {
        await this.feedManager.addFeed(feed.category, feed.url, this.rssFetcher);
      }
      console.log(`[DiscoveryService] 完了: ${validFeeds.length} 件の新しいフィードを登録しました。`);
    }

    return validFeeds;
  }

  /**
   * 提案されたフィード群を検証し、有効なもの（記事が取得できるもの）だけを抽出して返します。
   */
  async validateSuggestedFeeds(sites: SuggestedSite[]): Promise<SuggestedSite[]> {
    const validatedSites: SuggestedSite[] = [];
    
    await Promise.all(sites.map(async (site) => {
      try {
        const items = await this.rssFetcher.fetch(site.url);
        if (items && items.length > 0) {
          validatedSites.push(site);
        }
      } catch {
        console.log(`[DiscoveryService] Skip invalid suggested feed: ${site.url}`);
      }
    }));

    return validatedSites;
  }

  /**
   * 進化提案（サイト、ブランド、キーワード）の一括取得と検証。
   */
  async getProposals(interests: Interests): Promise<EvolutionProposals> {
    const result = await this.geminiService.getEvolutionProposals(interests) as Record<string, unknown>;

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

    const sites = (result.sites || []) as SuggestedSite[];
    await validate(sites);

    // 1件もヒットしなかった場合のフォールバック（広域検索）
    // ニッチなカテゴリでも何かしらの情報を得られるよう、大手サイトの汎用セクションをAIに探させる。
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
