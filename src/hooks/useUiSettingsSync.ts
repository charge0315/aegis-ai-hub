import { useState, useEffect } from 'react';
import { nexusApi } from '../api/nexusApi';
import type { UiSettings } from '../types';
import type { Language } from '../i18n/translations';

export const useUiSettingsSync = () => {
  const [feedSize, setFeedSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showImages, setShowImages] = useState(true);
  const [isJapaneseOnly, setIsJapaneseOnly] = useState(false);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [theme, setTheme] = useState<UiSettings['theme']>('system');
  const [language, setLanguage] = useState<Language>('ja');
  const [autoLaunch, setAutoLaunch] = useState(false);

  // Load UI settings
  useEffect(() => {
    const loadUiSettings = async () => {
      try {
        const saved = await nexusApi.getUiSettings();
        setIsJapaneseOnly(saved.jaOnly);
        setFeedSize(saved.viewMode === 'compact' ? 'small' : saved.viewMode === 'list' ? 'large' : 'medium');
        setShowImages(!saved.hideImages);
        setIsInitialized(saved.isInitialized);
        setTheme(saved.theme || 'system');
        setLanguage(saved.language || 'ja');
        setAutoLaunch(saved.autoLaunch || false);
      } catch (err) {
        console.error("Failed to load UI settings:", err);
      }
    };
    void loadUiSettings();
  }, []);

  // Save UI settings (with debounce)
  useEffect(() => {
    const save = async () => {
      try {
        if (isInitialized !== null) {
          const viewMode = feedSize === 'small' ? 'compact' : feedSize === 'large' ? 'list' : 'grid';
          await nexusApi.saveUiSettings({ 
            jaOnly: isJapaneseOnly, 
            viewMode: viewMode as UiSettings['viewMode'], 
            hideImages: !showImages,
            isInitialized,
            theme,
            language,
            autoLaunch
          });
        }
      } catch (err) {
        console.error("Failed to save UI settings:", err);
      }
    };
    const timeout = setTimeout(() => { void save(); }, 100);
    return () => clearTimeout(timeout);
  }, [isJapaneseOnly, feedSize, showImages, isInitialized, theme, language, autoLaunch]);

  return {
    feedSize, setFeedSize,
    showImages, setShowImages,
    isJapaneseOnly, setIsJapaneseOnly,
    isInitialized, setIsInitialized,
    theme, setTheme,
    language, setLanguage,
    autoLaunch, setAutoLaunch
  };
};
