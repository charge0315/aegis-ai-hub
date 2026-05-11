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
import { useUnifiedEditorHandlers } from '../hooks/useUnifiedEditorHandlers';
import type { NexusSettings } from '../types';
import type { DialogType } from './CustomDialog';

interface UnifiedEditorProps {
  currentSettings: NexusSettings;
  onSave: (newSettings: NexusSettings) => Promise<void>;
  alert: (title: string, message: string, type?: DialogType) => Promise<void>;
  confirm: (title: string, message: string) => Promise<boolean>;
  prompt: (title: string, message: string, defaultValue?: string, placeholder?: string) => Promise<string | null>;
}

type Tab = 'editor' | 'graph' | 'skills' | 'system' | 'insights';

export const UnifiedEditor: React.FC<UnifiedEditorProps> = ({
  currentSettings,
  onSave,
  alert: customAlert,
  confirm: customConfirm,
  prompt: customPrompt
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('editor');

  const {
    draft,
    apiKey,
    setApiKey,
    selectedCategory,
    setSelectedCategory,
    isSaving,
    isSuggesting,
    isDiscovering,
    isSuggestingBrands,
    isSuggestingKeywords,
    isSavingApiKey,
    restructureStep,
    isDirty,
    handleDiscoverTrends,
    handlePromoteKeyword,
    handleDismissKeyword,
    handleReorderCategories,
    handleAddCategory,
    handleSave,
    handleReset,
    handleSaveApiKey,
    handleKeywordToggle,
    handleBrandToggle,
    handleToggleSkill,
    handleAddSkill,
    handleRenameCategory,
    handleEditEmoji,
    handleDeleteCategory,
    handleUpdateCategory,
    handleAISuggest,
    handleRestructure,
    handleResetToDefaults
  } = useUnifiedEditorHandlers({
    currentSettings,
    onSave,
    customAlert,
    customConfirm,
    customPrompt,
    setActiveTab
  });

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
            title="AI-driven total profile reorganization"
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
