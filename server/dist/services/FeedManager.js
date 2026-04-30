import fs from 'fs';
import fsPromises from 'fs/promises';
import { FeedConfigSchema } from '../models/Schemas.js';
/**
 * RSSフィード設定の管理、故障検知、自動切り替えを担当するサービス
 */
export class FeedManager {
    configPath;
    config;
    constructor(configPath) {
        this.configPath = configPath;
        this.config = this.loadConfig();
    }
    loadConfig() {
        try {
            const rawContent = fs.readFileSync(this.configPath, 'utf8');
            const raw = JSON.parse(rawContent);
            const result = FeedConfigSchema.safeParse(raw);
            if (!result.success) {
                console.error("FeedManager Validation Errors:", JSON.stringify(result.error.issues, null, 2));
                return raw; // バリデーション失敗しても元のデータを返す（フォールバック）
            }
            return result.data;
        }
        catch (e) {
            console.error(`FeedManager: 設定の読み込みに失敗しました: ${e.message}`);
            return {};
        }
    }
    getActiveFeeds(category) {
        return this.config[category]?.active || [];
    }
    getAllActiveFeeds() {
        return Object.entries(this.config).flatMap(([category, data]) => data.active.map(url => ({ category, url })));
    }
    async reportFailure(category, url) {
        const catData = this.config[category];
        if (!catData)
            return null;
        catData.failures[url] = (catData.failures[url] || 0) + 1;
        if (catData.failures[url] >= 3 && catData.pool.length > 0) {
            const nextUrl = catData.pool.shift();
            if (nextUrl) {
                console.log(`FeedManager: フィードを差し替えます [${category}]: ${url} -> ${nextUrl}`);
                catData.active = catData.active.map(u => u === url ? nextUrl : u);
                delete catData.failures[url];
                await this.saveConfig();
                return nextUrl;
            }
        }
        return null;
    }
    reportSuccess(category, url) {
        const catData = this.config[category];
        if (catData && catData.failures && catData.failures[url]) {
            delete catData.failures[url];
        }
    }
    /**
     * 新しいフィードをプールに追加します。
     */
    async addFeed(category, url, name = "") {
        if (!this.config[category]) {
            this.config[category] = { active: [], pool: [], failures: {} };
        }
        const catData = this.config[category];
        // 重複チェック
        const allUrls = [...catData.active, ...catData.pool];
        if (!allUrls.includes(url)) {
            catData.pool.push(url);
            console.log(`[FeedManager] New feed added to pool [${category}]: ${name || url}`);
            await this.saveConfig();
            return true;
        }
        return false;
    }
    /**
     * 設定ファイルを整理し、無効なURLや重複を削除します。
     */
    async cleanConfig() {
        console.log("[FeedManager] 設定ファイルをクリーニング中...");
        for (const cat in this.config) {
            const data = this.config[cat];
            // 重複排除
            data.active = [...new Set(data.active)];
            data.pool = [...new Set(data.pool)];
            // pool 内で active と重複しているものを削除
            data.pool = data.pool.filter(url => !data.active.includes(url));
        }
        await this.saveConfig();
    }
    savePromise = Promise.resolve();
    async saveConfig() {
        // キューベースのロック: 前の保存が終わるのを待ってから実行
        this.savePromise = this.savePromise.then(async () => {
            const content = JSON.stringify(this.config, null, 2);
            let retries = 3;
            while (retries > 0) {
                try {
                    await fsPromises.writeFile(this.configPath, content, 'utf8');
                    return;
                }
                catch (e) {
                    if (e.code === 'EBUSY' && retries > 1) {
                        console.warn(`[FeedManager] Resource busy, retrying... (${retries} left)`);
                        await new Promise(resolve => setTimeout(resolve, 200));
                        retries--;
                        continue;
                    }
                    console.error("FeedManager: 設定の保存に失敗しました。", e.message);
                    break;
                }
            }
        });
        return this.savePromise;
    }
}
