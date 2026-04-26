import * as cheerio from 'cheerio';
import axios from 'axios';
import { ArticleType } from '../models/Article.js';

/**
 * 記事の不足データを補完するサービス。
 * og:imageの取得やプレースホルダーの提供を行います。
 */
export class EnrichmentService {
    private placeholders: Record<string, string>;

    constructor() {
        this.placeholders = {
            '音楽・ギター・DTM': "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400",
            'AI・ソフトウェア': "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400",
            'PC・ハードウェア': "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400",
            'ロードバイク': "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400",
            'ゲーム': "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400"
        };
    }

    /**
     * 記事に画像がない場合、元サイトからog:imageを抽出しようと試みます。
     */
    async enrich(article: ArticleType): Promise<ArticleType> {
        if (article.img) return article;

        try {
            const { data } = await axios.get(article.link, { timeout: 5000, headers: { 'User-Agent': 'AegisAIHubBot/1.0' } });
            const $ = cheerio.load(data);
            const ogImage = $('meta[property="og:image"]').attr('content') || 
                            $('meta[name="twitter:image"]').attr('content') ||
                            $('link[rel="image_src"]').attr('href');

            if (ogImage && ogImage.startsWith('http')) {
                article.img = ogImage;
            } else {
                article.img = this.getPlaceholder(article.category);
            }
        } catch (e) {
            article.img = this.getPlaceholder(article.category);
        }
        return article;
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
    extractBasicImage(item: any): string | null {
        if (item.mediaContent) {
            const media = item.mediaContent;
            if (media.$ && media.$.url) return media.$.url;
            if (Array.isArray(media) && media[0]?.$.url) return media[0].$.url;
        }
        if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;
        if (item.enclosure?.url) return item.enclosure.url;
        if (item.itunesImage) return item.itunesImage;
        
        // 4Gamer等の特殊パターン
        const snippet = item.description || "";
        const matches = snippet.match(/src="([^"]+\.(jpg|png|gif|jpeg))"/i);
        if (matches && matches[1]) return matches[1];

        return null;
    }
}
