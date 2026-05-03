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
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

  async fetch(url: string): Promise<unknown[]> {
    return this.limit(async () => {
      try {
        const feed = await this.parser.parseURL(url);
        return feed.items;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Fetch failed: ${url} (${msg})`);
      }
    });
  }

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

  async fetchAll(feedConfigs: FeedConfigItem[]): Promise<FetchResult[]> {
    const tasks = feedConfigs.map(config =>
      this.fetch(config.url)
        .then(items => ({ category: config.category, url: config.url, items, success: true }))
        .catch((error: Error) => ({ category: config.category, url: config.url, error: error.message, success: false }))
    );
    return Promise.all(tasks);
  }
}
