import React, { useState } from 'react';
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
import { UsageDashboard } from './editors/UsageDashboard';
import { useUnifiedEditorHandlers } from '../hooks/useUnifiedEditorHandlers';
import type { NexusSettings, UiSettings } from '../types';
import type { DialogType } from './CustomDialog';
import { useTranslation } from '../hooks/useTranslationHook';

/**
 * UnifiedEditor Component
 * 
 * Aegis Nexus の「神経中枢」とも言える統合エディタ。
 * 興味関心の定義、AIエージェントの能力調整、システム設定を一箇所で管理できます。
 * 単なるフォームではなく、AIによる構造最適化（Restructure）やトレンド発見など、
 * AIと人間が協力して「情報フィルタリングの定義」を磨き上げるためのハブとして設計されています。
 */

interface UnifiedEditorProps {
  currentSettings: NexusSettings;
  onSave: (newSettings: NexusSettings) => Promise<void>;
  alert: (title: string, message: string, type?: DialogType) => Promise<void>;
  confirm: (title: string, message: string) => Promise<boolean>;
  prompt: (title: string, message: string, defaultValue?: string, placeholder?: string) => Promise<string | null>;
  theme: UiSettings['theme'];
  setTheme: (theme: UiSettings['theme']) => void;
  autoLaunch: boolean;
  setAutoLaunch: (enabled: boolean) => void;
}

type Tab = 'editor' | 'graph' | 'skills' | 'system' | 'insights' | 'usage';

export const UnifiedEditor: React.FC<UnifiedEditorProps> = ({
  currentSettings,
  onSave,
  alert: customAlert,
  confirm: customConfirm,
  prompt: customPrompt,
  theme,
  setTheme,
  autoLaunch,
  setAutoLaunch
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('editor');
  const { t } = useTranslation();

  // ロジック層（Hook）との分離により、UI表現に集中
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
    isTranslating,
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
    setActiveTab,
    theme,
    setTheme
  });

  return (
    <div className="space-y-6">
      {/* 警告バナー: APIキー未設定時など、システムの根幹に関わる欠落をユーザーに通知 */}
      {!apiKey && activeTab !== 'system' && (
        <div className="bg-alert/10 border border-alert/20 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-alert">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{t.settings?.apiKeyAlert}</p>
          </div>
          <button 
            onClick={() => setActiveTab('system')}
            className="px-4 py-1.5 bg-alert text-white text-xs font-bold uppercase rounded-lg shadow-lg shadow-alert/20"
          >
            {t.settings?.configureNow}
          </button>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content-base flex items-center gap-3" data-testid="settings-title">
            <div className="p-2 bg-primary/20 rounded-lg text-primary">
              <Settings2 size={24} />
            </div>
            {t.settings?.title}
          </h1>
          <p className="text-sm text-content-muted mt-1">{t.settings?.subtitle}</p>
        </div>
        
        {/* AI Restructure: AIによるカテゴリ構造の最適化を提案する、本アプリの核心的機能の一つ */}
        <div className="flex gap-3">
          <button
            onClick={handleRestructure}
            data-testid="ai-restructure-button"
            disabled={isSuggesting || isSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl transition-all font-bold text-xs uppercase tracking-wider disabled:opacity-50"
          >
            <LayoutTemplate size={18} />
            {t.settings?.aiRestructure}
          </button>

          {isDirty && (
            <button
              onClick={handleReset}
              data-testid="reset-draft-button"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-content-muted hover:text-content-base transition-colors"
            >
              <RotateCcw size={16} />
              {t.settings?.reset}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving || isSuggesting || isTranslating}
            data-testid="save-settings-button"
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-primary disabled:bg-surface disabled:text-content-muted text-white rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95"
          >
            <Save size={18} />
            {isTranslating ? t.settings?.translating : isSaving ? t.settings?.saving : isSuggesting ? t.settings?.thinking : t.settings?.save}
          </button>
        </div>
      </div>

      {/* Tabs: 設定項目の論理的な分離 */}
      <div className="flex border-b border-content-muted/20 gap-8">
         <TabButton active={activeTab === 'editor'} onClick={() => setActiveTab('editor')} icon={<Edit3 size={18} />} label={t.settings?.tabs?.editor} data-testid="tab-editor" />
         <TabButton active={activeTab === 'graph'} onClick={() => setActiveTab('graph')} icon={<Network size={18} />} label={t.settings?.tabs?.graph} data-testid="tab-graph" />
         <TabButton active={activeTab === 'skills'} onClick={() => setActiveTab('skills')} icon={<Cpu size={18} />} label={t.settings?.tabs?.skills} data-testid="tab-skills" />
         <TabButton active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} icon={<Sparkles size={18} />} label={t.settings?.tabs?.insights} data-testid="tab-insights" />
         <TabButton active={activeTab === 'system'} onClick={() => setActiveTab('system')} icon={<Settings2 size={18} />} label={t.settings?.tabs?.system} data-testid="tab-system" />
         <TabButton active={activeTab === 'usage'} onClick={() => setActiveTab('usage')} icon={<LayoutTemplate size={18} />} label={t.settings?.tabs?.usage} data-testid="tab-usage" />
      </div>

      {/* Tab Content Area */}
      <div className="min-h-[600px] relative">
        {/* AI思考中オーバーレイ: 再構築などの重いAI処理中、システムが「真剣に検討している」ことを演出 */}
        {restructureStep && (
          <div className="absolute inset-0 z-50 bg-[#0a0b0c]/80 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl">
            <div className="sticky top-[40vh] p-10 flex flex-col items-center justify-center gap-6 text-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                <Sparkles size={24} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">{t.settings?.thinking}</h3>
                <p data-testid="restructure-step-text" className="text-indigo-300 font-mono text-xs uppercase tracking-[0.2em]">{restructureStep}</p>
              </div>
            </div>
          </div>
        )}

        <div className="relative">
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
            <KnowledgeGraph 
              settings={draft} 
              onKeywordToggle={handleKeywordToggle}
              onBrandToggle={handleBrandToggle}
            />
          )}

          {activeTab === 'skills' && (
            <SkillRegistry
              skills={draft.interests.skills}
              onToggleSkill={handleToggleSkill}
              onAddSkill={handleAddSkill}
            />
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
              theme={theme}
              setTheme={setTheme}
              autoLaunch={autoLaunch}
              setAutoLaunch={setAutoLaunch}
            />
          )}
          {activeTab === 'usage' && (
            <UsageDashboard />
          )}
        </div>
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
        ? 'border-primary text-content-base' 
        : 'border-transparent text-content-muted hover:text-content-base'
    }`}
  >
    {icon}
    {label}
  </button>
);
