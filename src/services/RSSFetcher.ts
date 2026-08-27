import Parser from 'rss-parser';
import pLimit from 'p-limit';

export interface FeedConfigItem {
  category: string;
  url: string;
}

export interface FetchResult {
  category: string;
  url: string;
  items?: unknown[];
  error?: string;
  success: boolean;
}

/**
 * RSSFetcher: RSS/Atomフィードの取得とパースを専門に行うサービス。
 * 
 * 役割:
 * - 外部のニュースソース（URL）からコンテンツをダウンロードし、JSONオブジェクトに変換。
 * - 多様なRSSフォーマット（RSS 2.0, Atom, Dublin Core, media:content等）への対応。
 * - ネットワークリクエストの並列数制御とリトライ処理。
 * 
 * 設計思想:
 * - 高スループットと負荷制限の両立: 大量のフィードを短時間で取得するため並列数を高めに設定しつつ、p-limitによる過度な負荷を防止。
 * - ブロック回避: モダンなブラウザのUser-Agentを模倣し、アンチクローラー対策を回避。
 * - 回復性: ネットワークの一時的な瞬断やタイムアウトに対しては、指数バックオフを伴うリトライを自動実行。
 */
export class RSSFetcher {
  private limit: <T>(fn: () => Promise<T>) => Promise<T>;
  private parser: Parser;

  constructor(concurrency = 10) { // 負荷制御のため並列数を10に設定
    this.limit = pLimit(concurrency);
    this.parser = new Parser({
      timeout: 20000, // ネットワーク遅延を考慮し20秒に設定
      headers: {
        // サーバー側でのブロックを回避するためのヘッダー設定
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      // 標準外のメタデータ（画像、本文詳細、iTunesタグなど）を明示的にマッピング
      customFields: {
        item: [
          ['content:encoded', 'contentEncoded'],
          ['dc:title', 'title'],
          ['dc:description', 'description'],
          ['media:content', 'mediaContent'],
          ['media:thumbnail', 'mediaThumbnail'],
          ['itunes:image', 'itunesImage']
        ]
      }
    });
  }

  /**
   * 単一のフィードを取得します。
   * ネットワークエラー時には自動的にリトライを実施します。
   */
  async fetch(url: string, retries = 2): Promise<unknown[]> {
    return this.limit(async () => {
      let lastError: unknown;
      for (let i = 0; i <= retries; i++) {
        try {
          const feed = await this.parser.parseURL(url);
          return feed.items || [];
        } catch (e: unknown) {
          lastError = e;
          const msg = e instanceof Error ? e.message : String(e);

          // リトライすべきエラーかどうかの判定（DNS名前解決失敗、タイムアウト、429/503エラーなど）
          const isRetryable = 
            msg.includes('ENOTFOUND') || 
            msg.includes('ECONNREFUSED') || 
            msg.includes('ETIMEDOUT') || 
            msg.includes('timeout') ||
            msg.includes('Status code 429') || 
            msg.includes('Status code 503');

          if (isRetryable && i < retries) {
            const delay = 3000 * (i + 1);
            console.warn(`[RSSFetcher] Fetch failed, retrying in ${delay}ms... (${i + 1}/${retries}): ${url}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          console.warn(`[RSSFetcher] Non-retryable error or exhausted retries for ${url}: ${msg}`);
          break;
        }
      }
      throw lastError;
    });
  }

  /**
   * フィードの有効性を検証します。
   * 主に設定画面での「フィード追加」時の事前チェックに使用。
   */
  async validateFeed(url: string): Promise<{ ok: boolean; status: number | string; error?: string }> {
    return this.limit(async () => {
      try {
        await this.parser.parseURL(url);
        return { ok: true, status: 200 };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        let status: number | string = 'ERROR';
        const match = msg.match(/Status code (\d+)/);
        if (match) status = parseInt(match[1], 10);
        return { ok: false, status, error: msg };
      }
    });
  }

  /**
   * リストに含まれる全てのフィードを並列で取得します。
   */
  async fetchAll(feedConfigs: FeedConfigItem[]): Promise<FetchResult[]> {
    const tasks = feedConfigs.map(config =>
      this.fetch(config.url)
        .then(items => ({ 
            category: config.category, 
            url: config.url, 
            items, 
            success: true 
        }))
        .catch((error: unknown) => ({ 
            category: config.category, 
            url: config.url, 
            error: error instanceof Error ? error.message : String(error), 
            success: false 
        }))
    );
    return Promise.all(tasks);
  }
}
