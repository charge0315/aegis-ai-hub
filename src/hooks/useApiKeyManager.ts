import { useState, useEffect, useCallback } from 'react';
import { nexusApi } from '../api/nexusApi';
import { useTranslation } from './useTranslationHook';
import type { DialogType } from '../components/CustomDialog';
import type { Credentials } from '../types';

interface UseApiKeyManagerProps {
  customAlert: (title: string, message: string, type?: DialogType) => Promise<void>;
}

export function useApiKeyManager({ customAlert }: UseApiKeyManagerProps) {
  const { t } = useTranslation();
  const [credentials, setCredentials] = useState<Credentials>({
    activeProvider: 'google',
    activeModel: 'gemini-3.5-flash',
    google: {},
    anthropic: {},
    openai: {},
    ollama: { baseUrl: 'http://localhost:11434' }
  });
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);

  // 後方互換性のための単一キー（Google用）
  const apiKey = credentials.google?.apiKey || credentials.geminiApiKey || '';
  const setApiKey = (newKey: string) => {
    setCredentials(prev => ({
      ...prev,
      geminiApiKey: newKey,
      google: {
        ...prev.google,
        apiKey: newKey
      }
    }));
  };

  // コンポーネントマウント時に保存されている認証情報を読み込む
  useEffect(() => {
    nexusApi.getCredentials().then(setCredentials);
  }, []);

  /**
   * 認証情報全体をバックエンドに保存し、結果をダイアログで通知します
   */
  const handleSaveCredentials = useCallback(async (newCreds: Credentials) => {
    setIsSavingApiKey(true);
    try {
      await nexusApi.saveCredentials(newCreds);
      setCredentials(newCreds);
      await customAlert(t.dialog.success, t.handlers.apiKeySuccess, 'success');
    } catch (err) {
      console.error('Failed to save API credentials:', err);
      await customAlert(t.dialog.error, t.handlers.apiKeyFailed, 'error');
    } finally {
      setIsSavingApiKey(false);
    }
  }, [customAlert, t]);

  // 後方互換性用の保存関数
  const handleSaveApiKey = useCallback(async () => {
    setIsSavingApiKey(true);
    try {
      await nexusApi.saveCredentials(credentials);
      await customAlert(t.dialog.success, t.handlers.apiKeySuccess, 'success');
    } catch (err) {
      console.error('Failed to save API credentials:', err);
      await customAlert(t.dialog.error, t.handlers.apiKeyFailed, 'error');
    } finally {
      setIsSavingApiKey(false);
    }
  }, [credentials, customAlert, t]);

  return {
    apiKey,
    setApiKey,
    credentials,
    setCredentials,
    isSavingApiKey,
    handleSaveApiKey,
    handleSaveCredentials
  };
}
