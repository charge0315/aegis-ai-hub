import { useState, useCallback } from 'react';
import { nexusApi } from '../api/nexusApi';
import { useTranslation } from './useTranslationHook';
import { useErrorHandler } from './useErrorHandler';
import type { NexusSettings, InterestCategory, FeedConfig, EditorTab } from '../types';
import type { DialogType } from '../components/CustomDialog';

interface UseCategoryActionsProps {
  draft: NexusSettings;
  setDraft: React.Dispatch<React.SetStateAction<NexusSettings>>;
  apiKey: string;
  customAlert: (title: string, message: string, type?: DialogType) => Promise<void>;
  customConfirm: (title: string, message: string) => Promise<boolean>;
  customPrompt: (title: string, message: string, defaultValue?: string, placeholder?: string) => Promise<string | null>;
  setActiveTab: (tab: EditorTab) => void;
}

export function useCategoryActions({
  draft,
  setDraft,
  apiKey,
  customAlert,
  customConfirm,
  customPrompt,
  setActiveTab
}: UseCategoryActionsProps) {
  const { t } = useTranslation();
  const { handleError } = useErrorHandler(customAlert);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    Object.keys(draft.interests.categories)[0] || null
  );
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSuggestingBrands, setIsSuggestingBrands] = useState(false);
  const [isSuggestingKeywords, setIsSuggestingKeywords] = useState(false);

  const handleAddCategory = useCallback(async () => {
    const name = await customPrompt(t.handlers.newCategory, t.handlers.newCategoryPrompt, '', t.handlers.newCategoryPlaceholder);
    if (!name) return;
    if (draft.interests.categories[name]) {
      await customAlert(t.dialog.categoryExists, t.handlers.categoryExists, 'warning');
      return;
    }

    if (!apiKey) {
      const shouldGoToSettings = await customConfirm(t.dialog.apiKeyRequired, t.handlers.apiKeyRequired);
      if (shouldGoToSettings) {
        setActiveTab('system');
        return;
      }
    }

    setIsSuggesting(true);
    try {
      const suggestions = await nexusApi.suggestCategory(name);
      setDraft(prev => ({
        ...prev,
        interests: {
          ...prev.interests,
          categories: {
            ...prev.interests.categories,
            [name]: {
              emoji: suggestions.emoji || '✨',
              brands: (suggestions.brands || []).slice(0, 5),
              keywords: (suggestions.keywords || []).slice(0, 5),
              score: 5,
              reason: suggestions.reason || 'AI Generated'
            }
          }
        }
      }));
      setSelectedCategory(name);
    } catch (err) {
      await handleError(err, t.dialog.suggestionsFailed, 'Failed to get suggestions');
    } finally {
      setIsSuggesting(false);
    }
  }, [apiKey, customAlert, customConfirm, customPrompt, draft.interests.categories, setActiveTab, t, setDraft, handleError]);

  const handleRenameCategory = useCallback(async (oldName: string) => {
    const newName = await customPrompt(t.dialog.renameCategory, t.handlers.renamePrompt.replace('{oldName}', oldName), oldName);
    if (!newName || newName === oldName) return;
    if (draft.interests.categories[newName]) {
      await customAlert(t.dialog.nameConflict, t.handlers.nameConflict, 'error');
      return;
    }
    setDraft(prev => {
      const newCategories: Record<string, InterestCategory> = {};
      const newFeedConfig: FeedConfig = { ...(prev.feedConfig || {}) };
      Object.keys(prev.interests.categories).forEach(key => {
        if (key === oldName) {
          newCategories[newName] = prev.interests.categories[oldName];
          if (newFeedConfig[oldName]) {
            newFeedConfig[newName] = newFeedConfig[oldName];
            delete newFeedConfig[oldName];
          }
        } else {
          newCategories[key] = prev.interests.categories[key];
        }
      });
      return { ...prev, interests: { ...prev.interests, categories: newCategories }, feedConfig: newFeedConfig };
    });
    if (selectedCategory === oldName) setSelectedCategory(newName);
  }, [customAlert, customPrompt, draft.interests.categories, selectedCategory, t, setDraft]);

  const handleDeleteCategory = useCallback(async (catName: string) => {
    const confirmed = await customConfirm(t.dialog.deleteCategory, t.handlers.deleteConfirm.replace('{catName}', catName));
    if (!confirmed) return;
    setDraft(prev => {
      const newCategories = { ...prev.interests.categories };
      delete newCategories[catName];
      const newFeedConfig = { ...prev.feedConfig };
      delete newFeedConfig[catName];
      return { ...prev, interests: { ...prev.interests, categories: newCategories }, feedConfig: newFeedConfig };
    });
  }, [customConfirm, t, setDraft]);

  const handleUpdateCategory = useCallback((name: string, field: 'brands' | 'keywords', values: string[]) => {
    setDraft(prev => {
      const newCategories = { ...prev.interests.categories };
      newCategories[name] = { ...newCategories[name], [field]: values };
      return { ...prev, interests: { ...prev.interests, categories: newCategories } };
    });
  }, [setDraft]);

  const handleAISuggest = useCallback(async (field: 'brands' | 'keywords') => {
    if (!selectedCategory || !apiKey) return;
    if (field === 'brands') setIsSuggestingBrands(true);
    else setIsSuggestingKeywords(true);
    try {
      const suggestions = await nexusApi.suggestCategory(selectedCategory);
      const newItems = (suggestions[field] || []).slice(0, 5);
      setDraft(prev => {
        const currentItems = prev.interests.categories[selectedCategory][field];
        const combined = [...new Set([...currentItems, ...newItems])];
        const newCategories = { ...prev.interests.categories };
        newCategories[selectedCategory] = { ...newCategories[selectedCategory], [field]: combined };
        return { ...prev, interests: { ...prev.interests, categories: newCategories } };
      });
    } catch (err) {
      await handleError(err, t.dialog.aiSuggestionFailed, 'AI Suggest failed');
    } finally {
      setIsSuggestingBrands(false);
      setIsSuggestingKeywords(false);
    }
  }, [apiKey, selectedCategory, t, setDraft, handleError]);

  const handleReorderCategories = useCallback((newOrder: string[]) => {
    setDraft(prev => {
      const newCategories: Record<string, InterestCategory> = {};
      newOrder.forEach(key => {
        newCategories[key] = prev.interests.categories[key];
      });
      return { ...prev, interests: { ...prev.interests, categories: newCategories } };
    });
  }, [setDraft]);

  const handleEditEmoji = useCallback(async (catName: string) => {
    const currentEmoji = draft.interests.categories[catName].emoji;
    const newEmoji = await customPrompt(t.dialog.changeEmoji, t.handlers.emojiPrompt.replace('{catName}', catName), currentEmoji);
    if (!newEmoji || newEmoji === currentEmoji) return;
    setDraft(prev => {
      const newCategories = { ...prev.interests.categories };
      newCategories[catName] = { ...newCategories[catName], emoji: newEmoji };
      return { ...prev, interests: { ...prev.interests, categories: newCategories } };
    });
  }, [customPrompt, draft.interests.categories, t, setDraft]);

  const handleKeywordToggle = useCallback((category: string, keyword: string, enabled: boolean) => {
    setDraft(prev => {
      const newCategories = { ...prev.interests.categories };
      const cat = { ...newCategories[category] };
      if (enabled) {
        if (!cat.keywords.includes(keyword)) cat.keywords = [...cat.keywords, keyword];
      } else {
        cat.keywords = cat.keywords.filter(k => k !== keyword);
      }
      newCategories[category] = cat;
      return { ...prev, interests: { ...prev.interests, categories: newCategories } };
    });
  }, [setDraft]);

  const handleBrandToggle = useCallback((category: string, brand: string, enabled: boolean) => {
    setDraft(prev => {
      const newCategories = { ...prev.interests.categories };
      const cat = { ...newCategories[category] };
      if (enabled) {
        if (!cat.brands.includes(brand)) cat.brands = [...cat.brands, brand];
      } else {
        cat.brands = cat.brands.filter(b => b !== brand);
      }
      newCategories[category] = cat;
      return { ...prev, interests: { ...prev.interests, categories: newCategories } };
    });
  }, [setDraft]);

  return {
    selectedCategory, setSelectedCategory,
    isSuggesting, isSuggestingBrands, isSuggestingKeywords,
    handleAddCategory, handleRenameCategory, handleDeleteCategory, handleUpdateCategory, handleAISuggest,
    handleReorderCategories, handleEditEmoji, handleKeywordToggle, handleBrandToggle
  };
}
