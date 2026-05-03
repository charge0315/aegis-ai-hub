import { safeStorage } from 'electron';
import fs from 'fs/promises';
import { SettingsManager, SettingsManagerConfig } from '../../server/src/services/SettingsManager.js';
import { CredentialsSchema, Credentials } from '../../server/src/models/Schemas.js';

export class ElectronSettingsManager extends SettingsManager {
  constructor(config: SettingsManagerConfig) {
    super(config);
  }

  async getApiKey(): Promise<string> {
    try {
      const data = await fs.readFile(this.credentialsPath, 'utf8');
      const json = JSON.parse(data);
      const creds = CredentialsSchema.parse(json);
      
      let apiKey = creds.geminiApiKey || '';
      
      // 暗号化されたキーがある場合は復号を試みる
      if (apiKey && safeStorage.isEncryptionAvailable() && apiKey.startsWith('enc:')) {
        try {
          const encryptedBuffer = Buffer.from(apiKey.slice(4), 'base64');
          apiKey = safeStorage.decryptString(encryptedBuffer);
        } catch (decryptError) {
          console.error('[ElectronSettingsManager] Failed to decrypt API key:', decryptError);
          // 復号失敗時は空を返すか、元の値をフォールバックする
          apiKey = ''; 
        }
      }
      
      return apiKey || process.env.GEMINI_API_KEY || '';
    } catch {
      return process.env.GEMINI_API_KEY || '';
    }
  }

  async saveApiKey(apiKey: string): Promise<void> {
    let keyToSave = apiKey;
    
    // 暗号化が利用可能な場合は暗号化してプレフィックスをつける
    if (apiKey && safeStorage.isEncryptionAvailable()) {
      try {
        const encryptedBuffer = safeStorage.encryptString(apiKey);
        keyToSave = `enc:${encryptedBuffer.toString('base64')}`;
      } catch (encryptError) {
        console.error('[ElectronSettingsManager] Failed to encrypt API key:', encryptError);
      }
    }

    const creds: Credentials = { geminiApiKey: keyToSave };
    await this._safeWrite(this.credentialsPath, creds);
  }
}

// Electron固有のシングルトンインスタンスとして利用しやすいようにエクスポート
export default ElectronSettingsManager;
