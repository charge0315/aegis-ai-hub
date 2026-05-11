import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  RotateCcw, 
  Settings2, 
  Network, 
  Cpu,
  Edit3,
  Sparkles,
  AlertCircle,
  LayoutTemplate
} from 'lucide-react';
import { KnowledgeGraph } from './KnowledgeGraph';
import { SkillRegistry } from './SkillRegistry';
import { CategoryEditor } from './editors/CategoryEditor';
import { SystemSettings } from './editors/SystemSettings';
import { AIInsightsPanel } from './editors/AIInsightsPanel';
import { nexusApi } from '../api/nexusApi';
import type { NexusSettings, Skill, InterestCategory, TrendSuggestion, FeedConfig } from '../types';
import type { DialogType } from './CustomDialog';

interface UnifiedEditorProps {
  currentSettings: NexusSettings;
  onSave: (newSettings: NexusSettings) => Promise<void>;
  alert: (title: string, message: string, type?: DialogType) => Promise<void>;
  confirm: (title: string, message: string) => Promise<boolean>;
  prompt: (title: string, message: string, defaultValue?: string, placeholder?: string) => Promise<string | null>;
}

type Tab = 'editor' | 'graph' | 'skills' | 'system' | 'insights';

const DEFAULT_SKILLS: Skill[] = [
  { id: 'rss-fetch', name: 'RSS Fetcher', description: 'Retrieves raw signals from configured sources with deduplication.', agent: 'Discovery', type: 'tool', enabled: true },
  { id: 'semantic-filter', name: 'Semantic Filter', description: 'Analyzes article relevance using Gemini 3.1 embeddings.', agent: 'Architect', type: 'logic', enabled: true },
  { id: 'entity-extract', name: 'Entity Extraction', description: 'Identifies brands and keywords within text content.', agent: 'Curator', type: 'tool', enabled: true },
  { id: 'version-sync', name: 'Version Control Sync', description: 'Safely commits interest changes to the persistent layer.', agent: 'Archivist', type: 'action', enabled: true },
  { id: 'site-discovery', name: 'Source Discovery', description: 'Finds new authoritative RSS feeds based on current interests.', agent: 'Discovery', type: 'action', enabled: true },
  { id: 'reasoning-gen', name: 'Reasoning Engine', description: 'Generates user-friendly explanations for curated content.', agent: 'Curator', type: 'logic', enabled: true },
];

