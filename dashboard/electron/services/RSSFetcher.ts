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

  constructor(concurrency = 5) {
    this.limit = pLimit(concurrency);
    this.parser = new Parser({
      timeout: 15000, // 少し長めに設定
      headers: {
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
   * 単一のURLからフィードを取得します。
   */
  async fetch(url: string): Promise<unknown[]> {
    return this.limit(async () => {
      try {
        const feed = await this.parser.parseURL(url);
        return feed.items;
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        // エラーオブジェクトを詳細化して投げる
        const error = new Error(`Fetch failed: ${url} (${errorMessage})`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any).cause = e;
        // ステータスコードが含まれている場合はプロパティとして付与
        if (errorMessage.includes('Status code')) {
          const match = errorMessage.match(/Status code (\d+)/);
          if (match) (error as any).statusCode = parseInt(match[1], 10);
        }
        throw error;
      }
    });
  }

  /**
   * フィードの有効性を個別に検証します（ヘルスチェック用）。
   */
  async validateFeed(url: string): Promise<{ ok: boolean; status: number | string; error?: string }> {
    return this.limit(async () => {
      try {
        const feed = await this.parser.parseURL(url);
        return { ok: true, status: 200 };
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        let status: number | string = 'ERROR';
        if (errorMessage.includes('Status code')) {
          const match = errorMessage.match(/Status code (\d+)/);
          if (match) status = parseInt(match[1], 10);
        }
        return { ok: false, status, error: errorMessage };
      }
    });
  }

  /**
   * 複数のURLから一括で並列に取得します。
   */
  async fetchAll(feedConfigs: FeedConfigItem[]): Promise<FetchResult[]> {
    const tasks = feedConfigs.map(config => 
      this.fetch(config.url)
        .then(items => ({ category: config.category, url: config.url, items, success: true }))
        .catch((error: Error) => ({ category: config.category, url: config.url, error: error.message, success: false }))
    );
    return Promise.all(tasks);
  }
}
