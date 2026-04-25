/**
 * ユーザーの興味関心に基づき、記事のスコアリング、カテゴリ判定、ブランド抽出を行うロジックをカプセル化したサービス。
 */
export class ScoringService {
    /**
     * @param {Object} interests - ユーザーの興味データ（interests.json）
     */
    constructor(interests) {
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
     * @param {string} title - 記事タイトル
     * @param {string} desc - 記事要約
     * @param {string} originalCategory - RSSフィードが提供する元カテゴリ
     * @returns {string} 判定されたカテゴリ名
     */
    detectCategory(title, desc, originalCategory) {
        const text = `${title} ${desc}`.toLowerCase();
        
        // 興味設定にある全カテゴリに対してマッチングを確認
        for (const [catName, keywords] of Object.entries(this.categoryKeywords)) {
            if (keywords.some(k => text.includes(k))) return catName;
        }
        
        return originalCategory;
    }

    /**
     * ユーザー設定のブランド一致(+10点)とキーワード一致(+8点)に基づき、記事の重要度スコアを算出します。
     * @param {string} title - 記事タイトル
     * @param {string} desc - 記事要約
     * @param {string} category - 判定済みカテゴリ
     * @returns {number} 算出されたスコア
     */
    calculateScore(title, desc, category) {
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
     * @param {string} title - 記事タイトル
     * @returns {string} 抽出されたブランド名（見つからない場合は 'News'）
     */
    extractBrand(title) {
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
