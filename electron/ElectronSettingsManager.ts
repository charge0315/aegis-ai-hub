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
   * 保存されている認証情報全体を取得し、必要に応じて復号します。
   */
  async getCredentials(): Promise<Credentials> {
    try {
      const data = await fs.readFile(this.credentialsPath, 'utf8');
      const json = JSON.parse(data);
      const creds = CredentialsSchema.parse(json);

      let needsReSave = false;

      // 各プロバイダーの API キーの復号処理
      const providers = ['google', 'anthropic', 'openai'] as const;
      for (const provider of providers) {
        const key = creds[provider]?.apiKey;
        if (key && safeStorage.isEncryptionAvailable()) {
          if (key.startsWith('enc:')) {
            try {
              const encryptedBuffer = Buffer.from(key.slice(4), 'base64');
              creds[provider]!.apiKey = safeStorage.decryptString(encryptedBuffer);
            } catch (decryptError) {
              console.error(`[ElectronSettingsManager] Failed to decrypt ${provider} API key:`, decryptError);
              creds[provider]!.apiKey = '';
            }
          } else {
            // 平文キーを検出 — 後で暗号化して再保存するフラグを立てる
            console.warn(`[ElectronSettingsManager] Plaintext API key detected for ${provider}. Will re-encrypt...`);
            needsReSave = true;
          }
        }
      }

      // 互換性用の古い geminiApiKey の復号処理
      const oldKey = creds.geminiApiKey;
      if (oldKey && safeStorage.isEncryptionAvailable()) {
        if (oldKey.startsWith('enc:')) {
          try {
            const encryptedBuffer = Buffer.from(oldKey.slice(4), 'base64');
            creds.geminiApiKey = safeStorage.decryptString(encryptedBuffer);
          } catch (decryptError) {
            console.error('[ElectronSettingsManager] Failed to decrypt old geminiApiKey:', decryptError);
            creds.geminiApiKey = '';
          }
        } else {
          needsReSave = true;
        }
      }

      // 後方互換性：もし旧形式でgeminiApiKeyだけがあった場合、google.apiKeyに移行する
      if (creds.geminiApiKey && (!creds.google || !creds.google.apiKey)) {
        if (!creds.google) creds.google = {};
        creds.google.apiKey = creds.geminiApiKey;
        needsReSave = true;
      }

      if (needsReSave) {
        await this.saveCredentials(creds);
      }

      return creds;
    } catch {
      // ファイルが存在しない、またはパースエラーの場合は親クラスのフォールバックへ
      return super.getCredentials();
    }
  }

  /**
   * 認証情報全体を安全に暗号化して保存します。
   */
  async saveCredentials(creds: Credentials): Promise<void> {
    // パラメータを書き換えないようディープコピーを作成
    const credsToSave = JSON.parse(JSON.stringify(creds)) as Credentials;

    if (safeStorage.isEncryptionAvailable()) {
      const providers = ['google', 'anthropic', 'openai'] as const;
      for (const provider of providers) {
        const key = credsToSave[provider]?.apiKey;
        if (key && !key.startsWith('enc:')) {
          try {
            const encryptedBuffer = safeStorage.encryptString(key);
            credsToSave[provider]!.apiKey = `enc:${encryptedBuffer.toString('base64')}`;
          } catch (encryptError) {
            console.error(`[ElectronSettingsManager] Failed to encrypt ${provider} API key:`, encryptError);
          }
        }
      }

      const oldKey = credsToSave.geminiApiKey;
      if (oldKey && !oldKey.startsWith('enc:')) {
        try {
          const encryptedBuffer = safeStorage.encryptString(oldKey);
          credsToSave.geminiApiKey = `enc:${encryptedBuffer.toString('base64')}`;
        } catch (encryptError) {
          console.error('[ElectronSettingsManager] Failed to encrypt old geminiApiKey:', encryptError);
        }
      }
    }

    const validated = CredentialsSchema.parse(credsToSave);
    await this._safeWrite(this.credentialsPath, validated);
  }

  /**
   * 保存されているAPIキーを取得します。
   */
  async getApiKey(): Promise<string> {
    const creds = await this.getCredentials();
    return creds.google?.apiKey || creds.geminiApiKey || process.env.GEMINI_API_KEY || '';
  }

  /**
   * APIキーをセキュアに保存します。
   */
  async saveApiKey(apiKey: string): Promise<void> {
    const creds = await this.getCredentials();
    creds.geminiApiKey = apiKey;
    if (!creds.google) creds.google = {};
    creds.google.apiKey = apiKey;
    await this.saveCredentials(creds);
  }
}

// Electron固有のシングルトンインスタンスとして利用しやすいようにエクスポート
export default ElectronSettingsManager;
