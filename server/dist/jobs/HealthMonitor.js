import { RSSFetcher } from '../services/RSSFetcher.js';
/**
 * フィードの健康状態を監視し、故障したフィードを自動的に差し替えるジョブ
 */
export class HealthMonitor {
    feedManager;
    fetcher;
    interval;
    constructor(feedManager) {
        this.feedManager = feedManager;
        this.fetcher = new RSSFetcher(5);
        this.interval = null;
    }
    /**
     * 定期監視を開始します。
     * @param intervalMs 監視間隔（デフォルト：1時間）
     */
    start(intervalMs = 60 * 60 * 1000) {
        console.log(`HealthMonitor: 監視ジョブを開始しました（間隔: ${intervalMs / 1000 / 60}分）`);
        this.checkAll(); // 初回実行
        this.interval = setInterval(() => this.checkAll(), intervalMs);
    }
    /**
     * 監視を停止します。
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    /**
     * 全フィードの状態をチェックします。
     */
    async checkAll() {
        console.log("HealthMonitor: フィードの健康診断を開始します...");
        const feeds = this.feedManager.getAllActiveFeeds();
        const results = await this.fetcher.fetchAll(feeds);
        for (const res of results) {
            if (res.success) {
                this.feedManager.reportSuccess(res.category, res.url);
            }
            else {
                console.warn(`HealthMonitor: フィードの異常を検知 [${res.category}]: ${res.url}`);
                const nextUrl = this.feedManager.reportFailure(res.category, res.url);
                if (nextUrl) {
                    console.log(`HealthMonitor: 新しいフィード 「${nextUrl}」 に差し替えました。`);
                }
            }
        }
        console.log("HealthMonitor: 健康診断が完了しました。");
    }
}
