import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import writeFileAtomic from 'write-file-atomic';
import { InterestsSchema, FeedConfigSchema } from '../models/Schemas.js';

class SettingsManager {
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
    } catch (error) {
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
    } catch (error) {
      console.error('Failed to load feed config:', error);
      throw error;
    }
  }

  /**
   * Save settings with validation, backup, and atomic write
   */
  async syncSettings({ interests, feedConfig }) {
    // 1. Validate
    const validatedInterests = InterestsSchema.parse(interests);
    const validatedFeedConfig = FeedConfigSchema.parse(feedConfig);

    // 2. Backup and Save Interests
    await this._safeWrite(this.interestsPath, validatedInterests);
    
    // 3. Backup and Save Feed Config
    await this._safeWrite(this.feedConfigPath, validatedFeedConfig);

    return { success: true, timestamp: new Date().toISOString() };
  }

  /**
   * Internal helper for safe (backup + atomic) write
   */
  async _safeWrite(filePath, data) {
    const content = JSON.stringify(data, null, 2);
    
    // Create backup
    try {
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      if (exists) {
        await fs.copyFile(filePath, `${filePath}.bak`);
      }
    } catch (backupError) {
      console.warn(`Backup failed for ${filePath}:`, backupError);
    }

    // Atomic write
    await writeFileAtomic(filePath, content);
  }
}

export default new SettingsManager();
