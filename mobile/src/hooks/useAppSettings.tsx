import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { InterestCategory, LLMProviderConfig } from '../types';
import {
  DEFAULT_LLM_CONFIG,
  loadApiKey,
  loadInterests,
  loadLLMConfig,
  loadLanguage,
  saveApiKey,
  saveInterests,
  saveLLMConfig,
  saveLanguage,
} from '../services/settingsStore';
import type { Lang } from '../i18n';

interface AppSettingsValue {
  ready: boolean;
  lang: Lang;
  setLang: (lang: Lang) => void;
  llmConfig: LLMProviderConfig;
  setLlmConfig: (config: LLMProviderConfig) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  interests: InterestCategory[];
  setInterests: (interests: InterestCategory[]) => void;
}

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<Lang>('ja');
  const [llmConfig, setLlmConfigState] = useState<LLMProviderConfig>(DEFAULT_LLM_CONFIG);
  const [apiKey, setApiKeyState] = useState('');
  const [interests, setInterestsState] = useState<InterestCategory[]>([]);

  useEffect(() => {
    (async () => {
      const [storedLang, storedConfig, storedInterests] = await Promise.all([loadLanguage(), loadLLMConfig(), loadInterests()]);
      const storedKey = (await loadApiKey(storedConfig.provider)) ?? '';
      setLangState(storedLang);
      setLlmConfigState(storedConfig);
      setInterestsState(storedInterests);
      setApiKeyState(storedKey);
      setReady(true);
    })();
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    saveLanguage(next);
  }, []);

  const setLlmConfig = useCallback((next: LLMProviderConfig) => {
    setLlmConfigState(next);
    saveLLMConfig(next);
    loadApiKey(next.provider).then((key) => setApiKeyState(key ?? ''));
  }, []);

  const setApiKey = useCallback(
    (key: string) => {
      setApiKeyState(key);
      saveApiKey(llmConfig.provider, key);
    },
    [llmConfig.provider],
  );

  const setInterests = useCallback((next: InterestCategory[]) => {
    setInterestsState(next);
    saveInterests(next);
  }, []);

  return (
    <AppSettingsContext.Provider value={{ ready, lang, setLang, llmConfig, setLlmConfig, apiKey, setApiKey, interests, setInterests }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}
