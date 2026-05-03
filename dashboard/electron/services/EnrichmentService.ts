import * as cheerio from 'cheerio';
import axios from 'axios';
import { ArticleType } from '../models/Article';
import { GeminiService } from './GeminiService';

/**
 * 記事の不足データを補完するサービス。
 * og:imageの取得やプレースホルダーの提供、多言語翻訳を行います。
 */
export class EnrichmentService {
    private placeholders: Record<string, string>;
    private geminiService: GeminiService | null = null;

    constructor(geminiService?: GeminiService) {
        this.geminiService = geminiService || null;
        this.placeholders = {
            'ゲーム・配信': "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800",
            'AI・ソフトウェア': "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800",
            'PCパーツ': "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800",
            'オーディオ・音楽制作': "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800",
            'PC・デバイス': "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800",
            '周辺機器・PCアクセサリ': "https://images.unsplash.com/photo-1527443224154-c4a3942d3a06?w=800",
            'モバイル・タブレット': "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800",
            'モビリティ・自転車・EV': "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800",
            'セール・EC情報': "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800",
            'カメラ・クリエイティブ': "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800",
            'ライフスタイル': "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800",
            'ロードバイク・MTB・サイクリング': "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800"
        };
    }

    /**
     * 記事に画像がない場合、元サイトからog:imageを抽出しようと試みます。
     * また、英語等の非日本語記事を日本語に翻訳します。
     */
    async enrich(article: ArticleType): Promise<ArticleType> {
        // 1. 画像の補完
        if (!article.img) {
            try {
                const { data } = await axios.get(article.link, { timeout: 5000, headers: { 'User-Agent': 'AegisAIHubBot/1.0' } });
                const $ = cheerio.load(data as string);
                const ogImage = $('meta[property="og:image"]').attr('content') || 
                                $('meta[name="twitter:image"]').attr('content') ||
                                $('link[rel="image_src"]').attr('href');

                if (ogImage && ogImage.startsWith('http')) {
                    article.img = ogImage;
                } else {
                    article.img = this.getPlaceholder(article.category);
                }
            } catch {
                article.img = this.getPlaceholder(article.category);
            }
        }

        // 2. 自動翻訳 (英語等の非日本語判定)
        if (this.geminiService && this.isNotJapanese(article.title)) {
            console.log(`[EnrichmentService] 翻訳を実行中: ${article.title}`);
            try {
                const translations = await this.geminiService.translateArticles([{
                    title: article.title,
                    desc: article.desc || ''
                }]);
                
                if (translations && translations.length > 0) {
                    article.title = `[JP] ${translations[0].title}`;
                    article.desc = translations[0].desc;
                }
            } catch (err) {
                console.error("[EnrichmentService] 翻訳に失敗しました:", err);
            }
        }

        return article;
    }

    /**
     * 日本語が含まれていないか判定します（簡易版）。
     */
    private isNotJapanese(text: string): boolean {
        // ひらがな・カタカナ・漢字が含まれていない場合に非日本語と判定
        const jpRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
        return !jpRegex.test(text);
    }

    /**
     * カテゴリに応じたスタイリッシュな代替画像を返します。
     */
    getPlaceholder(category: string): string {
        return this.placeholders[category] || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400";
    }

    /**
     * RSSアイテムから標準的な画像フィールドを抽出します（基本パース用）。
     */
    extractBasicImage(item: Record<string, unknown>): string | null {
        const mediaContent = item.mediaContent as Record<string, Record<string, string>> | Array<Record<string, Record<string, string>>> | undefined;
        if (mediaContent) {
            if (Array.isArray(mediaContent)) {
                if (mediaContent[0]?.$?.url) return mediaContent[0].$.url;
            } else if (mediaContent.$?.url) {
                return mediaContent.$.url;
            }
        }

        const mediaThumbnail = item.mediaThumbnail as Record<string, Record<string, string>> | undefined;
        if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url;

        const enclosure = item.enclosure as Record<string, string> | undefined;
        if (enclosure?.url) return enclosure.url;

        if (item.itunesImage) return String(item.itunesImage);
        
        // 4Gamer等の特殊パターン
        const snippet = (item.description as string) || "";
        const matches = snippet.match(/src="([^"]+\.(jpg|png|gif|jpeg))"/i);
        if (matches && matches[1]) return matches[1];

        return null;
    }
}
