import { useState, useCallback } from 'react';
import { nexusApi } from '../api/nexusApi';
import { useTranslation } from './useTranslationHook';
import { useErrorHandler } from './useErrorHandler';
import type { NexusSettings, TrendSuggestion, EditorTab } from '../types';
import type { DialogType } from '../components/CustomDialog';

interface UseTrendActionsProps {
  setDraft: React.Dispatch<React.SetStateAction<NexusSettings>>;
  customAlert: (title: string, message: string, type?: DialogType) => Promise<void>;
  customConfirm: (title: string, message: string) => Promise<boolean>;
  setActiveTab: (tab: EditorTab) => void;
}

export function useTrendActions({
  setDraft,
  customAlert,
  customConfirm,
  setActiveTab
}: UseTrendActionsProps) {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler(customAlert);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const handleDiscoverTrends = useCallback(async () => {
    const currentApiKey = await nexusApi.getApiKey();
    if (!currentApiKey) {
      const shouldGoToSettings = await customConfirm(
        t.dialog.apiKeyRequired,
        t.handlers.apiKeyRequired
      );
      if (shouldGoToSettings) {
        setActiveTab('system');
      }
      return;
    }

    setIsDiscovering(true);
    try {
      const result = await nexusApi.discoverTrends();
      if (result.suggestions && result.suggestions.length > 0) {
        setDraft(prev => {
          const newLearned = { ...(prev.interests.learned_keywords || {}) };
          result.suggestions.forEach((s: TrendSuggestion) => {
            if (!newLearned[s.value]) {
              newLearned[s.value] = {
                category: s.category,
                reason: s.reason,
                type: s.type,
                confidence: s.confidence,
                context: s.context,
                detectedAt: new Date().toISOString()
              };
            }
          });
          return { ...prev, interests: { ...prev.interests, learned_keywords: newLearned } };
        });
      } else {
        await customAlert(t.dialog.noTrends, t.handlers.noTrends, 'info');
      }
    } catch (err) {
      await handleError(err, t.dialog.discoveryFailed, 'An error occurred during trend analysis.');
    } finally {
      setIsDiscovering(false);
    }
  }, [customAlert, customConfirm, setActiveTab, t, setDraft, handleError]);

  const handlePromoteKeyword = useCallback((keyword: string, category: string) => {
    setDraft(prev => {
      const newCategories = { ...prev.interests.categories };
      if (newCategories[category]) {
        const cat = { ...newCategories[category] };
        if (!cat.keywords.includes(keyword)) {
          cat.keywords = [...cat.keywords, keyword];
          newCategories[category] = cat;
        }
      }
      const newLearned = { ...(prev.interests.learned_keywords || {}) };
      delete newLearned[keyword];
      return { ...prev, interests: { ...prev.interests, categories: newCategories, learned_keywords: newLearned } };
    });
  }, [setDraft]);

  const handleDismissKeyword = useCallback((keyword: string) => {
    setDraft(prev => {
      if (!prev.interests.learned_keywords) return prev;
      const newLearned = { ...prev.interests.learned_keywords };
      delete newLearned[keyword];
      return { ...prev, interests: { ...prev.interests, learned_keywords: newLearned } };
    });
  }, [setDraft]);

  return {
    isDiscovering,
    handleDiscoverTrends,
    handlePromoteKeyword,
    handleDismissKeyword
  };
}
