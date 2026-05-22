/**
 * @fileoverview Electron環境に特化した設定管理クラス
 * 
 * 【設計思想】
 * Webブラウザのサンドボックス制限を超え、OSレベルのセキュアなストレージ（safeStorage）に
 * アクセスするためのElectron専用実装です。
 * 基底クラスである SettingsManager を継承することで、設定の読み書きという共通ロジックを保持しつつ、
 * 機密情報の暗号化という「環境固有の責務」を分離しています。
 */

import { safeStorage } from 'electron';
import fs from 'fs/promises';
import { SettingsManager, SettingsManagerConfig } from '../src/services/SettingsManager';
import { CredentialsSchema, Credentials } from '../src/models/Schemas';

export class ElectronSettingsManager extends SettingsManager {
  /**
   * コンストラクタ
   * 
   * 意図: 親クラスのファイルパス管理機能を活用しつつ、
   * Electronメインプロセスからのみ利用可能なAPIへの依存をカプセル化します。
   */
  constructor(config: SettingsManagerConfig) {
    super(config);
  }

  /**
   * 保存されているAPIキーを取得します。
   * 
   * 意図: ファイルから設定を読み込み、暗号化されている場合は復号します。
   * これにより、万が一設定ファイルが第三者に渡っても、OSのログイン認証がない限り
   * APIキーが生テキストで漏洩することを防ぎます。
   */
  async getApiKey(): Promise<string> {
    try {
      const data = await fs.readFile(this.credentialsPath, 'utf8');
      const json = JSON.parse(data);
      const creds = CredentialsSchema.parse(json);
      
      let apiKey = creds.geminiApiKey || '';
      
      // 暗号化されたキーがある場合は復号を試みる
      // 意図: 異なる端末や環境での不正な読み取りを防ぐため、OSレベルの暗号化を適用しています。
      // 'enc:' プレフィックスにより、未暗号化の旧データとの互換性も維持します。
      if (apiKey && safeStorage.isEncryptionAvailable() && apiKey.startsWith('enc:')) {
        try {
          const encryptedBuffer = Buffer.from(apiKey.slice(4), 'base64');
          apiKey = safeStorage.decryptString(encryptedBuffer);
        } catch (decryptError) {
          console.error('[ElectronSettingsManager] Failed to decrypt API key:', decryptError);
          // 復号失敗時は空を返すことで、不正なデータの利用によるエラーを回避します。
          apiKey = ''; 
        }
      }
      
      return apiKey || process.env.GEMINI_API_KEY || '';
    } catch {
      // ファイルが存在しない、またはパースエラーの場合は環境変数へフォールバック
      return process.env.GEMINI_API_KEY || '';
    }
  }

  /**
   * APIキーをセキュアに保存します。
   * 
   * 意図: 機密情報をディスクに書き出す前にOSレベルで暗号化し、
   * セキュリティのベストプラクティスを遵守します。
   */
  async saveApiKey(apiKey: string): Promise<void> {
    let keyToSave = apiKey;
    
    // 暗号化が利用可能な場合は暗号化してプレフィックスをつける
    if (apiKey && safeStorage.isEncryptionAvailable()) {
      try {
        const encryptedBuffer = safeStorage.encryptString(apiKey);
        keyToSave = `enc:${encryptedBuffer.toString('base64')}`;
      } catch (encryptError) {
        console.error('[ElectronSettingsManager] Failed to encrypt API key:', encryptError);
        // 暗号化に失敗した場合は、リスクを承知の上で生テキストで保存するか、
        // あるいは保存を中断するかの判断が必要ですが、ここでは可用性を優先し
        // ログ出力のみ行います。
      }
    }

    const creds: Credentials = { geminiApiKey: keyToSave };
    await this._safeWrite(this.credentialsPath, creds);
  }
}

// Electron固有のシングルトンインスタンスとして利用しやすいようにエクスポート
export default ElectronSettingsManager;
