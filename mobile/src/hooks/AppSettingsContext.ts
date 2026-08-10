import { createContext } from 'react';
import type { InterestCategory, LLMProviderConfig } from '../types';
import type { Lang } from '../i18n';

export interface AppSettingsValue {
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

export const AppSettingsContext = createContext<AppSettingsValue | null>(null);
