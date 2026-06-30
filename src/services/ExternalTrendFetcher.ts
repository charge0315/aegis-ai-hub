import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ExternalTrend {
  title: string;
  source: string;
  trafficVolume?: string;
}

/**
 * ExternalTrendFetcher: GoogleトレンドなどのSNS/検索トレンドを取得するサービス。
 *
 * 取得元:
 * - Google Trends Daily RSS (日本): 認証不要で取得可能な公式RSS
 * - Yahoo Japan Trending (スクレイピング): 日本国内の検索トレンド
 *
 * これらのトレンドをAIトレンド分析のシグナルとして使用することで、
 * RSSフィードだけでは検出できないリアルタイムの話題を補完します。
 */
export class ExternalTrendFetcher {
  private readonly TIMEOUT = 8000;
  private readonly HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, text/html, */*',
    'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
  };

  /**
   * GoogleトレンドのDaily RSSフィードから日本のトレンドを取得します。
   * 公式RSS: https://trends.google.com/trending/rss?geo=JP
   */
  async fetchGoogleTrends(geo = 'JP'): Promise<ExternalTrend[]> {
    const url = `https://trends.google.com/trending/rss?geo=${geo}`;
    try {
      const res = await axios.get(url, { timeout: this.TIMEOUT, headers: this.HEADERS });
      const $ = cheerio.load(res.data, { xmlMode: true });
      const trends: ExternalTrend[] = [];

      $('item').each((_, el) => {
        const title = $(el).find('title').first().text().trim();
        const traffic = $(el).find('ht\\:approx_traffic, approx_traffic').text().trim();
        if (title) {
          trends.push({ title, source: 'Google Trends', trafficVolume: traffic || undefined });
        }
      });

      return trends.slice(0, 20);
    } catch (e) {
      console.warn('[ExternalTrendFetcher] Google Trends fetch failed:', String(e));
      return [];
    }
  }

  /**
   * Yahoo Japan の検索トレンドページからトレンドワードを取得します。
   */
  async fetchYahooJapanTrends(): Promise<ExternalTrend[]> {
    try {
      const res = await axios.get('https://search.yahoo.co.jp/realtime/buzznews', {
        timeout: this.TIMEOUT,
        headers: this.HEADERS,
      });
      const $ = cheerio.load(res.data);
      const trends: ExternalTrend[] = [];

      // Yahoo リアルタイム検索のキーワード要素を取得
      $('[class*="buzz"], [class*="trend"], .SearchResult, .BuzznewsList li').each((_, el) => {
        const text = $(el).text().trim().split('\n')[0].trim();
        if (text && text.length > 1 && text.length < 60) {
          trends.push({ title: text, source: 'Yahoo Japan' });
        }
      });

      return trends.slice(0, 15);
    } catch (e) {
      console.warn('[ExternalTrendFetcher] Yahoo Japan Trends fetch failed:', String(e));
      return [];
    }
  }

  /**
   * X（旧Twitter）のトレンドをNitter公開インスタンス経由で取得します。
   * Nitterが利用不可の場合はスキップします。
   */
  async fetchXTrends(geo = 'JP'): Promise<ExternalTrend[]> {
    // X公式APIの公開エンドポイント（認証不要のゲストトークン経由）
    const guestTokenUrl = 'https://api.twitter.com/1.1/guest/activate.json';
    const trendsUrl = `https://api.twitter.com/1.1/trends/place.json?id=${geo === 'JP' ? 23424856 : 1}`; // 23424856 = Japan WOEID

    try {
      // ゲストトークンを取得
      const tokenRes = await axios.post(guestTokenUrl, {}, {
        timeout: this.TIMEOUT,
        headers: {
          ...this.HEADERS,
          'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
          'Content-Type': 'application/json',
        },
      });

      const guestToken = tokenRes.data?.guest_token;
      if (!guestToken) return [];

      const trendsRes = await axios.get(trendsUrl, {
        timeout: this.TIMEOUT,
        headers: {
          ...this.HEADERS,
          'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
          'x-guest-token': guestToken,
        },
      });

      const rawTrends = trendsRes.data?.[0]?.trends ?? [];
      return rawTrends.slice(0, 20).map((t: { name: string; tweet_volume?: number }) => ({
        title: t.name,
        source: 'X (Twitter)',
        trafficVolume: t.tweet_volume ? `${t.tweet_volume} tweets` : undefined,
      }));
    } catch (e) {
      console.warn('[ExternalTrendFetcher] X Trends fetch failed:', String(e));
      return [];
    }
  }

  /**
   * 全ソースからトレンドを並列取得し、まとめて返します。
   */
  async fetchAll(geo = 'JP'): Promise<ExternalTrend[]> {
    const [googleTrends, xTrends, yahooTrends] = await Promise.all([
      this.fetchGoogleTrends(geo),
      this.fetchXTrends(geo),
      this.fetchYahooJapanTrends(),
    ]);

    const all = [...xTrends, ...googleTrends, ...yahooTrends];
    console.log(`[ExternalTrendFetcher] 取得トレンド数: X=${xTrends.length}, Google=${googleTrends.length}, Yahoo=${yahooTrends.length}`);
    return all;
  }
}
