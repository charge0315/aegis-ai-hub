import * as cheerio from 'cheerio';
import axios from 'axios';
import pLimit from 'p-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { type ArticleType } from '../models/Article';
import { type GeminiService } from './GeminiService';
import { ImageCacheManager } from './ImageCacheManager';

// ESM/CommonJS 互換の __dirname 取得
const _dirname = (typeof import.meta !== 'undefined' && import.meta.url)
    ? path.dirname(fileURLToPath(import.meta.url))
    : (typeof __dirname !== 'undefined' ? __dirname : '');

/**
 * EnrichmentService: 外部ソースから取得した生の情報を、ユーザーにとって価値のある「リッチな記事」へと昇華させるためのサービス。
 * 
 * 役割:
 * - 画像が欠落している記事への視覚的補完（OGPスクレイピング、カテゴリ別プレースホルダー）。
 * - 言語の壁を越えるための自動翻訳（英語記事の日本語化）。
 * - 重い処理（ネットワークリクエストやAI翻訳）の並列実行制御。
 * - アイキャッチ画像のキャッシュ管理によるパフォーマンス最適化。
 * 
 * 設計思想:
 * - 視覚的一貫性: ダッシュボード上で全ての記事に適切な画像が表示されるよう、多段階の画像取得戦略（キャッシュ -> スクレイピング -> カテゴリ規定画像）を採用。
 * - ローカライズの自動化: ユーザーが母国語で素早く情報を精査できるよう、非日本語記事を自動的に検知して翻訳。
 * - 負荷軽減: 相手サーバーやGemini APIへの過度な同時リクエストを防ぐため、p-limitによる並列数制限を導入。
 */
export class EnrichmentService {
    private placeholders: Record<string, string>;
    private geminiService: GeminiService | null = null;
    private cacheManager: ImageCacheManager;
    private limit = pLimit(5); // 同時実行数を5に制限し、ネットワーク/API負荷をコントロール

    constructor(geminiService?: GeminiService, cacheDir?: string) {
        this.geminiService = geminiService || null;
        // キャッシュディレクトリの決定: 明示的な指定 > 相対パス
        const finalCacheDir = cacheDir || path.resolve(_dirname, '../../data');
        this.cacheManager = new ImageCacheManager(finalCacheDir);
        
        // カテゴリごとのデフォルト画像定義（Unsplashから取得）
        this.placeholders = {
            '音楽・ギター・DTM': "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400",
            'AI・ソフトウェア': "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400",
            'PC・ハードウェア': "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400",
            'ロードバイク': "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400",
            'ゲーム': "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400"
        };
    }

    /**
     * キャッシュマネージャーの初期化（ファイルシステムへのアクセス準備）
     */
    async init(): Promise<void> {
        await this.cacheManager.init();
    }

    /**
     * 複数の記事を一括でエンリッチメントします。
     * 並列実行数を制限し、サーバーや相手サイトへの負荷を抑えます。
     */
    async enrichAll(articles: ArticleType[]): Promise<ArticleType[]> {
        const tasks = articles.map(article => this.limit(() => this.enrich(article)));
        return Promise.all(tasks);
    }

