/**
 * Aegis Nexus メインアプリケーションコンポーネント
 * 
 * このコンポーネントは、アプリケーションの全体構造、ナビゲーション、
 * およびグローバルな状態（設定、記事データ、UI設定）を管理します。
 * 
 * デザイン思想:
 * - サイドバーとメインコンテンツエリアの分離による直感的な操作感。
 * - Backdrop-blur（アクリル質感）を多用したモダンで洗練されたUI。
 * - Framer Motion を使用したスムーズなアニメーション遷移。
 */

import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { 
  Settings, 
  Search, 
  Layout, 
  Command,
  Menu,
  AlertTriangle,
  Tag,
  X
} from 'lucide-react';

import { AgentMonitor } from './components/AgentMonitor';
const UnifiedEditor = lazy(() => import('./components/UnifiedEditor').then(m => ({ default: m.UnifiedEditor })));
const CommandPalette = lazy(() => import('./components/CommandPalette').then(m => ({ default: m.CommandPalette })));
import { CustomDialog } from './components/CustomDialog';
import { useDialog } from './hooks/useDialog';
import { useNexusSync, useAgentEvents, nexusApi } from './api/nexusApi';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useUiSettingsSync } from './hooks/useUiSettingsSync';
import { LanguageProvider } from './hooks/LanguageProvider';
import { useTranslation } from './hooks/useTranslationHook';
import type { NexusSettings, Article } from './types';

// 新規コンポーネントとカスタムフックのインポート
import { FeedStatsHeader } from './components/FeedStatsHeader';
import { EmptyFeedState } from './components/EmptyFeedState';
import { StatusBar } from './components/StatusBar';
import { FeedView } from './components/FeedView';
import { OnboardingModal } from './components/OnboardingModal';
import { useArticleFilter } from './hooks/useArticleFilter';
import { useLicense } from './hooks/useLicense';

interface AppBodyProps {
  ui: ReturnType<typeof useUiSettingsSync>;
  settings: NexusSettings | null;
  articles: Article[];
  sync: (s: NexusSettings) => Promise<void>;
  refetch: () => Promise<void>;
  syncError: string | null;
  isSyncing: boolean;
  loading: boolean;
  lastRefreshed: Date | null;
}

/**
 * アプリケーションの主要な表示ロジックを担当する内部コンポーモント
 */
