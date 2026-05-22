import fs from 'fs/promises';
import path from 'path';

interface CacheEntry {
    img: string;
    timestamp: number;
}

/**
 * 記事URLと取得済み画像URLの対応関係を永続化・管理するクラス。
 * 
 * 【設計思想】
 * 外部サイトへの重複したスクレイピング（特にコストの高い画像メタデータの抽出）を防ぎ、
 * パフォーマンス向上と相手サーバーへの負荷軽減を両立させることを目的としています。
 * シンプルさを維持するため、大規模なデータベースではなく軽量なJSONファイルによる管理を採用しています。
 */
export class ImageCacheManager {
    private cachePath: string;
    private cache: Map<string, CacheEntry> = new Map();
    /**
     * キャッシュの有効期限 (TTL)。
     * 7日間としている理由は、ニュース記事の鮮度が概ね1週間で低下し、
     * 参照されなくなった古いキャッシュを自動破棄してストレージを節約するためです。
     */
    private readonly TTL = 7 * 24 * 60 * 60 * 1000;

    constructor(cacheDir: string) {
        this.cachePath = path.join(cacheDir, 'image_cache.json');
    }

    /**
     * キャッシュファイルを読み込み、メモリ上に展開します。
     * 起動時に一度だけ実行され、同時に期限切れデータのクリーンアップを行うことで
     * メモリ使用量の肥大化を抑制します。
     */
    async init(): Promise<void> {
        try {
            const data = await fs.readFile(this.cachePath, 'utf-8');
            const parsed = JSON.parse(data) as Record<string, CacheEntry>;
            this.cache = new Map(Object.entries(parsed));
            this.cleanup();
        } catch {
            // ファイルが存在しない場合は初期化のみ行い、後の save() で作成される
            this.cache = new Map();
        }
    }

    /**
     * 指定されたURLに対応する画像URLをキャッシュから取得します。
     * TTLを過ぎている場合は、古い情報を返してユーザーを混乱させるよりも
     * 再取得を促すために null を返して削除します。
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
     * 書き出しを毎回行うことで、不意なクラッシュ時のデータ損失を最小限に抑えます。
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
     * この処理は、メモリとディスクの両方から不要なデータを除去するために不可欠です。
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
     * JSON.stringify のインデント設定は、デバッグ時の可読性を確保するための意図的なものです。
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
