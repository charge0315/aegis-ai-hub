/**
 * @fileoverview Electron環境における設定管理クラス
 * 
 * 意図: Electronのセキュアなストレージ機能（safeStorage）を利用して、
 * APIキーなどの機密情報を安全に保存・復元するためです。
 */

import { safeStorage } from 'electron';
import fs from 'fs/promises';
import { SettingsManager, SettingsManagerConfig } from '../../server/src/services/SettingsManager';
import { CredentialsSchema, Credentials } from '../../server/src/models/Schemas';

export class ElectronSettingsManager extends SettingsManager {
  /**
   * 構造化された設定管理クラスのコンストラクタ
   * 
   * 意図: 親クラスの SettingsManager を初期化し、共通の設定管理機能を継承するためです。
   */
  constructor(config: SettingsManagerConfig) {
    super(config);
  }

  /**
   * 保存されているAPIキーを取得します。
   * 
   * 意図: ファイルから設定を読み込み、暗号化されている場合は復号して
   * アプリケーションが直接利用可能な形式の文字列を返すためです。
   */
  async getApiKey(): Promise<string> {
    try {
      const data = await fs.readFile(this.credentialsPath, 'utf8');
      const json = JSON.parse(data);
      const creds = CredentialsSchema.parse(json);
      
      let apiKey = creds.geminiApiKey || '';
      
      // 暗号化されたキーがある場合は復号を試みる
      // 意図: 異なる端末や環境での不正な読み取りを防ぐため、OSレベルの暗号化を適用しています。
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

  /**
   * APIキーをセキュアに保存します。
   * 
   * 意図: 設定ファイルへの書き出し前に、機密情報を暗号化して
   * セキュリティレベルを高めるためです。
   */
  async saveApiKey(apiKey: string): Promise<void> {
    let keyToSave = apiKey;
    
    // 暗号化が利用可能な場合は暗号化してプレフィックスをつける
    // 意図: 保存データが暗号化済みであることを識別するための 'enc:' プレフィックスを付与します。
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