const AppBody: React.FC<AppBodyProps> = ({ ui, settings, articles, sync, refetch, syncError, isSyncing, loading, lastRefreshed }) => {
  const {
    feedSize,
    showImages,
    isJapaneseOnly,
    isInitialized, setIsInitialized,
    theme, setTheme
  } = ui;

  // UIの状態管理: 表示中のビュー、検索クエリ、パレットの開閉、サイドバーの状態
  const [currentView, setCurrentView] = useState<'feed' | 'settings'>('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [showOnboarding, setShowOnboarding] = useState(() => isInitialized === false);
  const { t } = useTranslation();

  // ローディング中または同期中をまとめて判定
  const showSyncOverlay = isSyncing || loading;

  // カスタムフックによるグローバル機能の注入
  useTheme(theme);
  useKeyboardShortcuts(useMemo(() => ({
    toggleCommandPalette: () => setIsCommandPaletteOpen(prev => !prev)
  }), []));

  /**
   * ナビゲーション処理
   * 指定されたビュー（フィードまたは設定）へ遷移し、必要に応じて検索クエリ（カテゴリ）を設定します。
   */
  const handleNavigate = useCallback((view: 'feed' | 'settings', category?: string) => {
    setCurrentView(view);
    if (category !== undefined) setSearchQuery(category);
  }, []);

  // 画面リサイズに応じたサイドバーの自動開閉
  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { dialog, alert: dialogAlert, confirm: dialogConfirm, prompt: dialogPrompt } = useDialog();

  const handleOnboardingSetup = useCallback(() => {
    setShowOnboarding(false);
    setIsInitialized(true);
    localStorage.setItem('nexus_initialized', 'true');
    setCurrentView('settings');
  }, [setIsInitialized]);

  const handleOnboardingSkip = useCallback(() => {
    setShowOnboarding(false);
    setIsInitialized(true);
    localStorage.setItem('nexus_initialized', 'true');
  }, [setIsInitialized]);

  // AIエージェントのイベント監視（データ更新時に再取得）
  const agents = useAgentEvents(refetch);

  // ライセンス状態とフィーチャーゲート
  const { featureGates } = useLicense();

  // カスタムフックを使用して記事のフィルタリング、ソート、グループ化、統計計算を実行
  const {
    filteredArticles,
    articlesByCategory,
    totalCount,
    japaneseRatio,
    categoryCount
  } = useArticleFilter({
    articles,
    searchQuery,
    isJapaneseOnly,
    settings
  });

  /**
   * 特定のカテゴリに属し、日付と言語の基本条件を満たす記事件数を計算するヘルパー
   */
  const getCategoryCount = useCallback((catName: string) => {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 90);
    return articles.filter(a => 
      a.category === catName && 
      new Date(a.date) > limitDate && 
      (!isJapaneseOnly || a.language === 'ja')
    ).length;
  }, [articles, isJapaneseOnly]);

  return (
    <div className="window-base flex h-screen text-slate-200 overflow-hidden font-sans pb-[28px]">
      {/* 初回起動オンボーディング */}
      {showOnboarding && (
        <OnboardingModal onSetup={handleOnboardingSetup} onSkip={handleOnboardingSkip} />
      )}

      {/* カスタムダイアログ: 全体で統一されたデザインの確認・警告・入力インターフェース */}
      {dialog.isOpen && (
        <CustomDialog 
          isOpen={dialog.isOpen} 
          type={dialog.type} 
          title={dialog.title} 
          message={dialog.message} 
          defaultValue={dialog.defaultValue} 
          placeholder={dialog.placeholder} 
          onConfirm={dialog.onConfirm} 
          onCancel={dialog.onCancel} 
        />
      )}

      {/* コマンドパレット: キーボード中心の操作を提供するパワーユーザー向けインターフェース */}
      <Suspense fallback={null}>
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          settings={settings}
          onNavigate={handleNavigate}
          onSync={() => settings ? sync(settings) : Promise.resolve()}
          onTriggerOrchestration={async (req) => { await nexusApi.triggerOrchestration(req); }}
        />
      </Suspense>

      {/* サイドバー: アクリル質感を活用したナビゲーションエリア */}
      <aside 
        style={{ width: isSidebarOpen ? '280px' : '0px' }} 
        className="relative z-40 flex-shrink-0 bg-black/40 backdrop-blur-2xl border-r border-white/5 overflow-hidden flex flex-col transition-all duration-300"
      >
        <div className="p-6 border-b border-white/5 drag">
          <h1 className="text-xl font-black text-white tracking-[0.2em] font-cyber no-drag">
            <span className="text-primary">A</span>EGIS <span className="neon-text-primary">NEXUS</span>
          </h1>
        </div>
        <nav role="navigation" aria-label="Main Navigation" className="flex-1 overflow-y-auto p-4 space-y-2 no-drag">
          <button 
            onClick={() => handleNavigate('feed')} 
            data-testid="nav-feed" 
            aria-current={currentView === 'feed' ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'feed' ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Layout size={20} />
            <span>{t.sidebar?.feed}</span>
          </button>
          <button 
            onClick={() => handleNavigate('settings')} 
            data-testid="nav-settings" 
            aria-current={currentView === 'settings' ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'settings' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Settings size={20} />
            <span>{t.sidebar?.settings}</span>
          </button>

          {/* カテゴリクイックフィルター */}
          {currentView === 'feed' && settings?.interests?.categories && (
            <div className="pt-4 border-t border-white/5 space-y-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 py-1.5 flex items-center gap-2">
                <Tag size={10} />
                <span>Categories</span>
              </div>
              
              <button
                onClick={() => setSearchQuery('')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all ${
                  searchQuery === '' 
                    ? 'bg-primary/20 text-white font-bold' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>All Signals</span>
                <span className="px-1.5 py-0.5 text-[10px] bg-white/5 text-slate-400 rounded-md">
                  {articles.length}
                </span>
              </button>

              {Object.entries(settings.interests.categories).map(([catName, catConfig]) => {
                const count = getCategoryCount(catName);
                const isActive = searchQuery.toLowerCase() === catName.toLowerCase();
                return (
                  <button
                    key={catName}
                    onClick={() => setSearchQuery(catName)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all ${
                      isActive 
                        ? 'bg-primary/20 text-white font-bold' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span>{catConfig.emoji || '🌐'}</span>
                      <span className="truncate">{catName}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded-md shrink-0 ${
                      isActive ? 'bg-primary text-white' : 'bg-white/5 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>
        {/* エージェントモニター: 背後で動作するAIエージェントの活動状況を可視化 */}
        <div className="p-4 border-t border-white/5 no-drag"><AgentMonitor agents={agents} /></div>
      </aside>

      {/* メインコンテンツ: 記事フィードまたは設定画面を動的に切り替え */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative">
        <header className="h-20 flex items-center justify-between px-8 bg-black/10 backdrop-blur-md border-b border-white/5 z-30 drag">
          <div className="flex items-center gap-6 no-drag">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              aria-label="Toggle sidebar"
              className="p-2 bg-white/5 rounded-xl"
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-lg font-black tracking-[0.15em] font-cyber neon-text-white uppercase">
                {currentView === 'settings' ? t.sidebar?.settings : 'Intelligence Feeds'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-4 no-drag">
            {currentView === 'feed' && (
              <div className="relative group flex items-center">
                <Search className="absolute left-4 text-slate-500" size={18} />
                <input 
                  type="text" 
                  placeholder={t.header?.search || 'Search...'} 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-10 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-all" 
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 text-slate-500 hover:text-white transition-colors"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            )}
            <button 
              onClick={() => setIsCommandPaletteOpen(true)} 
              aria-label="Open command palette"
              className="p-2 bg-white/5 rounded-xl"
            >
              <Command size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar no-drag" data-testid="main-content">
          {syncError && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400" data-testid="sync-error">
              <AlertTriangle size={20} />
              <p className="text-sm font-bold">Sync Error: {syncError}</p>
            </div>
          )}

          {currentView === 'feed' ? (
            <div className="max-w-[1600px] mx-auto space-y-8 relative">
              {/* 統計ヘッダー */}
              <FeedStatsHeader 
                totalArticles={totalCount}
                categoryCount={categoryCount}
                japaneseRatio={japaneseRatio}
                lastUpdated={lastRefreshed}
                onRefresh={() => refetch()}
                isSyncing={showSyncOverlay}
              />

              {/* 空状態または記事フィード表示 */}
              {filteredArticles.length === 0 && !showSyncOverlay ? (
                <EmptyFeedState 
                  hasSearchQuery={!!searchQuery}
                  onNavigateToSettings={() => handleNavigate('settings')}
                />
              ) : (
                <FeedView 
                  articlesByCategory={articlesByCategory}
                  settings={settings}
                  feedSize={feedSize}
                  showImages={showImages}
                  isSyncing={showSyncOverlay}
                />
              )}
            </div>
          ) : (
            settings ? (
              /* 設定エディタ: 統合された高度な設定インターフェース */
              <div data-testid="unified-editor-container">
                <Suspense fallback={<div className="flex items-center justify-center h-full text-content-muted">Loading...</div>}>
                  <UnifiedEditor
                    currentSettings={settings}
                    onSave={sync}
                    alert={dialogAlert}
                    confirm={dialogConfirm}
                    prompt={dialogPrompt}
                    theme={theme}
                    setTheme={setTheme}
                    autoLaunch={ui.autoLaunch}
                    setAutoLaunch={ui.setAutoLaunch}
                    featureGates={featureGates}
                  />
                </Suspense>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-content-muted" data-testid="settings-loading">Loading settings...</div>
            )
          )}
        </div>
      </main>

      {/* システムステータスバー */}
      <StatusBar 
        version="v5.5.0"
        connectionStatus={isSyncing ? 'syncing' : syncError ? 'disconnected' : 'connected'}
        lastSyncTime={lastRefreshed}
        agentCount={agents.length}
      />
    </div>
  );
};

/**
 * 外部ラッパーコンポーネント: 言語設定等のプロバイダーを適用
 */
const App: React.FC = () => {
  const ui = useUiSettingsSync();
  const { settings, articles, loading, sync, refetch, error: syncError, isSyncing, lastRefreshed } = useNexusSync();

  return (
    <LanguageProvider value={{ language: ui.language, setLanguage: ui.setLanguage }}>
      <AppBody ui={ui} settings={settings} articles={articles} sync={sync} refetch={refetch} syncError={syncError} isSyncing={isSyncing} loading={loading} lastRefreshed={lastRefreshed} />
    </LanguageProvider>
  );
};

export default App;