export const UnifiedEditor: React.FC<UnifiedEditorProps> = ({
  currentSettings,
  onSave,
  alert: customAlert,
  confirm: customConfirm,
  prompt: customPrompt
}) => {
  const [draft, setDraft] = useState<NexusSettings>(currentSettings);
  const [activeTab, setActiveTab] = useState<Tab>('editor');
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

  // 初回ロード時にAPIキーを取得
  React.useEffect(() => {
    nexusApi.getApiKey().then(setApiKey);
  }, []);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(currentSettings);

  const handleDiscoverTrends = async () => {
    // APIキーの有無を再確認
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
      console.log('[UnifiedEditor] Starting trend discovery...');
      const result = await nexusApi.discoverTrends();
      
      if (result.suggestions && result.suggestions.length > 0) {
        console.log(`[UnifiedEditor] Discovered ${result.suggestions.length} trends.`);
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
          return {
            ...prev,
            interests: {
              ...prev.interests,
              learned_keywords: newLearned
            }
          };
        });
        // ユーザーへの通知をあえて出さず、UIが更新されることで成功を伝える（体験の向上）
      } else {
        await customAlert('No New Trends', 'AI analyzed current feeds but did not find any new significant signals at this time.', 'info');
      }
    } catch (err) {
      console.error('Failed to discover trends:', err);
      const detail = err instanceof Error ? err.message : String(err);
      
      // ユーザーフレンドリーなエラーメッセージ
      let userMessage = 'An error occurred during trend analysis.';
      if (detail.includes('API key')) {
        userMessage = 'Invalid API key. Please check your settings.';
      } else if (detail.includes('quota') || detail.includes('429')) {
        userMessage = 'API rate limit exceeded. Please try again later.';
      } else if (detail.includes('safety')) {
        userMessage = 'Discovery stopped due to content safety filters. Try with different feeds.';
      }
      
      await customAlert('Discovery Failed', `${userMessage}\n\nTechnical Detail: ${detail.substring(0, 100)}...`, 'error');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handlePromoteKeyword = (keyword: string, category: string) => {
    setDraft(prev => {
      // 深いコピーを行い、イミュータブルに更新する
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

      return {
        ...prev,
        interests: {
          ...prev.interests,
          categories: newCategories,
          learned_keywords: newLearned
        }
      };
    });
  };

  const handleDismissKeyword = (keyword: string) => {
    setDraft(prev => {
      if (!prev.interests.learned_keywords) return prev;
      const newLearned = { ...prev.interests.learned_keywords };
      delete newLearned[keyword];
      return { 
        ...prev, 
        interests: { 
          ...prev.interests, 
          learned_keywords: newLearned 
        } 
      };
    });
  };

  const handleReorderCategories = (newOrder: string[]) => {    setDraft(prev => {
      const newCategories: Record<string, InterestCategory> = {};
      newOrder.forEach(key => {
        newCategories[key] = prev.interests.categories[key];
      });
      return {
        ...prev,
        interests: {
          ...prev.interests,
          categories: newCategories
        }
      };
    });
  };

  const handleAddCategory = async () => {
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
      // Gemini API を呼び出して提案を取得
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
      // 提案に失敗しても空のカテゴリを追加
      setDraft(prev => ({
        ...prev,
        interests: {
          ...prev.interests,
          categories: {
            ...prev.interests.categories,
            [name]: {
              emoji: '🆕',
              brands: [],
              keywords: [],
              score: 5,
              reason: 'Manually added category.'
            }
          }
        }
      }));
      setSelectedCategory(name);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(draft);
      await customAlert('Success', 'Configuration saved successfully!', 'success');
    } catch (err: unknown) {
      console.error('Save failed:', err);
      let message = 'Unknown error';
      
      if (err instanceof Error) {
        message = err.message;
        const axiosError = err as { response?: { data?: { details?: string } } };
        if (axiosError.response?.data?.details) {
          message = axiosError.response.data.details;
        }
      }
      
      if (message.includes('CONFLICT')) {
        const shouldReload = await customConfirm('Sync Conflict', 'The configuration on the server is newer. Would you like to discard your changes and reload the latest version?');
        if (shouldReload) {
          window.location.reload();
        }
      } else {
        await customAlert('Save Failed', `Failed to save configuration: ${message}`, 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(currentSettings);
  };

  const handleSaveApiKey = async () => {
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
  };

  const handleKeywordToggle = (category: string, keyword: string, enabled: boolean) => {
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
  };

  const handleBrandToggle = (category: string, brand: string, enabled: boolean) => {
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
  };

  const handleToggleSkill = (skillId: string) => {
    setDraft(prev => {
      const currentSkills = prev.interests.skills || DEFAULT_SKILLS;
      const newSkills = currentSkills.map(s =>
        s.id === skillId ? { ...s, enabled: !s.enabled } : s
      );
      return { ...prev, interests: { ...prev.interests, skills: newSkills } };
    });
  };

  const handleAddSkill = async () => {
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
      return { 
        ...prev, 
        interests: { 
          ...prev.interests, 
          skills: [...currentSkills, newSkill] 
        } 
      };
    });

    await customAlert('Skill Registered', `Successfully added "${name}" to the ${agent} cluster.`, 'success');
  };

  const handleRenameCategory = async (oldName: string) => {
    const newName = await customPrompt('Rename Category', `Enter a new name for "${oldName}":`, oldName);
    if (!newName || newName === oldName) return;

    if (draft.interests.categories[newName]) {
      await customAlert('Name Conflict', 'A category with this name already exists.', 'error');
      return;
    }

    setDraft(prev => {
      const newCategories: Record<string, InterestCategory> = {};
      const newFeedUrls: FeedConfig = { ...(prev.feed_urls || {}) };

      // 順序を維持するために既存のキーをループ
      Object.keys(prev.interests.categories).forEach(key => {
        if (key === oldName) {
          newCategories[newName] = prev.interests.categories[oldName];
          // フィード設定もリネーム
          if (newFeedUrls[oldName]) {
            newFeedUrls[newName] = newFeedUrls[oldName];
            delete newFeedUrls[oldName];
          }
        } else {
          newCategories[key] = prev.interests.categories[key];
        }
      });

      return {
        ...prev,
        interests: {
          ...prev.interests,
          categories: newCategories
        },
        feed_urls: newFeedUrls
      };
    });

    if (selectedCategory === oldName) {
      setSelectedCategory(newName);
    }
    };

    const handleEditEmoji = async (catName: string) => {
    const currentEmoji = draft.interests.categories[catName].emoji;
    const newEmoji = await customPrompt('Change Emoji', `Enter a new emoji for "${catName}":`, currentEmoji);
    if (!newEmoji || newEmoji === currentEmoji) return;

    setDraft(prev => {
      const newCategories = { ...prev.interests.categories };
      newCategories[catName] = { ...newCategories[catName], emoji: newEmoji };
      return { ...prev, interests: { ...prev.interests, categories: newCategories } };
    });
    };

    const handleDeleteCategory = async (catName: string) => {
    const confirmed = await customConfirm('Delete Category', `Are you sure you want to permanently delete the category "${catName}"? All associated brands and keywords will be removed.`);
    if (!confirmed) return;

    setDraft(prev => {
      const newCategories = { ...prev.interests.categories };
      delete newCategories[catName];

      const newFeedUrls = { ...prev.feed_urls };
      delete newFeedUrls[catName];

      return { 
        ...prev, 
        interests: { ...prev.interests, categories: newCategories },
        feed_urls: newFeedUrls
      };
    });
    if (selectedCategory === catName) {
      const keys = Object.keys(draft.interests.categories);
      const remaining = keys.filter(k => k !== catName);
      setSelectedCategory(remaining[0] || null);
    }
    };

  const handleUpdateCategory = (name: string, field: 'brands' | 'keywords', values: string[]) => {
    setDraft(prev => {
      const newCategories = { ...prev.interests.categories };
      newCategories[name] = { ...newCategories[name], [field]: values };
      return { ...prev, interests: { ...prev.interests, categories: newCategories } };
    });
  };

  const handleAISuggest = async (field: 'brands' | 'keywords') => {
    if (!selectedCategory) return;

    if (!apiKey) {
      const shouldGoToSettings = await customConfirm(
        'API Key Required',
        'Gemini API Key is not set. Would you like to go to System Settings to configure it now?'
      );
      if (shouldGoToSettings) {
        setActiveTab('system');
      }
      return;
    }

    if (field === 'brands') setIsSuggestingBrands(true);
    else setIsSuggestingKeywords(true);

    try {
      const suggestions = await nexusApi.suggestCategory(selectedCategory);
      const newItems = (suggestions[field] || []).slice(0, 5);
      
      setDraft(prev => {
        const currentItems = prev.interests.categories[selectedCategory][field];
        // 重複を除外して追加
        const combined = [...new Set([...currentItems, ...newItems])];
        
        const newCategories = { ...prev.interests.categories };
        newCategories[selectedCategory] = { 
          ...newCategories[selectedCategory], 
          [field]: combined 
        };
        
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
  };

  const handleRestructure = async () => {
    if (!apiKey) {
      await customAlert('API Key Required', 'Please set your Gemini API key in System Settings first.', 'warning');
      setActiveTab('system');
      return;
    }

    const countInput = await customPrompt(
      'AI Restructure', 
      'How many categories would you like to reorganize everything into?', 
      '10', 
      'Enter a number between 5 and 15'
    );
    
    if (!countInput) return;
    const targetCount = parseInt(countInput, 10);
    
    if (isNaN(targetCount) || targetCount < 5 || targetCount > 15) {
      await customAlert('Invalid Number', 'Please enter a valid number between 5 and 15.', 'error');
      return;
    }

    const confirmed = await customConfirm(
      'Deep AI Restructure',
      `This will completely transform your intelligence profile. AI will reorganize everything into ${targetCount} optimal categories, redistribute your existing feeds, and discover new high-quality sources for each group. Proceed?`
    );
    if (!confirmed) return;

    setIsSuggesting(true);
    setRestructureStep(`Phase 1/2: Reorganizing into ${targetCount} Categories...`);
    try {
      // 1. AI によるカテゴリ再編とフィードマッピングの実行
      const restructured = await nexusApi.restructureCategories(targetCount);
      
      setRestructureStep('Phase 2/2: Injecting New High-Quality Sources...');
      // 実際にはバックエンドが既に新規ソースを feedConfig にマージして返しているため、
      // ここでは少し待機して「思考中」感を出しつつ状態を反映
      await new Promise(resolve => setTimeout(resolve, 2000));

      setDraft(prev => ({
        ...prev,
        interests: {
          ...prev.interests,
          categories: restructured.categories,
          lastUpdated: Date.now()
        },
        feed_urls: restructured.feedConfig
      }));

      // 新しいプロファイルを構築
      const newDraft = {
        ...draft,
        interests: {
          ...draft.interests,
          categories: restructured.categories,
          lastUpdated: Date.now()
        },
        feed_urls: restructured.feedConfig
      };

      // 状態を更新
      setDraft(newDraft);
      setSelectedCategory(Object.keys(restructured.categories)[0] || null);
      
      setRestructureStep('Final Phase: Synchronizing with Backend...');
      // 自動保存を実行してバックエンドと同期
      await onSave(newDraft);
      
      setRestructureStep(null);
      await customAlert('Restructure Complete', 'AI has successfully transformed your intelligence profile. 10 new categories are ready with optimized feed sources and synced to backend.', 'success');
    } catch (err: unknown) {
      console.error('Restructure failed:', err);
      setRestructureStep(null);
      const errorMsg = err instanceof Error ? err.message : String(err);
      await customAlert('Restructure Failed', `An error occurred during the deep reorganization process: ${errorMsg}`, 'error');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleResetToDefaults = async () => {
    const confirmed = await customConfirm(
      'Restore Default Profile',
      'This will erase all your custom categories and feed settings and restore the system to its initial factory state. Your API key will be preserved. Proceed?'
    );
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await window.nexusApi.resetToDefaults();
      await customAlert('System Reset', 'Your intelligence profile has been restored to defaults. The application will now reload.', 'success');
      window.location.reload();
    } catch (err) {
      console.error('Reset failed:', err);
      await customAlert('Reset Failed', 'Failed to restore default settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!apiKey && activeTab !== 'system' && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-alert/10 border border-alert/20 rounded-2xl p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 text-alert">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">Gemini API Key is not configured. AI Suggestions and Intelligent Discovery are disabled.</p>
          </div>
          <button 
            onClick={() => setActiveTab('system')}
            className="px-4 py-1.5 bg-alert text-white text-xs font-bold uppercase rounded-lg shadow-lg shadow-alert/20"
          >
            Configure Now
          </button>
        </motion.div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              <Settings2 size={24} />
            </div>
            Nexus Command & Control
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure intelligence parameters, visualize knowledge, and manage agent skills.</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleRestructure}
            disabled={isSuggesting || isSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl transition-all font-bold text-xs uppercase tracking-wider disabled:opacity-50"
            title="AI-driven total profile reorganization (10 categories)"
          >
            <LayoutTemplate size={18} className={isSuggesting ? 'animate-pulse' : ''} />
            AI Restructure
          </button>

          {isDirty && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={handleReset}
              data-testid="reset-draft-button"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw size={16} />
              Reset Draft
            </motion.button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving || isSuggesting}
            data-testid="save-settings-button"
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-primary disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95"
          >
            <Save size={18} />
            {isSaving ? 'Synchronizing...' : isSuggesting ? 'Thinking...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-8">
        <TabButton 
          active={activeTab === 'editor'} 
          onClick={() => setActiveTab('editor')} 
          icon={<Edit3 size={18} />} 
          label="Nexus Editor" 
          data-testid="tab-editor"
        />
        <TabButton 
          active={activeTab === 'graph'} 
          onClick={() => setActiveTab('graph')} 
          icon={<Network size={18} />} 
          label="Knowledge Graph" 
          data-testid="tab-graph"
        />
        <TabButton 
          active={activeTab === 'skills'} 
          onClick={() => setActiveTab('skills')} 
          icon={<Cpu size={18} />} 
          label="Skill Registry" 
          data-testid="tab-skills"
        />
        <TabButton 
          active={activeTab === 'insights'} 
          onClick={() => setActiveTab('insights')} 
          icon={<Sparkles size={18} />} 
          label="AI Insights" 
          data-testid="tab-insights"
        />
        <TabButton 
          active={activeTab === 'system'} 
          onClick={() => setActiveTab('system')} 
          icon={<Settings2 size={18} />} 
          label="System Settings" 
          data-testid="tab-system"
        />
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px] relative">
        <AnimatePresence>
          {restructureStep && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md rounded-3xl border border-white/5 shadow-2xl"
            >
              <div className="p-10 flex flex-col items-center gap-6 text-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <Sparkles size={24} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">AI is Thinking...</h3>
                  <p className="text-indigo-300 font-mono text-xs uppercase tracking-[0.2em]">{restructureStep}</p>
                </div>
                <p className="text-slate-400 text-sm max-w-[300px]">
                  Analyzing your data and discovering the best news sources. This takes a few moments.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {activeTab === 'editor' && (
            <CategoryEditor 
              draft={draft}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              isSuggesting={isSuggesting}
              isSuggestingBrands={isSuggestingBrands}
              isSuggestingKeywords={isSuggestingKeywords}
              handleAddCategory={handleAddCategory}
              handleRenameCategory={handleRenameCategory}
              handleDeleteCategory={handleDeleteCategory}
              handleEditEmoji={handleEditEmoji}
              handleReorderCategories={handleReorderCategories}
              handleAISuggest={handleAISuggest}
              handleUpdateCategory={handleUpdateCategory}
              customPrompt={customPrompt}
            />
          )}

          {activeTab === 'graph' && (
            <motion.div
              key="graph"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <KnowledgeGraph 
                settings={draft} 
                onKeywordToggle={handleKeywordToggle}
                onBrandToggle={handleBrandToggle}
              />
            </motion.div>
          )}

          {activeTab === 'skills' && (
            <motion.div
              key="skills"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <SkillRegistry
                skills={draft.interests.skills}
                onToggleSkill={handleToggleSkill}
                onAddSkill={handleAddSkill}
              />
            </motion.div>
          )}
          {activeTab === 'insights' && (
            <AIInsightsPanel 
              draft={draft}
              isDiscovering={isDiscovering}
              handleDiscoverTrends={handleDiscoverTrends}
              handlePromoteKeyword={handlePromoteKeyword}
              handleDismissKeyword={handleDismissKeyword}
            />
          )}

          {activeTab === 'system' && (
            <SystemSettings 
              apiKey={apiKey}
              setApiKey={setApiKey}
              isSavingApiKey={isSavingApiKey}
              isSaving={isSaving}
              handleSaveApiKey={handleSaveApiKey}
              handleResetToDefaults={handleResetToDefaults}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  'data-testid'?: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label, 'data-testid': testId }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className={`flex items-center gap-2 py-4 border-b-2 transition-all font-semibold text-sm ${
      active 
        ? 'border-primary text-white' 
        : 'border-transparent text-slate-500 hover:text-slate-300'
    }`}
  >
    {icon}
    {label}
  </button>
);
