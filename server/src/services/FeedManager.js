import fs from 'fs';

/**
 * RSSフィード設定の管理、故障検知、自動切り替えを担当するサービス
 */
export class FeedManager {
    constructor(configPath) {
        this.configPath = configPath;
        this.config = this.loadConfig();
    }

    /**
     * 設定ファイルを読み込みます。
     */
    loadConfig() {
        try {
            return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        } catch (e) {
            console.error(`FeedManager: 設定の読み込みに失敗しました (${this.configPath})`);
            return {};
        }
    }

    /**
     * 特定のカテゴリでアクティブなフィード一覧を返します。
     */
    getActiveFeeds(category) {
        return this.config[category]?.active || [];
    }

    /**
     * 全カテゴリのアクティブなフィードを、カテゴリ名を添えてフラットな配列で返します。
     */
    getAllActiveFeeds() {
        const result = [];
        for (const category in this.config) {
            this.config[category].active.forEach(url => {
                result.push({ category, url });
            });
        }
        return result;
    }

    /**
     * フィードのエラーを記録し、必要に応じて予備プールから差し替えます。
     */
    reportFailure(category, url) {
        const catData = this.config[category];
        if (!catData) return;

        catData.failures = catData.failures || {};
        catData.failures[url] = (catData.failures[url] || 0) + 1;

        if (catData.failures[url] >= 3 && catData.pool && catData.pool.length > 0) {
            const nextUrl = catData.pool.shift();
            console.log(`FeedManager: フィードを差し替えます [${category}]: ${url} -> ${nextUrl}`);
            catData.active = catData.active.map(u => u === url ? nextUrl : u);
            delete catData.failures[url];
            this.saveConfig();
            return nextUrl;
        }
        return null;
    }

    /**
     * 成功を報告し、エラーカウントをリセットします。
     */
    reportSuccess(category, url) {
        if (this.config[category]?.failures?.[url]) {
            delete this.config[category].failures[url];
            // 保存は頻繁に行わないようにし、必要な場合のみに限定することも検討
        }
    }

    /**
     * 現在の状態をファイルに書き込みます。
     */
    saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        } catch (e) {
            console.error("FeedManager: 設定の保存に失敗しました。");
        }
    }
}
