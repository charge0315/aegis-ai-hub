import { useState, useEffect } from 'react';
import { nexusApi } from '../api/nexusApi';
import type { UiSettings } from '../types';
import type { Language } from '../i18n/translations';

/**
 * UIの表示設定（フィードサイズ、画像表示、言語、テーマ等）をバックエンドと同期し、永続化するためのカスタムフック。
 * 
 * 【設計思想】
 * - ユーザーの好みに応じた表示状態をアプリケーション全体で共有し、セッションを超えて維持します。
 * - UIの操作（トグル等）に対して即座に状態を更新しつつ、バックエンドへの保存は効率的に行う同期メカニズムを提供します。
 * 
 * 【実装の意図】
 * - コンポーネントのマウント時に `nexusApi.getUiSettings()` を呼び出し、ローカルステートを初期化します。
 *   `isInitialized` を用いて、初期化が終わるまで保存処理が走らないように制御しています。
 * - 保存処理には 100ms のデバウンス（setTimeout/clearTimeout）を導入しており、
 *   ユーザーが連続して設定を変更した場合（スライダー操作など）でも、APIコールを最小限に抑え
 *   パフォーマンスを維持しています。
 */
export const useUiSettingsSync = () => {
  const [feedSize, setFeedSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showImages, setShowImages] = useState(true);
  const [isJapaneseOnly, setIsJapaneseOnly] = useState(false);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [theme, setTheme] = useState<UiSettings['theme']>('system');
  const [language, setLanguage] = useState<Language>('ja');
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(15);

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
        setRefreshInterval(saved.refreshInterval ?? 15);
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
            autoLaunch,
            refreshInterval,
            obsidianVaultPath: 'C:\\Users\\charg\\Documents\\Personal Space',
            enableObsidianAutoSync: true
          });
        }
      } catch (err) {
        console.error("Failed to save UI settings:", err);
      }
    };
    const timeout = setTimeout(() => { void save(); }, 100);
    return () => clearTimeout(timeout);
  }, [isJapaneseOnly, feedSize, showImages, isInitialized, theme, language, autoLaunch, refreshInterval]);

  return {
    feedSize, setFeedSize,
    showImages, setShowImages,
    isJapaneseOnly, setIsJapaneseOnly,
    isInitialized, setIsInitialized,
    theme, setTheme,
    language, setLanguage,
    autoLaunch, setAutoLaunch,
    refreshInterval, setRefreshInterval
  };
};
