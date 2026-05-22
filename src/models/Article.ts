/**
 * @file Article.ts
 * @description システム内で流通する「記事」情報のデータモデルとバリデーション。
 * RSSやWebスクレイピング, AIによって生成された非構造な情報を, 
 * UIやDBが処理可能な一貫した形式（ArticleType）へと正規化する役割を担う。
 * @dependencies
 * - zod: ランタイムバリデーションとデフォルト値付与
 */

import { z } from 'zod';

/**
 * 記事データの厳密なバリデーションスキーマ定義。
 * 多様なソースから流入するデータに対してデフォルト値を設定し、
 * システム全体で「値の存在」を前提とした安全なコーディングを可能にする。
 */
export const ArticleSchema = z.object({
    /** 記事のタイトル。空文字は許容せず、取得失敗時は "Untitled" を設定 */
    title: z.string().min(1).default("Untitled"),
    /** 記事のパーマリンクURL。 */
    link: z.string().url().default(""),
    /** 記事の概要・説明文。 */
    desc: z.string().default(""),
    /** 配信元のブランド名（例: TechCrunch, GitHub Blogなど）。 */
    brand: z.string().default("News"),
    /** ユーザーの興味関心に基づいた重要度スコア（1-10）。 */
    score: z.number().int().default(5),
    /** アイキャッチ画像のURL。存在しない場合はnull。 */
    img: z.string().nullable().default(null),
    /** 記事の公開日時。ISO 8601形式。 */
    date: z.string().datetime({ offset: true }).or(z.string()).default(() => new Date().toISOString()),
    /** 記事が分類されるカテゴリ名。 */
    category: z.string().default("未分類"),
    /** AI（Gemini）がこの記事を推薦した理由。 */
    geminiReason: z.string().optional(),
    /** 記事の言語。多言語フィルタリングや翻訳処理の判定に使用。 */
    language: z.enum(['ja', 'en', 'other']).default('en')
});

/**
 * ArticleSchemaから推論されたTypeScript型。
 */
export type ArticleType = z.infer<typeof ArticleSchema>;

/**
 * Articleクラス
 * 
 * 個別の記事データを表現し、サニタイズ処理とバリデーションをカプセル化するドメインモデル。
 * コンストラクタで生データを安全な構造に変換し、UIに表示する前の前処理（HTML除去等）を一貫して行う。
 */
export class Article implements ArticleType {
    title: string;
    link: string;
    desc: string;
    brand: string;
    score: number;
    img: string | null;
    date: string;
    category: string;
    geminiReason?: string;
    language: 'ja' | 'en' | 'other';

    /**
     * 新しいArticleインスタンスを生成する。
     * 入力データが不完全な場合でも、スキーマ定義に基づき安全なデフォルト値が適用される。
     * 
     * @param {unknown} data - RSSやスクレイパーから取得したバリデーション前の生データ
     */
    constructor(data: unknown) {
        // Zodによる型変換とデフォルト値の適用。
        // ここで例外が発生した場合は、呼び出し元で不適切なデータソースとして処理することを想定。
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
        this.language = validated.language;
        
        // UIでの表示崩れやスクリプト注入を防ぐためのサニタイズ
        this.desc = this._sanitizeDescription(this.desc);
    }

    /**
     * 説明文（description）の正規化処理。
     * 1. RSSに含まれるHTMLタグを除去し、純粋なテキストのみを抽出。
     * 2. UIのカード表示を最適化するため、最大文字数で切り詰めを行う。
     * 
     * @param {string} text - 処理対象の生文字列
     * @returns {string} クリーンアップされた要約テキスト
     * @private
     */
    private _sanitizeDescription(text: string): string {
        if (!text) return "";
        // HTMLタグの除去（正規表現による置換）
        const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
        // UI上の視認性を保つため、長すぎるテキストは末尾を省略
        return cleanText.length > 150 
            ? cleanText.slice(0, 150) + '...' 
            : cleanText;
    }

    /**
     * インスタンスをプレーンなJavaScriptオブジェクトに変換する。
     * JSON.stringify() で呼び出されるほか、ReduxやProps等でデータを渡す際に使用。
     * 
     * @returns {ArticleType} バリデーション済みの純粋なデータオブジェクト
     */
    toJSON(): ArticleType {
        return {
            title: this.title,
            link: this.link,
            desc: this.desc,
            brand: this.brand,
            score: this.score,
            img: this.img,
            date: this.date,
            category: this.category,
            geminiReason: this.geminiReason,
            language: this.language
        };
    }
}
