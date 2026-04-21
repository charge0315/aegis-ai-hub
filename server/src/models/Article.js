/**
 * 記事データを表現するクラス
 * RSSフィードからの生データを統一フォーマットに変換・バリデーションします。
 */
export class Article {
    constructor(data) {
        this.title = data.title || "Untitled";
        this.link = data.link || "";
        this.desc = this.sanitizeDescription(data.desc || data.contentSnippet || "");
        this.brand = data.brand || "News";
        this.score = data.score || 5;
        this.img = data.img || null;
        this.date = data.date || new Date().toISOString();
        this.category = data.category || "未分類";
    }

    /**
     * 説明文からHTMLタグを除去し、適切な長さに切り詰めます。
     */
    sanitizeDescription(text) {
        if (!text) return "";
        return text.replace(/<[^>]*>?/gm, '').slice(0, 150) + (text.length > 150 ? '...' : '');
    }

    /**
     * ダッシュボード用のプレーンなオブジェクトに変換します。
     */
    toJSON() {
        return {
            title: this.title,
            link: this.link,
            desc: this.desc,
            brand: this.brand,
            score: this.score,
            img: this.img,
            date: this.date,
            category: this.category
        };
    }
}
