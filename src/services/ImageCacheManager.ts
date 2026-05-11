import fs from 'fs/promises';
import path from 'path';

interface CacheEntry {
    img: string;
    timestamp: number;
}

/**
 * 記事URLと取得済み画像URLの対応関係を永続化・管理するクラス。
 * 外部サイトへの重複したスクレイピングを防ぎ、パフォーマンス向上と相手サーバーへの負荷軽減を両立します。
 */
export class ImageCacheManager {
    private cachePath: string;
    private cache: Map<string, CacheEntry> = new Map();
    private readonly TTL = 7 * 24 * 60 * 60 * 1000; // 7日間

    constructor(cacheDir: string) {
        this.cachePath = path.join(cacheDir, 'image_cache.json');
    }

    /**
     * キャッシュファイルを読み込み、メモリ上に展開します。
     */
    async init(): Promise<void> {
        try {
            const data = await fs.readFile(this.cachePath, 'utf-8');
            const parsed = JSON.parse(data) as Record<string, CacheEntry>;
            this.cache = new Map(Object.entries(parsed));
            this.cleanup();
        } catch {
            // ファイルが存在しない場合は新規作成
            this.cache = new Map();
        }
    }

    /**
     * 指定されたURLに対応する画像URLをキャッシュから取得します。
     * TTLを過ぎている場合はnullを返します。
     */
    get(url: string): string | null {
        const entry = this.cache.get(url);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > this.TTL) {
            this.cache.delete(url);
            return null;
        }

        return entry.img;
    }

    /**
     * 記事URLと画像URLのペアをキャッシュに保存し、ファイルに書き出します。
     */
    async set(url: string, img: string): Promise<void> {
        this.cache.set(url, {
            img,
            timestamp: Date.now()
        });
        await this.save();
    }

    /**
     * 有効期限切れのキャッシュを削除します。
     */
    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.TTL) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * 現在のキャッシュ状態をJSONファイルに保存します。
     */
    private async save(): Promise<void> {
        try {
            const obj = Object.fromEntries(this.cache.entries());
            await fs.writeFile(this.cachePath, JSON.stringify(obj, null, 2), 'utf-8');
        } catch (error) {
            console.error('[ImageCacheManager] Failed to save cache:', error);
        }
    }
}
