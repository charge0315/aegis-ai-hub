import fs from 'fs/promises';
import { type ScraperFacade } from '../ScraperFacade';
import { type DiscoveryService } from '../services/DiscoveryService';
import { type Interests } from '../models/Schemas';
import { type TrendSuggestion } from '../types';

/**
 * EvolutionJob: システムを自律的に進化させるバックグラウンド・定期ジョブ。
 * 
 * 役割:
 * - ユーザーの興味関心の変化や世の中のトレンドを捉え、システム構成（フィード、キーワード）を自動更新する。
 * - 「収集 -> 分析 -> 学習 -> 適用」の自律サイクルを実現。
 * 
 * 設計思想:
 * - 自律学習: AIが最新記事から抽出したトレンド（ブランド、キーワード）を「学習済みキーワード」として永続化。
 * - 構成の最適化: 重複した設定の排除や、AIによる新規フィード探索を自動化し、メンテナンスフリーな環境を維持。
 * - 安全な永続化: 処理の各ステップでログを出力し、最終的な結果のみをファイルに書き戻すことでデータ整合性を確保。
 */
export class EvolutionJob {
    private scraper: ScraperFacade;
    private discoveryService: DiscoveryService;
    private interestsPath: string;

    /**
     * @param scraper 全体的なスクレイピング・AI機能へのアクセスを提供するファサード。
     * @param discoveryService 新しいフィードURLを発掘するための専門サービス。
     * @param interestsPath ユーザーの興味設定ファイル(interests.json)の絶対パス。
     */
    constructor(scraper: ScraperFacade, discoveryService: DiscoveryService, interestsPath: string) {
        this.scraper = scraper;
        this.discoveryService = discoveryService;
        this.interestsPath = interestsPath;
    }

    /**
     * 自律進化サイクルを一周実行します。
     * 通常、アプリ起動時や一定時間ごとにバックグラウンドで呼び出されます。
     */
    async run(): Promise<void> {
        console.log("==========================================");
        console.log("[EvolutionJob] 自律進化サイクルを開始します...");
        console.log("==========================================");

        try {
            const content = await fs.readFile(this.interestsPath, 'utf8');
            const interests: Interests = JSON.parse(content);

            // 1. 設定ファイルのクリーニング (重複排除等)
            // ノイズを減らし、AIによる推論の精度を高めるための前処理。
            console.log("[EvolutionJob] ステップ 1: 設定ファイルの整理を実行中...");
            await this.scraper.feedManager.cleanConfig();
            this.cleanInterests(interests);

            // 2. AI による新しいフィードの探索と登録
            // GeminiServiceを活用して、現在のカテゴリに合致する未知のRSSソースをインターネットから探し出す。
            console.log("[EvolutionJob] ステップ 2: AI による新しいソースの探索を実行中...");
            await this.discoveryService.run(interests);

            // 3. 最新記事から新しい興味（ブランド・キーワード）を抽出
            // 流れてきたニュース記事を分析し、ユーザーが気にするであろう新しい固有名詞や概念を特定。
            console.log("[EvolutionJob] ステップ 3: 最新記事からトレンドを抽出中...");
            const newSuggestions = await this.scraper.discoverTrends(interests);
            
            if (newSuggestions && newSuggestions.length > 0) {
                console.log(`[EvolutionJob] AI から ${newSuggestions.length} 件の新しい興味提案があります。`);
                this.updateLearnedKeywords(interests, newSuggestions);
            }

            // 4. 結果を保存
            // 整理・学習された最新の状態をファイルに保存。
            await fs.writeFile(this.interestsPath, JSON.stringify(interests, null, 2), 'utf8');
            console.log("[EvolutionJob] 自律進化サイクルが正常に完了しました。");

        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error(`[EvolutionJob] エラーが発生しました: ${msg}`);
        }
    }

    /**
     * interests.json の重複や形式を整理します。
     * 配列内の空要素の削除やセット（重複排除）を適用。
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
     * 
     * 設計意図:
     * - 即座にメインカテゴリに追加するのではなく「学習済み」バッファに入れることで、
     *   ユーザーによる確認（昇格）を可能にし、自律性と制御のバランスを取る。
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
                    type: s.type,
                    confidence: s.confidence,
                    context: s.context,
                    detectedAt: new Date().toISOString()
                };
                console.log(`[EvolutionJob] 新しい興味を発見: ${s.value} (${s.category}) [Confidence: ${s.confidence}%]`);
            }
        });
    }
}
