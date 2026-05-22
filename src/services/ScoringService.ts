import type { Interests } from '../models/Schemas';
import { normalizeCategoryName } from '../utils/normalize';

/**
 * ScoringService: ユーザーの興味関心に基づき、記事のスコアリング、カテゴリ判定、ブランド抽出を行うロジックをカプセル化したサービス。
 * 
 * 役割:
 * - 記事がどの興味カテゴリに属するかを推論（分類）。
 * - ユーザーの興味（キーワード、ブランド）との一致度合に基づき、記事の重要度を数値化。
 * - 記事タイトルから注目のブランド名を抽出（タグ付け）。
 * 
 * 設計思想:
 * - 決定論的な評価: AIによるキュレーションの前に、キーワードマッチングによる高速かつ客観的な重み付けを行い、
 *   ランキングの基礎を形成する。
 * - 柔軟な名寄せ: カテゴリ名の表記揺れを吸収し、データの一貫性を保つ。
 * - 知識の階層化: ユーザー定義の狭い興味を優先しつつ、一般的なブランドリストも活用して網羅性を確保。
 */
export class ScoringService {
    private interests: Interests;
    private categoryKeywords: Record<string, string[]>;
    private commonBrands: string[];

    /**
     * @param interests - ユーザーの興味データ（interests.json）
     */
    constructor(interests: Interests) {
        this.interests = interests;
        
        // カテゴリ判定用の補助キーワード（interests.json から動的に構築し、検索効率を向上）
        this.categoryKeywords = {};
        for (const [catName, info] of Object.entries(interests.categories)) {
            this.categoryKeywords[catName] = [
                ...info.keywords.map(k => k.toLowerCase()),
                ...info.brands.map(b => b.toLowerCase())
            ];
        }

        // 信頼性の高い既知のグローバルブランドリスト（デフォルトの辞書）
        this.commonBrands = [
            'Google', 'AWS', 'Microsoft', 'NVIDIA', 'Apple', 'Sony', 'Technics', 
            'ASUS', 'MSI', 'Razer', 'Anker', 'Boss', 'Fender', 'Gibson', 'Yamaha'
        ];
    }

    /**
     * 記事のタイトルと要約から、最も関連性の高い内部カテゴリを推論します。
     * 
     * @param title - 記事タイトル
     * @param desc - 記事要約
     * @param originalCategory - RSSフィードが提供する元カテゴリ（ジャンル）
     * @returns 判定されたカテゴリ名
     */
    detectCategory(title: string, desc: string, originalCategory: string): string {
        const text = `${title} ${desc}`.toLowerCase();
        
        // 1. キーワードマッチングによる推論（ユーザー定義の興味を最優先）
        for (const [catName, keywords] of Object.entries(this.categoryKeywords)) {
            if (keywords.some(k => text.includes(k))) return catName;
        }
        
        // 2. マッチしない場合、元のカテゴリ名との整合性を確認 (表記揺れや正規化を行ってマッチング)
        const normalizedOriginal = normalizeCategoryName(originalCategory);
        for (const catName of Object.keys(this.interests.categories)) {
            if (normalizeCategoryName(catName) === normalizedOriginal) return catName;
        }
        
        return originalCategory;
    }

    /**
     * ユーザー設定のブランド一致(+10点)とキーワード一致(+8点)に基づき、記事の重要度スコアを算出します。
     * 
     * @param title - 記事タイトル
     * @param desc - 記事要約
     * @param category - 判定済みカテゴリ
     * @returns 算出されたスコア（大きいほどユーザーにとって重要）
     */
    calculateScore(title: string, desc: string, category: string): number {
        let score = 5; // ベーススコア（最低保証値）
        const text = `${title} ${desc}`.toLowerCase();
        const catInfo = this.interests.categories[category] || { brands: [], keywords: [] };

        // ブランドマッチング（高い重み付け: 固有名詞は関心の強い対象であることが多い）
        catInfo.brands.forEach(brand => {
            if (text.includes(brand.toLowerCase())) score += 10;
        });

        // キーワードマッチング（中程度の重み付け: 関連トピックの網羅）
        catInfo.keywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) score += 8;
        });

        return score;
    }

    /**
     * 記事タイトルから象徴的なブランド名（固有名詞）を抽出します。
     * ユーザー設定を優先し、その後一般的なブランドリストから検索します。
     * 
     * @param title - 記事タイトル
     * @returns 抽出されたブランド名（見つからない場合は一般名称としての 'News'）
     */
    extractBrand(title: string): string {
        const lowerTitle = title.toLowerCase();

        // 1. ユーザー設定のブランドから検索
        for (const catName in this.interests.categories) {
            for (const brand of this.interests.categories[catName].brands) {
                if (lowerTitle.includes(brand.toLowerCase())) return brand;
            }
        }

        // 2. 一般的な既知ブランドリストから検索
        for (const brand of this.commonBrands) {
            if (lowerTitle.includes(brand.toLowerCase())) return brand;
        }

        return "News";
    }
}
