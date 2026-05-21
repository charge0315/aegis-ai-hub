import { useState, useMemo } from 'react';
import type { NexusSettings, Skill, UiSettings, EditorTab } from '../types';
import type { DialogType } from '../components/CustomDialog';
import { useTranslation } from './useTranslationHook';
import type { FeedSize } from './useUiSettingsSync';

// Sub-hooks
import { useApiKeyManager } from './useApiKeyManager';
import { useTrendActions } from './useTrendActions';
import { useCategoryActions } from './useCategoryActions';
import { useSkillActions } from './useSkillActions';
import { useProfileActions } from './useProfileActions';

interface UseUnifiedEditorHandlersProps {
  currentSettings: NexusSettings;
  onSave: (newSettings: NexusSettings) => Promise<void>;
  customAlert: (title: string, message: string, type?: DialogType) => Promise<void>;
  customConfirm: (title: string, message: string) => Promise<boolean>;
  customPrompt: (title: string, message: string, defaultValue?: string, placeholder?: string) => Promise<string | null>;
  setActiveTab: (tab: EditorTab) => void;
  theme: UiSettings['theme'];
  setTheme: (theme: UiSettings['theme']) => void;
  feedSize: FeedSize;
  setFeedSize: (size: FeedSize) => void;
}

export function useUnifiedEditorHandlers({
  currentSettings,
  onSave,
  customAlert,
  customConfirm,
  customPrompt,
  setActiveTab,
  theme,
  setTheme,
  feedSize,
  setFeedSize
}: UseUnifiedEditorHandlersProps) {
  const { t } = useTranslation();

  const DEFAULT_SKILLS: Skill[] = useMemo(() => [
    { id: 'rss-fetch', name: t.skills.rssFetch.name, description: t.skills.rssFetch.description, agent: 'Discovery', type: 'tool', enabled: true },
    { id: 'semantic-filter', name: t.skills.semanticFilter.name, description: t.skills.semanticFilter.description, agent: 'Architect', type: 'logic', enabled: true },
    { id: 'entity-extract', name: t.skills.entityExtract.name, description: t.skills.entityExtract.description, agent: 'Curator', type: 'tool', enabled: true },
    { id: 'version-sync', name: t.skills.versionSync.name, description: t.skills.versionSync.description, agent: 'Archivist', type: 'action', enabled: true },
    { id: 'site-discovery', name: t.skills.siteDiscovery.name, description: t.skills.siteDiscovery.description, agent: 'Discovery', type: 'action', enabled: true },
    { id: 'reasoning-gen', name: t.skills.reasoningGen.name, description: t.skills.reasoningGen.description, agent: 'Curator', type: 'logic', enabled: true },
  ], [t]);

  // Shared State
  const [draft, setDraft] = useState<NexusSettings>(currentSettings);

  // Derived State
  const isDirty = JSON.stringify(draft) !== JSON.stringify(currentSettings);

  // 1. API Key Management
  const apiKeyManager = useApiKeyManager({ customAlert });

  // 2. Trend Management
  const trendActions = useTrendActions({
    setDraft,
    customAlert,
    customConfirm,
    setActiveTab
  });

  // 3. Category Management
  const categoryActions = useCategoryActions({
    draft,
    setDraft,
    apiKey: apiKeyManager.apiKey,
    customAlert,
    customConfirm,
    customPrompt,
    setActiveTab
  });

  // 4. Skill Management
  const skillActions = useSkillActions({
    setDraft,
    customAlert,
    customPrompt,
    DEFAULT_SKILLS
  });

  // 5. Profile Management
  const profileActions = useProfileActions({
    draft,
    setDraft,
    onSave,
    apiKey: apiKeyManager.apiKey,
    customAlert,
    customConfirm,
    customPrompt,
    setActiveTab,
    setSelectedCategory: categoryActions.setSelectedCategory
  });

  return {
    // State
    draft, setDraft,
    apiKey: apiKeyManager.apiKey,
    setApiKey: apiKeyManager.setApiKey,
    selectedCategory: categoryActions.selectedCategory,
    setSelectedCategory: categoryActions.setSelectedCategory,

    // Status
    isSaving: profileActions.isSaving,
    isSuggesting: categoryActions.isSuggesting,
    isDiscovering: trendActions.isDiscovering,
    isSuggestingBrands: categoryActions.isSuggestingBrands,
    isSuggestingKeywords: categoryActions.isSuggestingKeywords,
    isSavingApiKey: apiKeyManager.isSavingApiKey,
    restructureStep: profileActions.restructureStep,
    isDirty,
    isTranslating: profileActions.isTranslating,

    // Handlers
    handleDiscoverTrends: trendActions.handleDiscoverTrends,
    handlePromoteKeyword: trendActions.handlePromoteKeyword,
    handleDismissKeyword: trendActions.handleDismissKeyword,
    handleReorderCategories: categoryActions.handleReorderCategories,
    handleAddCategory: categoryActions.handleAddCategory,
    handleSave: profileActions.handleSave,
    handleReset: profileActions.handleReset,
    handleSaveApiKey: apiKeyManager.handleSaveApiKey,
    handleKeywordToggle: categoryActions.handleKeywordToggle,
    handleBrandToggle: categoryActions.handleBrandToggle,
    handleToggleSkill: skillActions.handleToggleSkill,
    handleAddSkill: skillActions.handleAddSkill,
    handleRenameCategory: categoryActions.handleRenameCategory,
    handleEditEmoji: categoryActions.handleEditEmoji,
    handleDeleteCategory: categoryActions.handleDeleteCategory,
    handleUpdateCategory: categoryActions.handleUpdateCategory,
    handleAISuggest: categoryActions.handleAISuggest,
    handleRestructure: profileActions.handleRestructure,
    handleResetToDefaults: profileActions.handleResetToDefaults,

    // Theme & Feed (Passthrough)
    theme, setTheme,
    feedSize, setFeedSize
  };
}
