import fs from 'fs';
import { ScraperFacade } from '../ScraperFacade.js';
import { DiscoveryService } from '../services/DiscoveryService.js';
import { Interests } from '../models/Schemas.js';

interface TrendSuggestion {
    value: string;
    category: string;
    reason: string;
}

/**
 * システムを自律的に進化させる定期ジョブ。
 * フィードの再構築、興味の整理、新しいトレンドの発見を行います。
 */
export class EvolutionJob {
    private scraper: ScraperFacade;
    private discoveryService: DiscoveryService;
    private interestsPath: string;

    /**
     * @param scraper 
     * @param discoveryService 
     * @param interestsPath 
     */
    constructor(scraper: ScraperFacade, discoveryService: DiscoveryService, interestsPath: string) {
        this.scraper = scraper;
        this.discoveryService = discoveryService;
        this.interestsPath = interestsPath;
    }

    /**
     * 自律進化プロセスを実行します。
     */
    async run(): Promise<void> {
        console.log("==========================================");
        console.log("[EvolutionJob] 自律進化サイクルを開始します...");
        console.log("==========================================");

        try {
            const interests: Interests & { learned_keywords?: Record<string, any> } = JSON.parse(fs.readFileSync(this.interestsPath, 'utf8'));

            // 1. 設定ファイルのクリーニング (重複排除等)
            console.log("[EvolutionJob] ステップ 1: 設定ファイルの整理を実行中...");
            await this.scraper.feedManager.cleanConfig();
            this.cleanInterests(interests);

            // 2. AI による新しいフィードの探索と登録
            console.log("[EvolutionJob] ステップ 2: AI による新しいソースの探索を実行中...");
            await this.discoveryService.run(interests);

            // 3. 最新記事から新しい興味（ブランド・キーワード）を抽出
            console.log("[EvolutionJob] ステップ 3: 最新記事からトレンドを抽出中...");
            // ScraperFacade を通じて最新記事を取得
            const articles = await this.scraper.fetchAndProcessArticles(interests);
            const topArticles = articles.slice(0, 50).map((a: any) => ({ title: a.title, desc: a.desc, brand: a.brand }));
            
            const newSuggestions = await this.scraper.geminiService.analyzeTrends(topArticles, interests) as unknown as TrendSuggestion[];
            if (newSuggestions && newSuggestions.length > 0) {
                console.log(`[EvolutionJob] AI から ${newSuggestions.length} 件の新しい興味提案があります。`);
                this.updateLearnedKeywords(interests, newSuggestions);
            }

            // 4. 結果を保存
            fs.writeFileSync(this.interestsPath, JSON.stringify(interests, null, 2));
            console.log("[EvolutionJob] 自律進化サイクルが正常に完了しました。");

        } catch (e: any) {
            console.error(`[EvolutionJob] エラーが発生しました: ${e.message}`);
        }
    }

    /**
     * interests.json の重複や形式を整理します。
     */
    private cleanInterests(interests: Interests): void {
        for (const catName in interests.categories) {
            const cat = interests.categories[catName];
            cat.brands = [...new Set(cat.brands.filter(b => b))];
            cat.keywords = [...new Set(cat.keywords.filter(k => k))];
        }
    }

    /**
     * AI が見つけた新しいキーワードを「学習済みキーワード」として蓄積します。
     */
    private updateLearnedKeywords(interests: Interests & { learned_keywords?: Record<string, any> }, suggestions: TrendSuggestion[]): void {
        if (!interests.learned_keywords) interests.learned_keywords = {};
        
        suggestions.forEach(s => {
            // 既存のキーワードに含まれていないかチェック
            const existing = interests.categories[s.category]?.keywords || [];
            if (!existing.includes(s.value) && !interests.learned_keywords![s.value]) {
                interests.learned_keywords![s.value] = {
                    category: s.category,
                    reason: s.reason,
                    detectedAt: new Date().toISOString()
                };
                console.log(`[EvolutionJob] 新しい興味を発見: ${s.value} (${s.category})`);
            }
        });
    }
}
