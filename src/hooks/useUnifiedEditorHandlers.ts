import { useState, useCallback, useEffect } from 'react';
import { nexusApi } from '../api/nexusApi';
import type { NexusSettings, InterestCategory, Skill, TrendSuggestion, FeedConfig, UiSettings } from '../types';
import type { DialogType } from '../components/CustomDialog';

const DEFAULT_SKILLS: Skill[] = [
  { id: 'rss-fetch', name: 'RSS Fetcher', description: 'Retrieves raw signals from configured sources with deduplication.', agent: 'Discovery', type: 'tool', enabled: true },
  { id: 'semantic-filter', name: 'Semantic Filter', description: 'Analyzes article relevance using Gemini 3.1 embeddings.', agent: 'Architect', type: 'logic', enabled: true },
  { id: 'entity-extract', name: 'Entity Extraction', description: 'Identifies brands and keywords within text content.', agent: 'Curator', type: 'tool', enabled: true },
  { id: 'version-sync', name: 'Version Control Sync', description: 'Safely commits interest changes to the persistent layer.', agent: 'Archivist', type: 'action', enabled: true },
  { id: 'site-discovery', name: 'Source Discovery', description: 'Finds new authoritative RSS feeds based on current interests.', agent: 'Discovery', type: 'action', enabled: true },
  { id: 'reasoning-gen', name: 'Reasoning Engine', description: 'Generates user-friendly explanations for curated content.', agent: 'Curator', type: 'logic', enabled: true },
];

interface UseUnifiedEditorHandlersProps {
  currentSettings: NexusSettings;
  onSave: (newSettings: NexusSettings) => Promise<void>;
  customAlert: (title: string, message: string, type?: DialogType) => Promise<void>;
  customConfirm: (title: string, message: string) => Promise<boolean>;
  customPrompt: (title: string, message: string, defaultValue?: string, placeholder?: string) => Promise<string | null>;
  setActiveTab: (tab: 'editor' | 'graph' | 'skills' | 'system' | 'insights') => void;
  theme: UiSettings['theme'];
  setTheme: (theme: UiSettings['theme']) => void;
}

