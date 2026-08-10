import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { InterestCategory, LLMProviderConfig, LLMProviderId } from '../types';
import { LLM_PROVIDERS } from './llm/providers';
import { DEFAULT_INTERESTS } from '../data/sampleInterests';

const KEYS = {
  llmConfig: 'aegis.llmConfig',
  interests: 'aegis.interests',
  language: 'aegis.language',
} as const;

const SECURE_KEY_PREFIX = 'aegis.apiKey.';

export const DEFAULT_LLM_CONFIG: LLMProviderConfig = {
  provider: 'gemini',
  model: LLM_PROVIDERS.gemini.defaultModel,
};

export async function loadLLMConfig(): Promise<LLMProviderConfig> {
  const raw = await AsyncStorage.getItem(KEYS.llmConfig);
  return raw ? { ...DEFAULT_LLM_CONFIG, ...JSON.parse(raw) } : DEFAULT_LLM_CONFIG;
}

export async function saveLLMConfig(config: LLMProviderConfig): Promise<void> {
  await AsyncStorage.setItem(KEYS.llmConfig, JSON.stringify(config));
}

/** APIキーは OS ネイティブ Keychain / Keystore (expo-secure-store) で保護する。デスクトップ版の safeStorage と同等の思想。 */
export async function saveApiKey(provider: LLMProviderId, apiKey: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_KEY_PREFIX + provider, apiKey);
}

export async function loadApiKey(provider: LLMProviderId): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_KEY_PREFIX + provider);
}

export async function deleteApiKey(provider: LLMProviderId): Promise<void> {
  await SecureStore.deleteItemAsync(SECURE_KEY_PREFIX + provider);
}

export async function loadInterests(): Promise<InterestCategory[]> {
  const raw = await AsyncStorage.getItem(KEYS.interests);
  return raw ? JSON.parse(raw) : DEFAULT_INTERESTS;
}

export async function saveInterests(interests: InterestCategory[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.interests, JSON.stringify(interests));
}

export async function loadLanguage(): Promise<'ja' | 'en'> {
  const raw = await AsyncStorage.getItem(KEYS.language);
  return raw === 'en' ? 'en' : 'ja';
}

export async function saveLanguage(lang: 'ja' | 'en'): Promise<void> {
  await AsyncStorage.setItem(KEYS.language, lang);
}
