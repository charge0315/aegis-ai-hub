import * as cheerio from 'cheerio';
import axios from 'axios';
import { ArticleType } from '../models/Article.js';
import { GeminiService } from './GeminiService.js';

/**
 * 外部ソースから取得した生の情報を、ユーザーにとって価値のある「リッチな記事」へと昇華させるためのサービス。
 * 画像が欠落している記事への視覚的補完（フォールバック）や、言語の壁を越えるための自動翻訳を提供し、
 * ダッシュボード上でのユーザー体験を一貫して高品質に保つことを目的とします。
 */
export class EnrichmentService {
    private placeholders: Record<string, string>;
    private geminiService: GeminiService | null = null;

    constructor(geminiService?: GeminiService) {
        this.geminiService = geminiService || null;
        this.placeholders = {
            '音楽・ギター・DTM': "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400",
            'AI・ソフトウェア': "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400",
            'PC・ハードウェア': "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400",
            'ロードバイク': "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400",
            'ゲーム': "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400"
        };
    }

    /**
     * 不完全な記事データを検査し、可能な限りのメタデータを補完して情報の質を底上げします。
     * 特に、アイキャッチ画像の確保（視覚的魅力の維持）と、母国語へのローカライズ（可読性の確保）を担います。
     */
    async enrich(article: ArticleType): Promise<ArticleType> {
        // --- 視覚的メタデータの補完フェーズ ---
        // UI上で記事が「文字だけの無味乾燥なブロック」になるのを防ぐため、必ず何らかの画像を紐付けます。
        if (!article.img) {
            try {
                // 記事の元ページを取得し、隠されたメタデータや本文を直接解剖します。
                const { data } = await axios.get(article.link, { timeout: 5000, headers: { 'User-Agent': 'AegisAIHubBot/1.0' } });
                const $ = cheerio.load(data);
                
                // 優先度高：サイト運営者が意図して設定したSNS共有用画像（og:image等）を採用し、
                // 最も記事の内容を正しく表すビジュアルを確保します。
                let ogImage = $('meta[property="og:image"]').attr('content') || 
                              $('meta[name="twitter:image"]').attr('content') ||
                              $('link[rel="image_src"]').attr('href');

                // 優先度中：専用のメタタグがないサイトに対する救済措置。
                // 記事のHTML構造そのものを探索し、本文と思われる領域から妥当な画像を泥臭く発掘します。
                if (!ogImage) {
                    const contentAreas = $('article, main, .content, .post, .entry');
                    const imgElements = contentAreas.length > 0 ? contentAreas.find('img') : $('img');
                    
                    imgElements.each((_, el) => {
                        const src = $(el).attr('src') || $(el).attr('data-src');
                        
                        // トラッキング用の1px画像やUIアイコンといった「ノイズ」を排除し、
                        // 記事の主題に沿った本物の画像（写真やイラスト）だけを厳選します。
                        if (src && /\.(jpg|jpeg|png|webp)/i.test(src)) {
                            try {
                                // 相対パス（/images/xxx.png 等）のままではアプリから参照できないため、
                                // 記事の元URLを基準とした完全なアクセス可能URL（絶対パス）へと再構築します。
                                ogImage = new URL(src, article.link).href;
                                return false; // 条件を満たす最初の1枚で探索を打ち切る
                            } catch (e) {
                                // 再構築に失敗した画像は諦め、次の候補を探し続けます。
                            }
                        }
                    });
                }

                if (ogImage && ogImage.startsWith('http')) {
                    article.img = ogImage;
                } else {
                    // 最終防衛線：全ての画像探索アルゴリズムが空振りに終わった場合でも、
                    // UIのレイアウト崩れを防ぐため、カテゴリの文脈に沿った美しいダミー画像をあてがいます。
                    article.img = this.getPlaceholder(article.category);
                }
            } catch (e) {
                // ネットワークエラー等でアクセス不能な場合も、システムを停止させずにダミー画像で保護します。
                article.img = this.getPlaceholder(article.category);
            }
        }

        // --- 言語のローカライズフェーズ ---
        // ユーザーが海外の優秀な情報源にもストレスなくアクセスできるよう、
        // 記事が日本語でないと判断された場合は自動的に母国語の要約へと変換します。
        if (this.geminiService && this.isNotJapanese(article.title)) {
            console.log(`[EnrichmentService] 翻訳を実行中: ${article.title}`);
            try {
                const translations = await this.geminiService.translateArticles([{
                    title: article.title,
                    desc: article.desc || ''
                }]);
                
                if (translations && translations.length > 0) {
                    // 翻訳済みであることを明示しつつ、タイトルと概要を置き換えます。
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
     * テキストが翻訳対象（非日本語）であるかを高速に振り分けるための関所。
     * ここで厳密な言語判定は行わず、あくまで「日本語特有の文字が含まれているか」のみで軽量に判断します。
     */
    private isNotJapanese(text: string): boolean {
        const jpRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
        return !jpRegex.test(text);
    }

    /**
     * 画像が一切見つからなかった記事に対して、システムが提供するデフォルトの「顔」。
     * カテゴリごとの雰囲気に合わせた高品質な写真を提供し、画面全体の美観を損なわないようにします。
     */
    getPlaceholder(category: string): string {
        return this.placeholders[category] || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400";
    }

    /**
     * RSSフィードの初期取得時に、付帯情報から最も軽量・高速に画像URLを引き出すための第一次フィルター。
     * 外部へのHTTPリクエストを発生させないため、パフォーマンスへの影響が極めて小さいのが特徴です。
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

        // フィードの仕様が標準から外れているサイト（4Gamer等）や、
        // 記事全文をまるごとフィードに含めているサイトへの対策。
        // パースしきれなかった生テキストの海から、直接画像リンクを正規表現でサルベージします。
        const snippet = (item.description as string) || "";
        const content = (item.content as string) || (item.contentEncoded as string) || "";
        const fullContent = `${snippet} ${content}`;
        const matches = fullContent.match(/src=["']([^"']+\.(jpg|png|gif|jpeg|webp))["']/i);
        if (matches && matches[1]) return matches[1];

        return null;
    }
}
