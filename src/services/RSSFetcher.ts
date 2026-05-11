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
 * RSSフィードの取得とパースを専門に行うサービス。
 * 通信の並列数を制限しつつ高速に処理します。
 */
export class RSSFetcher {
  private limit: <T>(fn: () => Promise<T>) => Promise<T>;
  private parser: Parser;

  constructor(concurrency = 20) { // 大量取得のため並列数を20に増加
    this.limit = pLimit(concurrency);
    this.parser = new Parser({
      timeout: 20000, // 20秒に延長
      headers: {
        // モダンなブラウザの User-Agent を設定してブロックを回避
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
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
   * 単一のフィードを取得します。リトライロジック付き。
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

          // ネットワーク一時不通やタイムアウトの場合はリトライ
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
   * 複数のフィードを並列で取得します。
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
        .catch((error: Error) => ({ 
            category: config.category, 
            url: config.url, 
            error: error.message, 
            success: false 
        }))
    );
    return Promise.all(tasks);
  }
}
