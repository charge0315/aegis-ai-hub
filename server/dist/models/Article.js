import { z } from 'zod';
/**
 * 記事データの厳密なバリデーションスキーマ定義。
 * データの整合性を保証し、ランタイムエラーを未然に防ぎます。
 */
export const ArticleSchema = z.object({
    title: z.string().min(1).default("Untitled"),
    link: z.string().url().default(""),
    desc: z.string().default(""),
    brand: z.string().default("News"),
    score: z.number().int().default(5),
    img: z.string().nullable().default(null),
    date: z.string().datetime({ offset: true }).or(z.string()).default(() => new Date().toISOString()),
    category: z.string().default("未分類"),
    geminiReason: z.string().optional()
});
/**
 * 個別の記事データを表現し、サニタイズ処理をカプセル化するクラス。
 */
export class Article {
    title;
    link;
    desc;
    brand;
    score;
    img;
    date;
    category;
    geminiReason;
    /**
     * @param data - バリデーション前の生記事データ
     */
    constructor(data) {
        // Zodによる型変換とデフォルト値の適用
        const validated = ArticleSchema.parse(data);
        this.title = validated.title;
        this.link = validated.link;
        this.desc = validated.desc;
        this.brand = validated.brand;
        this.score = validated.score;
        this.img = validated.img;
        this.date = validated.date;
        this.category = validated.category;
        this.geminiReason = validated.geminiReason;
        // 読みやすさ向上のためのサニタイズ
        this.desc = this._sanitizeDescription(this.desc);
    }
    /**
     * 説明文からHTMLタグを除去し、指定文字数でトリミングします。
     * @param text - サニタイズ対象の文字列
     * @returns クリーンな要約テキスト
     * @private
     */
    _sanitizeDescription(text) {
        if (!text)
            return "";
        // HTMLタグの除去と長さの制限
        const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
        return cleanText.length > 150
            ? cleanText.slice(0, 150) + '...'
            : cleanText;
    }
    /**
     * シリアライズ用の単純なオブジェクトを返します。
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
            category: this.category,
            geminiReason: this.geminiReason
        };
    }
}
