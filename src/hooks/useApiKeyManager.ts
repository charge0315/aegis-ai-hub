/**
 * Gemini APIキー管理用カスタムフック
 * 
 * 設定画面におけるAPIキーの取得、ローカルステートでの保持、
 * およびサーバー（Electronバックエンド）への保存処理を担当します。
 */

import { useState, useEffect, useCallback } from 'react';
import { nexusApi } from '../api/nexusApi';
import { useTranslation } from './useTranslationHook';
import type { DialogType } from '../components/CustomDialog';

interface UseApiKeyManagerProps {
  customAlert: (title: string, message: string, type?: DialogType) => Promise<void>;
}

export function useApiKeyManager({ customAlert }: UseApiKeyManagerProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState<string>('');
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);

  // コンポーネントマウント時に保存されているAPIキーを読み込む
  useEffect(() => {
    nexusApi.getApiKey().then(setApiKey);
  }, []);

  /**
   * APIキーをバックエンドに保存し、結果をダイアログで通知します
   */
  const handleSaveApiKey = useCallback(async () => {
    setIsSavingApiKey(true);
    try {
      await nexusApi.saveApiKey(apiKey);
      await customAlert(t.dialog.success, t.handlers.apiKeySuccess, 'success');
    } catch (err) {
      console.error('Failed to save API key:', err);
      await customAlert(t.dialog.error, t.handlers.apiKeyFailed, 'error');
    } finally {
      setIsSavingApiKey(false);
    }
  }, [apiKey, customAlert, t]);

  return {
    apiKey,
    setApiKey,
    isSavingApiKey,
    handleSaveApiKey
  };
}
