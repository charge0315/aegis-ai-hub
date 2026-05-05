import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnrichmentService } from '../services/EnrichmentService.js';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.resolve(__dirname, '../../data');
const cachePath = path.join(cacheDir, 'image_cache.json');

vi.mock('axios');

describe('EnrichmentService', () => {
    let service: EnrichmentService;

    beforeEach(async () => {
        // テスト前にキャッシュファイルを削除（クリーンな状態）
        try {
            await fs.unlink(cachePath);
        } catch (e) {
            // ignore
        }
        service = new EnrichmentService();
        await service.init();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should extract OGP image and cache it', async () => {
        const mockHtml = `
            <html>
                <head>
                    <meta property="og:image" content="https://example.com/ogp.jpg">
                </head>
                <body></body>
            </html>
        `;
        (axios.get as any).mockResolvedValue({ data: mockHtml });

        const article = {
            title: 'Test Article',
            link: 'https://example.com/article1',
            desc: 'Test description',
            category: 'AI・ソフトウェア',
            brand: 'TestBrand',
            score: 80,
            date: new Date().toISOString(),
            img: null
        } as any;

        const enriched = await service.enrich(article);

        expect(enriched.img).toBe('https://example.com/ogp.jpg');
        expect(axios.get).toHaveBeenCalledTimes(1);

        // 2回目の呼び出しはキャッシュから取得されるはず
        const enrichedAgain = await service.enrich({ ...article, img: null });
        expect(enrichedAgain.img).toBe('https://example.com/ogp.jpg');
        expect(axios.get).toHaveBeenCalledTimes(1); // 1回のまま
    });

    it('should convert relative URL to absolute URL', async () => {
        const mockHtml = `
            <html>
                <head>
                    <meta property="og:image" content="/images/thumb.png">
                </head>
                <body></body>
            </html>
        `;
        (axios.get as any).mockResolvedValue({ data: mockHtml });

        const article = {
            link: 'https://tech-blog.jp/posts/123',
            category: 'PC・ハードウェア',
            img: null
        } as any;

        const enriched = await service.enrich(article);
        expect(enriched.img).toBe('https://tech-blog.jp/images/thumb.png');
    });

    it('should fallback to placeholder if no image found', async () => {
        (axios.get as any).mockResolvedValue({ data: '<html><body>No image here</body></html>' });

        const article = {
            link: 'https://example.com/no-image',
            category: 'ロードバイク',
            img: null
        } as any;

        const enriched = await service.enrich(article);
        expect(enriched.img).toContain('unsplash.com'); // ロードバイクのプレースホルダー
    });

    it('should extract image from content heuristics if OGP is missing', async () => {
        const mockHtml = `
            <html>
                <body>
                    <main>
                        <article>
                            <p>Some text</p>
                            <img src="https://example.com/content-image.webp" width="500" height="300">
                        </article>
                    </main>
                </body>
            </html>
        `;
        (axios.get as any).mockResolvedValue({ data: mockHtml });

        const article = {
            link: 'https://example.com/article-with-image',
            category: 'ゲーム',
            img: null
        } as any;

        const enriched = await service.enrich(article);
        expect(enriched.img).toBe('https://example.com/content-image.webp');
    });

    it('should process multiple articles with p-limit', async () => {
        const mockHtml = '<html><head><meta property="og:image" content="https://example.com/img.jpg"></head></html>';
        (axios.get as any).mockResolvedValue({ data: mockHtml });

        const articles = Array.from({ length: 10 }).map((_, i) => ({
            link: `https://example.com/article-${i}`,
            category: 'AI・ソフトウェア',
            img: null
        })) as any[];

        const results = await service.enrichAll(articles);
        expect(results).toHaveLength(10);
        results.forEach(r => expect(r.img).toBe('https://example.com/img.jpg'));
        
        // axios.get が 10回呼ばれていること
        expect(axios.get).toHaveBeenCalledTimes(10);
    });
});
