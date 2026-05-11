import fs from 'fs/promises';
import { type ScraperFacade } from '../ScraperFacade';
import { type DiscoveryService } from '../services/DiscoveryService';
import { type Interests } from '../models/Schemas';
import { type TrendSuggestion } from '../types';

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
            const content = await fs.readFile(this.interestsPath, 'utf8');
            const interests: Interests = JSON.parse(content);

            // 1. 設定ファイルのクリーニング (重複排除等)
            console.log("[EvolutionJob] ステップ 1: 設定ファイルの整理を実行中...");
            await this.scraper.feedManager.cleanConfig();
            this.cleanInterests(interests);

            // 2. AI による新しいフィードの探索と登録
            console.log("[EvolutionJob] ステップ 2: AI による新しいソースの探索を実行中...");
            await this.discoveryService.run(interests);

            // 3. 最新記事から新しい興味（ブランド・キーワード）を抽出
            console.log("[EvolutionJob] ステップ 3: 最新記事からトレンドを抽出中...");
            const newSuggestions = await this.scraper.discoverTrends(interests);
            
            if (newSuggestions && newSuggestions.length > 0) {
                console.log(`[EvolutionJob] AI から ${newSuggestions.length} 件の新しい興味提案があります。`);
                this.updateLearnedKeywords(interests, newSuggestions);
            }

            // 4. 結果を保存
            await fs.writeFile(this.interestsPath, JSON.stringify(interests, null, 2), 'utf8');
            console.log("[EvolutionJob] 自律進化サイクルが正常に完了しました。");

        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error(`[EvolutionJob] エラーが発生しました: ${msg}`);
        }
    }

    /**
     * interests.json の重複や形式を整理します。
     */
    private cleanInterests(interests: Interests): void {
        if (!interests.categories) return;
        for (const catName in interests.categories) {
            const cat = interests.categories[catName];
            cat.brands = [...new Set(cat.brands.filter(b => b))];
            cat.keywords = [...new Set(cat.keywords.filter(k => k))];
        }
    }

    /**
     * AI が見つけた新しいキーワードを「学習済みキーワード」として蓄積します。
     */
    private updateLearnedKeywords(interests: Interests, suggestions: TrendSuggestion[]): void {
        if (!interests.learned_keywords) interests.learned_keywords = {};
        
        suggestions.forEach(s => {
            // 既存のキーワードに含まれていないかチェック
            const category = interests.categories[s.category];
            const existing = category ? (category.keywords || []) : [];
            if (!existing.includes(s.value) && !interests.learned_keywords![s.value]) {
                interests.learned_keywords![s.value] = {
                    category: s.category,
                    reason: s.reason,
                    type: s.type as any, // 互換性のためのキャスト
                    confidence: s.confidence,
                    context: s.context,
                    detectedAt: new Date().toISOString()
                };
                console.log(`[EvolutionJob] 新しい興味を発見: ${s.value} (${s.category}) [Confidence: ${s.confidence}%]`);
            }
        });
    }
}