    /**
     * 不完全な記事データを検査し、可能な限りのメタデータを補完して情報の質を底上げします。
     * 特に、アイキャッチ画像の確保（視覚的魅力の維持）と、母国語へのローカライズ（可読性の確保）を担います。
     */
    async enrich(article: ArticleType): Promise<ArticleType> {
        // --- 視覚的メタデータの補完フェーズ ---
        if (!article.img) {
            // 1. キャッシュを確認（再起動後のパフォーマンス向上）
            const cachedImg = this.cacheManager.get(article.link);
            if (cachedImg) {
                article.img = cachedImg;
            } else {
                try {
                    // 2. スクレイピングによる抽出（OGPタグなどから直接取得を試みる）
                    const foundImg = await this.scrapeImage(article.link);
                    
                    if (foundImg) {
                        article.img = foundImg;
                        await this.cacheManager.set(article.link, foundImg);
                    } else {
                        // 最終防衛線：カテゴリ別プレースホルダー
                        article.img = this.getPlaceholder(article.category);
                    }
                } catch (e) {
                    console.error(`[EnrichmentService] Failed to scrape image for ${article.link}:`, e);
                    article.img = this.getPlaceholder(article.category);
                }
            }
        }

        // --- 言語のローカライズフェーズ ---
        // AIサービスが利用可能、かつタイトルが日本語でない場合に自動翻訳を実行
        if (this.geminiService && this.isNotJapanese(article.title)) {
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
     * 記事URLから最適な画像を抽出します。
     * OGP(Open Graph Protocol)タグを優先し、見つからない場合は本文内の主要な画像を探索します。
     */
    private async scrapeImage(url: string): Promise<string | null> {
        try {
            const { data } = await axios.get(url, { 
                timeout: 8000, 
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
                } 
            });
            const $ = cheerio.load(data);
            
            // 1. OGP / Meta Tags (High priority: 正確性が高い)
            let imgUrl = $('meta[property="og:image"]').attr('content') || 
                         $('meta[name="twitter:image"]').attr('content') ||
                         $('meta[name="image"]').attr('content') ||
                         $('meta[name="thumbnail"]').attr('content') ||
                         $('link[rel="image_src"]').attr('href') ||
                         $('link[rel="shortcut icon"]').attr('href');

            // 2. Content Heuristics (Fallback: 本文から推察)
            if (!imgUrl) {
                const contentAreas = $('article, main, [role="main"], .post-content, .entry-content, #content, .article-body');
                const imgElements = contentAreas.length > 0 ? contentAreas.find('img') : $('img');
                
                imgElements.each((_, el) => {
                    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
                    
                    if (src && /\.(jpg|jpeg|png|webp|gif)/i.test(src)) {
                        // アイコンやバナー（小さい画像）を避けるための簡単なフィルター
                        const width = $(el).attr('width');
                        const height = $(el).attr('height');
                        if (width && parseInt(width) < 100) return true; // continue
                        if (height && parseInt(height) < 100) return true;

                        imgUrl = src;
                        return false; // break
                    }
                });
            }

            if (imgUrl) {
                try {
                    // 相対URLを絶対URLに変換（ベースURLとの結合）
                    const absoluteUrl = new URL(imgUrl, url).href;
                    if (absoluteUrl.startsWith('http')) {
                        return absoluteUrl;
                    }
                } catch {
                    // URL解析失敗
                }
            }
        } catch {
            // リクエスト失敗
        }
        return null;
    }

    /**
     * テキストが翻訳対象（非日本語）であるかを判定します。
     * 日本語の文字範囲が含まれていない場合に翻訳が必要とみなします。
     */
    private isNotJapanese(text: string): boolean {
        const jpRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
        return !jpRegex.test(text);
    }

    /**
     * 画像が一切見つからなかった記事に対して、システムが提供するデフォルトの画像URLを取得します。
     */
    getPlaceholder(category: string): string {
        return this.placeholders[category] || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400";
    }

    /**
     * RSSフィードの初期取得時に、メタデータ（media:content等）から高速に画像URLを引き出すための第一次フィルター。
     */
    extractBasicImage(item: Record<string, unknown>): string | null {
        const mediaContent = item.mediaContent as { $?: { url?: string } } | Array<{ $?: { url?: string } }> | undefined;
        if (mediaContent) {
            if (Array.isArray(mediaContent)) {
                if (mediaContent[0]?.$?.url) return mediaContent[0].$.url;
            } else if (mediaContent.$?.url) {
                return mediaContent.$.url;
            }
        }

        const mediaThumbnail = item.mediaThumbnail as { $?: { url?: string } } | undefined;
        if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url;

        const enclosure = item.enclosure as { url?: string } | undefined;
        if (enclosure?.url) return enclosure.url;

        if (item.itunesImage) return String(item.itunesImage);

        // descriptionの中にimgタグが含まれている場合のフォールバック抽出
        const snippet = (item.description as string) || "";
        const content = (item.content as string) || (item.contentEncoded as string) || "";
        const fullContent = `${snippet} ${content}`;
        const matches = fullContent.match(/src=["']([^"']+\.(jpg|png|gif|jpeg|webp))["']/i);
        if (matches && matches[1]) return matches[1];

        return null;
    }
}
