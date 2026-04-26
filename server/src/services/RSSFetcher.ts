import Parser from 'rss-parser';
import pLimit from 'p-limit';

export interface FeedConfigItem {
  category: string;
  url: string;
}

export interface FetchResult {
  category: string;
  url: string;
  items?: any[];
  error?: string;
  success: boolean;
}

/**
 * RSSフィードの取得とパースを専門に行うサービス。
 * 通信の並列数を制限しつつ高速に処理します。
 */
export class RSSFetcher {
  private limit: any;
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
  async fetch(url: string): Promise<any[]> {
    return this.limit(async () => {
      try {
        const feed = await this.parser.parseURL(url);
        return feed.items;
      } catch (e: any) {
        throw new Error(`Fetch failed: ${url} (${e.message})`);
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
        .catch(error => ({ category: config.category, url: config.url, error: error.message, success: false }))
    );
    return Promise.all(tasks);
  }
}
