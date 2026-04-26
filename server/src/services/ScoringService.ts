import { Interests } from '../models/Schemas.js';

/**
 * ユーザーの興味関心に基づき、記事のスコアリング、カテゴリ判定、ブランド抽出を行うロジックをカプセル化したサービス。
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
        
        // カテゴリ判定用の補助キーワード（interests.json から動的に構築）
        this.categoryKeywords = {};
        for (const [catName, info] of Object.entries(interests.categories)) {
            this.categoryKeywords[catName] = [
                ...info.keywords.map(k => k.toLowerCase()),
                ...info.brands.map(b => b.toLowerCase())
            ];
        }

        // 信頼性の高い既知のブランドリスト
        this.commonBrands = [
            'Google', 'AWS', 'Microsoft', 'NVIDIA', 'Apple', 'Sony', 'Technics', 
            'ASUS', 'MSI', 'Razer', 'Anker', 'Boss', 'Fender', 'Gibson', 'Yamaha'
        ];
    }

    /**
     * 記事のタイトルと要約から、最も関連性の高い内部カテゴリを推論します。
     * @param title - 記事タイトル
     * @param desc - 記事要約
     * @param originalCategory - RSSフィードが提供する元カテゴリ
     * @returns 判定されたカテゴリ名
     */
    detectCategory(title: string, desc: string, originalCategory: string): string {
        const text = `${title} ${desc}`.toLowerCase();
        
        // 興味設定にある全カテゴリに対してマッチングを確認
        for (const [catName, keywords] of Object.entries(this.categoryKeywords)) {
            if (keywords.some(k => text.includes(k))) return catName;
        }
        
        return originalCategory;
    }

    /**
     * ユーザー設定のブランド一致(+10点)とキーワード一致(+8点)に基づき、記事の重要度スコアを算出します。
     * @param title - 記事タイトル
     * @param desc - 記事要約
     * @param category - 判定済みカテゴリ
     * @returns 算出されたスコア
     */
    calculateScore(title: string, desc: string, category: string): number {
        let score = 5; // ベーススコア
        const text = `${title} ${desc}`.toLowerCase();
        const catInfo = this.interests.categories[category] || { brands: [], keywords: [] };

        // ブランドマッチング（高い重み付け）
        catInfo.brands.forEach(brand => {
            if (text.includes(brand.toLowerCase())) score += 10;
        });

        // キーワードマッチング（中程度の重み付け）
        catInfo.keywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) score += 8;
        });

        return score;
    }

    /**
     * 記事タイトルからブランド名（固有名詞）を抽出します。
     * ユーザー設定を優先し、その後一般的なブランドリストから検索します。
     * @param title - 記事タイトル
     * @returns 抽出されたブランド名（見つからない場合は 'News'）
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
