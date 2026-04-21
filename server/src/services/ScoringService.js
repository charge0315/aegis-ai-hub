/**
 * ユーザーの興味（interests.json）に基づき、記事のスコアリングとカテゴリ判定を行うサービス
 */
export class ScoringService {
    constructor(interests) {
        this.interests = interests;
        this.musicKeys = ['ギター', 'エフェクター', 'アンプ', 'イヤホン', 'ヘッドホン', 'オーディオ', 'dac', 'daw', '楽器', 'technics', 'sony', 'panasonic', 'dtm', 'midi', 'シンセサイザー'];
        this.aiKeys = [' ai ', 'llm', 'gpt', 'openai', 'claude', 'npu', '機械学習', 'copilot', 'stable diffusion'];
    }

    /**
     * 記事の内容から、最も適切なカテゴリを判定します。
     */
    detectCategory(title, desc, originalCategory) {
        const text = (title + desc).toLowerCase();
        
        if (this.musicKeys.some(k => text.includes(k))) return '音楽・ギター・DTM';
        if (text.includes('ロードバイク') || text.includes('自転車') || text.includes('シマノ')) return 'ロードバイク';
        if (this.aiKeys.some(k => text.includes(k))) return 'AI・ソフトウェア';
        if (text.includes('ゲーム') || text.includes('ps5') || text.includes('任天堂') || text.includes('switch')) return 'ゲーム';
        
        return originalCategory;
    }

    /**
     * ブランド一致(+10)とキーワード一致(+8)に基づいてスコアを算出します。
     */
    calculateScore(title, desc, category) {
        let score = 5;
        const text = (title + desc).toLowerCase();
        const catInfo = this.interests.categories[category] || { brands: [], keywords: [] };

        catInfo.brands.forEach(brand => {
            if (text.includes(brand.toLowerCase())) score += 10;
        });

        catInfo.keywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) score += 8;
        });

        return score;
    }

    /**
     * 記事タイトルからブランド名を抽出します。
     */
    extractBrand(title) {
        const lowerTitle = title.toLowerCase();
        // ユーザー設定のブランドから検索
        for (const catName in this.interests.categories) {
            for (const brand of this.interests.categories[catName].brands) {
                if (lowerTitle.includes(brand.toLowerCase())) return brand;
            }
        }
        // 一般的なブランドリスト
        const commonBrands = ['Google', 'AWS', 'Microsoft', 'NVIDIA', 'Apple', 'Sony', 'Technics', 'ASUS', 'MSI', 'Razer', 'Anker', 'Boss', 'Fender', 'Gibson'];
        for (const b of commonBrands) {
            if (lowerTitle.includes(b.toLowerCase())) return b;
        }
        return "News";
    }
}