export function useUnifiedEditorHandlers({
  currentSettings,
  onSave,
  customAlert,
  customConfirm,
  customPrompt,
  setActiveTab,
  theme,
  setTheme
}: UseUnifiedEditorHandlersProps) {
  const [draft, setDraft] = useState<NexusSettings>(currentSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isSuggestingBrands, setIsSuggestingBrands] = useState(false);
  const [isSuggestingKeywords, setIsSuggestingKeywords] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    Object.keys(currentSettings.interests.categories)[0] || null
  );
  const [restructureStep, setRestructureStep] = useState<string | null>(null);

  useEffect(() => {
    nexusApi.getApiKey().then(setApiKey);
  }, []);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(currentSettings);

  const handleDiscoverTrends = useCallback(async () => {
    const currentApiKey = await nexusApi.getApiKey();
    if (!currentApiKey) {
      const shouldGoToSettings = await customConfirm(
        'API Key Required',
        'Trend discovery requires a Gemini API Key. Would you like to go to System Settings to configure it?'
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
        await customAlert('No New Trends', 'AI analyzed current feeds but did not find any new significant signals at this time.', 'info');
      }
    } catch (err) {
      console.error('Failed to discover trends:', err);
      const detail = err instanceof Error ? err.message : String(err);
      await customAlert('Discovery Failed', `An error occurred during trend analysis.\n\nTechnical Detail: ${detail.substring(0, 100)}...`, 'error');
    } finally {
      setIsDiscovering(false);
    }
  }, [customAlert, customConfirm, setActiveTab]);

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
  }, []);

  const handleDismissKeyword = useCallback((keyword: string) => {
    setDraft(prev => {
      if (!prev.interests.learned_keywords) return prev;
      const newLearned = { ...prev.interests.learned_keywords };
      delete newLearned[keyword];
      return { ...prev, interests: { ...prev.interests, learned_keywords: newLearned } };
    });
  }, []);

  const handleReorderCategories = useCallback((newOrder: string[]) => {
    setDraft(prev => {
      const newCategories: Record<string, InterestCategory> = {};
      newOrder.forEach(key => {
        newCategories[key] = prev.interests.categories[key];
      });
      return { ...prev, interests: { ...prev.interests, categories: newCategories } };
    });
  }, []);

  const handleAddCategory = useCallback(async () => {
    const name = await customPrompt('New Category', 'Enter a name for the new intelligence category:', '', 'e.g. Quantum Computing');
    if (!name) return;
    if (draft.interests.categories[name]) {
      await customAlert('Category Exists', 'This category already exists in your configuration.', 'warning');
      return;
    }

    if (!apiKey) {
      const shouldGoToSettings = await customConfirm(
        'API Key Required',
        'Gemini API Key is not set. AI-powered category generation will be skipped. Would you like to go to System Settings to configure it?'
      );
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
              emoji: suggestions.emoji || '🆕',
              brands: (suggestions.brands || []).slice(0, 5),
              keywords: (suggestions.keywords || []).slice(0, 5),
              score: 5,
              reason: suggestions.reason || 'Automatically generated by Gemini.'
            }
          }
        }
      }));
      setSelectedCategory(name);
      await customAlert('Suggestions Ready', `Gemini has suggested 5 brands and 5 keywords for "${name}".`, 'success');
    } catch (err) {
      console.error('Failed to get suggestions:', err);
      setDraft(prev => ({
        ...prev,
        interests: {
          ...prev.interests,
          categories: {
            ...prev.interests.categories,
            [name]: { emoji: '🆕', brands: [], keywords: [], score: 5, reason: 'Manually added category.' }
          }
        }
      }));
      setSelectedCategory(name);
    } finally {
      setIsSuggesting(false);
    }
  }, [apiKey, customAlert, customConfirm, customPrompt, draft.interests.categories, setActiveTab]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(draft);
      await customAlert('Success', 'Configuration saved successfully!', 'success');
    } catch (err: unknown) {
      console.error('Save failed:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('CONFLICT')) {
        const shouldReload = await customConfirm('Sync Conflict', 'The configuration on the server is newer. Would you like to discard your changes and reload the latest version?');
        if (shouldReload) window.location.reload();
      } else {
        await customAlert('Save Failed', `Failed to save configuration: ${message}`, 'error');
      }
    } finally {
      setIsSaving(false);
    }
  }, [draft, onSave, customAlert, customConfirm]);

  const handleReset = useCallback(() => {
    setDraft(currentSettings);
  }, [currentSettings]);

  const handleSaveApiKey = useCallback(async () => {
    setIsSavingApiKey(true);
    try {
      await nexusApi.saveApiKey(apiKey);
      await customAlert('Success', 'Gemini API Key saved and applied.', 'success');
    } catch (err) {
      console.error('Failed to save API key:', err);
      await customAlert('Error', 'Failed to save API key.', 'error');
    } finally {
      setIsSavingApiKey(false);
    }
  }, [apiKey, customAlert]);

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
  }, []);

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
  }, []);

  const handleToggleSkill = useCallback((skillId: string) => {
    setDraft(prev => {
      const currentSkills = prev.interests.skills || DEFAULT_SKILLS;
      const newSkills = currentSkills.map(s =>
        s.id === skillId ? { ...s, enabled: !s.enabled } : s
      );
      return { ...prev, interests: { ...prev.interests, skills: newSkills } };
    });
  }, []);

  const handleAddSkill = useCallback(async () => {
    const name = await customPrompt('New Skill Name', 'Enter a name for the new agent capability:', '', 'e.g. Code Reviewer');
    if (!name) return;
    const description = await customPrompt('Description', `Enter a description for "${name}":`, '', 'What does this skill do?');
    if (!description) return;
    const agent = await customPrompt('Target Agent', 'Which agent should possess this skill?', 'Architect', 'Architect, Curator, Discovery, or Archivist');
    if (!agent) return;
    const typePrompt = await customPrompt('Skill Type', 'Enter skill type (tool, action, or logic):', 'tool');
    const type = (typePrompt === 'tool' || typePrompt === 'action' || typePrompt === 'logic') ? typePrompt : 'tool';
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    setDraft(prev => {
      const currentSkills = prev.interests.skills || DEFAULT_SKILLS;
      if (currentSkills.find(s => s.id === id)) {
        customAlert('ID Conflict', 'A skill with a similar name already exists.', 'warning');
        return prev;
      }
      const newSkill: Skill = { id, name, description, agent, type, enabled: true };
      return { ...prev, interests: { ...prev.interests, skills: [...currentSkills, newSkill] } };
    });
    await customAlert('Skill Registered', `Successfully added "${name}" to the ${agent} cluster.`, 'success');
  }, [customAlert, customPrompt]);

  const handleRenameCategory = useCallback(async (oldName: string) => {
    const newName = await customPrompt('Rename Category', `Enter a new name for "${oldName}":`, oldName);
    if (!newName || newName === oldName) return;
    if (draft.interests.categories[newName]) {
      await customAlert('Name Conflict', 'A category with this name already exists.', 'error');
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
  }, [customAlert, customPrompt, draft.interests.categories, selectedCategory]);

  const handleEditEmoji = useCallback(async (catName: string) => {
    const currentEmoji = draft.interests.categories[catName].emoji;
    const newEmoji = await customPrompt('Change Emoji', `Enter a new emoji for "${catName}":`, currentEmoji);
    if (!newEmoji || newEmoji === currentEmoji) return;
    setDraft(prev => {
      const newCategories = { ...prev.interests.categories };
      newCategories[catName] = { ...newCategories[catName], emoji: newEmoji };
      return { ...prev, interests: { ...prev.interests, categories: newCategories } };
    });
  }, [customPrompt, draft.interests.categories]);

  const handleDeleteCategory = useCallback(async (catName: string) => {
    const confirmed = await customConfirm('Delete Category', `Are you sure you want to permanently delete the category "${catName}"? All associated brands and keywords will be removed.`);
    if (!confirmed) return;
    setDraft(prev => {
      const newCategories = { ...prev.interests.categories };
      delete newCategories[catName];
      const newFeedConfig = { ...prev.feedConfig };
      delete newFeedConfig[catName];
      return { ...prev, interests: { ...prev.interests, categories: newCategories }, feedConfig: newFeedConfig };
    });
    if (selectedCategory === catName) {
      const keys = Object.keys(draft.interests.categories);
      const remaining = keys.filter(k => k !== catName);
      setSelectedCategory(remaining[0] || null);
    }
  }, [customConfirm, draft.interests.categories, selectedCategory]);

  const handleUpdateCategory = useCallback((name: string, field: 'brands' | 'keywords', values: string[]) => {
    setDraft(prev => {
      const newCategories = { ...prev.interests.categories };
      newCategories[name] = { ...newCategories[name], [field]: values };
      return { ...prev, interests: { ...prev.interests, categories: newCategories } };
    });
  }, []);

  const handleAISuggest = useCallback(async (field: 'brands' | 'keywords') => {
    if (!selectedCategory) return;
    if (!apiKey) {
      const shouldGoToSettings = await customConfirm('API Key Required', 'Gemini API Key is not set. Would you like to go to System Settings to configure it now?');
      if (shouldGoToSettings) setActiveTab('system');
      return;
    }
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
      await customAlert('AI Suggestions Added', `Gemini suggested ${newItems.length} new ${field} for "${selectedCategory}".`, 'success');
    } catch (err: unknown) {
      console.error(`Failed to get AI suggestions for ${field}:`, err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      await customAlert('AI Suggestion Failed', `Could not get suggestions from Gemini: ${errorMsg}`, 'error');
    } finally {
      if (field === 'brands') setIsSuggestingBrands(false);
      else setIsSuggestingKeywords(false);
    }
  }, [apiKey, customAlert, customConfirm, selectedCategory, setActiveTab]);

  const handleRestructure = useCallback(async () => {
    if (!apiKey) {
      await customAlert('API Key Required', 'Please set your Gemini API key in System Settings first.', 'warning');
      setActiveTab('system');
      return;
    }
    const countInput = await customPrompt('AI Restructure', 'How many categories would you like to reorganize everything into?', '10', 'Enter a number between 5 and 15');
    if (!countInput) return;
    const targetCount = parseInt(countInput, 10);
    if (isNaN(targetCount) || targetCount < 5 || targetCount > 15) {
      await customAlert('Invalid Number', 'Please enter a valid number between 5 and 15.', 'error');
      return;
    }
    const confirmed = await customConfirm('Deep AI Restructure', `This will completely transform your intelligence profile. AI will reorganize everything into ${targetCount} optimal categories, redistribute your existing feeds, and discover new high-quality sources for each group. Proceed?`);
    if (!confirmed) return;

    setIsSuggesting(true);
    setRestructureStep(`Phase 1/2: Reorganizing into ${targetCount} Categories...`);
    try {
      const restructured = await nexusApi.restructureCategories(targetCount);
      setRestructureStep('Phase 2/2: Injecting New High-Quality Sources...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      const newDraft: NexusSettings = {
        ...draft,
        interests: { ...draft.interests, categories: restructured.categories, lastUpdated: Date.now() },
        feedConfig: restructured.feedConfig
      };
      setDraft(newDraft);
      setSelectedCategory(Object.keys(restructured.categories)[0] || null);
      setRestructureStep('Final Phase: Synchronizing with Backend...');
      await onSave(newDraft);
      setRestructureStep(null);
      await customAlert('Restructure Complete', 'AI has successfully transformed your intelligence profile. Sync complete.', 'success');
    } catch (err: unknown) {
      console.error('Restructure failed:', err);
      setRestructureStep(null);
      const errorMsg = err instanceof Error ? err.message : String(err);
      await customAlert('Restructure Failed', `An error occurred: ${errorMsg}`, 'error');
    } finally {
      setIsSuggesting(false);
    }
  }, [apiKey, customAlert, customConfirm, customPrompt, draft, onSave, setActiveTab]);

  const handleResetToDefaults = useCallback(async () => {
    const confirmed = await customConfirm('Restore Default Profile', 'This will erase all custom categories and restore factory state. Proceed?');
    if (!confirmed) return;
    setIsSaving(true);
    try {
      await nexusApi.resetToDefaults();
      await customAlert('System Reset', 'Profile restored to defaults. Reloading...', 'success');
      window.location.reload();
    } catch (err) {
      console.error('Reset failed:', err);
      await customAlert('Reset Failed', 'Failed to restore default settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [customAlert, customConfirm]);

  return {
    draft, setDraft, apiKey, setApiKey, selectedCategory, setSelectedCategory,
    isSaving, isSuggesting, isDiscovering, isSuggestingBrands, isSuggestingKeywords, isSavingApiKey, restructureStep,
    isDirty,
    handleDiscoverTrends, handlePromoteKeyword, handleDismissKeyword, handleReorderCategories, handleAddCategory,
    handleSave, handleReset, handleSaveApiKey, handleKeywordToggle, handleBrandToggle, handleToggleSkill,
    handleAddSkill, handleRenameCategory, handleEditEmoji, handleDeleteCategory, handleUpdateCategory,
    handleAISuggest, handleRestructure, handleResetToDefaults,
    theme, setTheme
  };
}
