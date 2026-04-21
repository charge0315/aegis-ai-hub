import fs from 'fs';
import writeFileAtomic from 'write-file-atomic';
import { z } from 'zod';

const FeedConfigSchema = z.record(z.object({
    active: z.array(z.string().url()),
    pool: z.array(z.string().url()),
    failures: z.record(z.number()).default({})
}));

/**
 * RSSフィード設定の管理、故障検知、自動切り替えを担当するサービス
 */
export class FeedManager {
    constructor(configPath) {
        this.configPath = configPath;
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            const raw = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            return FeedConfigSchema.parse(raw);
        } catch (e) {
            console.error(`FeedManager: 設定の読み込みまたはバリデーションに失敗しました: ${e.message}`);
            return {};
        }
    }

    getActiveFeeds(category) {
        return this.config[category]?.active || [];
    }

    getAllActiveFeeds() {
        return Object.entries(this.config).flatMap(([category, data]) => 
            data.active.map(url => ({ category, url }))
        );
    }

    reportFailure(category, url) {
        const catData = this.config[category];
        if (!catData) return null;

        catData.failures[url] = (catData.failures[url] || 0) + 1;

        if (catData.failures[url] >= 3 && catData.pool.length > 0) {
            const nextUrl = catData.pool.shift();
            console.log(`FeedManager: フィードを差し替えます [${category}]: ${url} -> ${nextUrl}`);
            catData.active = catData.active.map(u => u === url ? nextUrl : u);
            delete catData.failures[url];
            this.saveConfig();
            return nextUrl;
        }
        return null;
    }

    reportSuccess(category, url) {
        if (this.config[category]?.failures?.[url]) {
            delete this.config[category].failures[url];
        }
    }

    async saveConfig() {
        try {
            await writeFileAtomic(this.configPath, JSON.stringify(this.config, null, 2));
        } catch (e) {
            console.error("FeedManager: 設定のアトミック保存に失敗しました。", e.message);
        }
    }
}
