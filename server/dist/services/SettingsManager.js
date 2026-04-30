import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { InterestsSchema, FeedConfigSchema, WindowStateSchema } from '../models/Schemas.js';
class SettingsManager {
    interestsPath;
    feedConfigPath;
    constructor() {
        // Priority: 1. Environment variables, 2. Root data directory
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const projectRoot = path.resolve(__dirname, '..', '..', '..');
        this.interestsPath = process.env.INTERESTS_PATH || path.resolve(projectRoot, 'data', 'interests.json');
        this.feedConfigPath = process.env.FEEDS_PATH || path.resolve(projectRoot, 'data', 'feed_config.json');
        console.log(`[SettingsManager] Using interests path: ${this.interestsPath}`);
        console.log(`[SettingsManager] Using feed config path: ${this.feedConfigPath}`);
    }
    /**
     * Read and validate interests.json
     */
    async getInterests() {
        try {
            const data = await fs.readFile(this.interestsPath, 'utf8');
            const json = JSON.parse(data);
            return InterestsSchema.parse(json);
        }
        catch (error) {
            console.error('Failed to load interests:', error);
            throw error;
        }
    }
    /**
     * Read and validate feed_config.json
     */
    async getFeedConfig() {
        try {
            const data = await fs.readFile(this.feedConfigPath, 'utf8');
            const json = JSON.parse(data);
            return FeedConfigSchema.parse(json);
        }
        catch (error) {
            console.error('Failed to load feed config:', error);
            throw error;
        }
    }
    /**
     * Save settings with validation, backup, and atomic write.
     * Includes basic conflict resolution based on timestamp.
     */
    async syncSettings({ interests, feedConfig, windowState, lastUpdated }) {
        console.log('[SettingsManager] syncSettings started');
        // 1. Validate
        const validatedInterests = InterestsSchema.parse(interests);
        const validatedFeedConfig = FeedConfigSchema.parse(feedConfig);
        const validatedWindowState = windowState ? WindowStateSchema.parse(windowState) : undefined;
        console.log('[SettingsManager] Validation complete');
        // 2. Conflict Resolution
        const currentInterests = await this.getInterests();
        const serverLastUpdated = currentInterests.lastUpdated || 0;
        if (lastUpdated && lastUpdated < serverLastUpdated) {
            console.warn(`[SettingsManager] Conflict detected: client=${lastUpdated}, server=${serverLastUpdated}`);
            throw new Error('CONFLICT: サーバー上の設定は送信されたものより新しく更新されています。最新を取得してからやり直してください。');
        }
        // 更新日時をサーバー側で付与/更新
        const now = Date.now();
        validatedInterests.lastUpdated = now;
        // 3. Backup and Save Interests
        console.log(`[SettingsManager] Saving interests to: ${this.interestsPath}`);
        await this._safeWrite(this.interestsPath, validatedInterests);
        // 4. Backup and Save Feed Config
        console.log(`[SettingsManager] Saving feeds to: ${this.feedConfigPath}`);
        await this._safeWrite(this.feedConfigPath, validatedFeedConfig);
        // 5. Save Window State
        if (validatedWindowState) {
            const windowStatePath = path.join(path.dirname(this.interestsPath), 'window_state.json');
            console.log(`[SettingsManager] Saving window state to: ${windowStatePath}`);
            await this._safeWrite(windowStatePath, validatedWindowState);
        }
        console.log('[SettingsManager] syncSettings complete');
        return {
            success: true,
            timestamp: new Date().toISOString(),
            lastUpdated: now
        };
    }
    async getWindowState() {
        const windowStatePath = path.join(path.dirname(this.interestsPath), 'window_state.json');
        try {
            const content = await fs.readFile(windowStatePath, 'utf-8');
            return JSON.parse(content);
        }
        catch {
            return null;
        }
    }
    /**
     * Internal helper for safe (backup + atomic) write
     * Docker volume mount on Windows often fails with EBUSY for atomic renames.
     * Switching to standard write with backup.
     */
    async _safeWrite(filePath, data) {
        const content = JSON.stringify(data, null, 2);
        // 1. Create backup (ignore errors)
        try {
            const exists = await fs.access(filePath).then(() => true).catch(() => false);
            if (exists) {
                await fs.copyFile(filePath, `${filePath}.bak`);
            }
        }
        catch (backupError) {
            console.warn(`[SettingsManager] Backup failed (continuing):`, backupError);
        }
        // 2. Direct write with retry for Windows/Docker stability
        let retries = 3;
        while (retries > 0) {
            try {
                await fs.writeFile(filePath, content, 'utf8');
                return; // Success
            }
            catch (writeError) {
                if (writeError.code === 'EBUSY' && retries > 1) {
                    console.warn(`[SettingsManager] Resource busy, retrying... (${retries} left)`);
                    await new Promise(resolve => setTimeout(resolve, 200));
                    retries--;
                    continue;
                }
                console.error(`[SettingsManager] Write failed for ${filePath}:`, writeError);
                throw new Error(`Failed to write file ${path.basename(filePath)}: ${writeError.message}`);
            }
        }
    }
}
export default new SettingsManager();
