/**
 * Aegis Nexus Dashboard - Main Application Component
 * 
 * ダッシュボード全体の「中枢神経系」として機能するトップレベルコンポーネント。
 * バックエンド（エージェント群）からの情報を視覚化し、ユーザーが「知の統合」を
 * 効率的に行えるよう、フィードの閲覧とシステム設定のルーティングを管理します。
 * また、ウィンドウのリサイズや透過モード（Acrylic）などのネイティブ体験も統括します。
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Settings2,
  Search,
  RefreshCcw,
  Sparkles,
  ImageIcon,
  ImageOff,
  LayoutGrid,
  List as ListIcon,
  Languages
} from 'lucide-react';
import { ArticleCard } from './components/ArticleCard';
import { AgentMonitor } from './components/AgentMonitor';
import { UnifiedEditor } from './components/UnifiedEditor';
import { CommandPalette } from './components/CommandPalette';
import { CustomDialog } from './components/CustomDialog';
import { useDialog } from './hooks/useDialog';
import { useNexusSync, useAgentEvents, nexusApi } from './api/nexusApi';
import type { UiSettings } from './types';

const App: React.FC = () => {
  // --- PRIMARY CONTEXT STATE ---
  const [currentView, setCurrentView] = useState<'feed' | 'settings'>('feed');
  const { settings, articles, loading, sync, refetch } = useNexusSync();

  // --- COGNITIVE FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [feedSize, setFeedSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showImages, setShowImages] = useState(true);
  const [isJapaneseOnly, setIsJapaneseOnly] = useState(false);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [appIconError, setAppIconError] = useState(false);

  // --- RESPONSIVE STATE ---
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isCompact = windowWidth < 1024;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- UI表示設定の永続化 ---
  useEffect(() => {
    const loadUiSettings = async () => {
      try {
        if (nexusApi?.getUiSettings) {
          const saved = await nexusApi.getUiSettings();
          setIsJapaneseOnly(saved.jaOnly);
          setFeedSize(saved.viewMode === 'compact' ? 'small' : saved.viewMode === 'list' ? 'large' : 'medium');
          setShowImages(!saved.hideImages);
          setIsInitialized(saved.isInitialized);
        }
      } catch (err) {
        console.error("Failed to load UI settings:", err);
      }
    };
    void loadUiSettings();
  }, []);

  useEffect(() => {
    const save = async () => {
      try {
        if (nexusApi?.saveUiSettings && isInitialized !== null) {
          const viewMode = feedSize === 'small' ? 'compact' : feedSize === 'large' ? 'list' : 'grid';
          await nexusApi.saveUiSettings({ 
            jaOnly: isJapaneseOnly, 
            viewMode: viewMode as UiSettings['viewMode'], 
            hideImages: !showImages,
            isInitialized
          });
        }
      } catch (err) {
        console.error("Failed to save UI settings:", err);
      }
    };
    const timeout = setTimeout(() => { void save(); }, 100);
    return () => clearTimeout(timeout);
  }, [isJapaneseOnly, feedSize, showImages, isInitialized]);

  // --- INTERACTIVE DIALOG STATE ---
  const {
    dialog,
    alert: dialogAlert,
    confirm: dialogConfirm,
    prompt: dialogPrompt
  } = useDialog();

  // --- INITIAL SETUP CHECK ---
  useEffect(() => {
    if (settings && !loading && isInitialized === false) {
      const hasCategories = Object.keys(settings.interests.categories).length > 0;

      if (hasCategories) {
        void (async () => {
          const shouldOverwrite = await dialogConfirm(
            '既存の設定を検出',
            '既にブランドやキーワードの設定が存在します。これらをデフォルトのプロファイルで上書きしますか？（「キャンセル」を選択すると既存の設定を保持します）',
            'warning'
          );
          if (shouldOverwrite) {
            await nexusApi.resetToDefaults();
            void refetch();
          }
          // 上書きするかどうかにかかわらず、チェック自体は完了したので true に設定する
          setIsInitialized(true);
        })();
      } else {
        // 同期的な setState 呼び出しによるカスケードレンダリングを避けるため非同期化
        Promise.resolve().then(() => setIsInitialized(true));
      }
    }
  }, [settings, loading, isInitialized, dialogConfirm, refetch]);

  const agentEvents = useAgentEvents(useCallback(() => {
    void refetch(false);
  }, [refetch]));

  const filteredArticles = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return articles
      .filter(article => {
        const matchQuery = article.title.toLowerCase().includes(query) ||
                           article.category.toLowerCase().includes(query);
        const matchLang = isJapaneseOnly ? article.language === 'ja' : true;
        return matchQuery && matchLang;
      })
      .sort((a, b) => {
        if (a.language === 'ja' && b.language !== 'ja') return -1;
        if (a.language !== 'ja' && b.language === 'ja') return 1;
        return 0;
      });
  }, [articles, searchQuery, isJapaneseOnly]);

  const groupedArticles = useMemo(() => {
    const groups: Record<string, typeof articles> = {};
    if (settings) {
      Object.keys(settings.interests.categories).forEach(cat => {
        groups[cat] = filteredArticles.filter(a => a.category === cat);
      });
    }
    return groups;
  }, [filteredArticles, settings]);

  const handleShowFeeds = async (category: string) => {
    if (!settings || !settings.feedConfig) return;
    const group = settings.feedConfig[category];
    if (!group) return;

    await dialogAlert(
      `${category} - Active Nodes`,
      group.active.length > 0 ? group.active.join('\n') : 'No active nodes connected.',
      'info'
    );
  };

  return (
    <React.Fragment>
      {dialog && (
        <CustomDialog 
          {...dialog} 
          onConfirm={dialog.onConfirm}
          onCancel={dialog.onCancel}
        />
      )}

      <div className="window-base text-slate-200">
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          settings={settings}
          onNavigate={(v) => setCurrentView(v)}
          onSync={async () => { if (settings) await sync(settings); }}
          onTriggerOrchestration={async (req) => { await nexusApi.triggerOrchestration(req); }}
        />

        <aside className={`${isCompact ? 'w-20 px-3' : 'w-64 p-6'} sidebar-glass flex flex-col sticky top-0 h-screen z-30 transition-all duration-300 drag`}>
          <div className={`mb-10 mt-6 flex ${isCompact ? 'justify-center' : 'px-2'}`}>
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-2xl bg-primary/20 flex items-center justify-center">
              {!appIconError ? (
                <img
                  src="./app-icon.png"
                  alt="Nexus"
                  className="w-full h-full object-cover"
                  onError={() => setAppIconError(true)}
                />
              ) : (
                <span className="text-xs font-black text-primary">NEXUS</span>
              )}
            </div>
          </div>
          <nav className="space-y-4 flex-grow no-drag">
            <button data-testid="nav-feed" onClick={() => setCurrentView('feed')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'feed' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-white/5'}`}>
              <LayoutDashboard size={18} /> {!isCompact && <span className="text-sm font-bold">Intelligence Feed</span>}
            </button>
            <button data-testid="nav-settings" onClick={() => setCurrentView('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'settings' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-white/5'}`}>
              <Settings2 size={18} /> {!isCompact && <span className="text-sm font-bold">Nexus Command</span>}
            </button>
          </nav>
          <div className={`mt-auto py-6 border-t border-white/5 ${isCompact ? 'flex justify-center' : ''}`}>
            <AgentMonitor agents={agentEvents} compact={isCompact} />
          </div>
        </aside>

        <main className="flex-grow flex flex-col min-h-screen">
          <header className={`h-16 border-b border-white/5 sidebar-glass flex items-center justify-between ${isCompact ? 'px-4' : 'px-8'} sticky top-0 z-20 drag`}>
            <div className="flex items-center gap-6 flex-grow no-drag">
              <Search size={16} className="text-slate-500" />
              <input type="text" placeholder="Search signals..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent outline-none text-sm w-full text-white placeholder-slate-600" />
            </div>
            <div className="flex items-center gap-4 no-drag">
              {currentView === 'feed' && (
                <div className="flex items-center gap-2 mr-4 border-r border-white/10 pr-6">
                  <div className="flex bg-black/20 rounded-lg p-1 mr-2">
                    <button onClick={() => setFeedSize('small')} className={`p-1.5 rounded-md transition-all ${feedSize === 'small' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`} title="Small Grid">
                      <ListIcon size={14} />
                    </button>
                    <button onClick={() => setFeedSize('medium')} className={`p-1.5 rounded-md transition-all ${feedSize === 'medium' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`} title="Medium Grid">
                      <LayoutGrid size={14} />
                    </button>
                    <button onClick={() => setFeedSize('large')} className={`p-1.5 rounded-md transition-all ${feedSize === 'large' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`} title="Large Grid">
                      <LayoutDashboard size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => setIsJapaneseOnly(prev => !prev)}
                    className={`p-1.5 rounded-lg border transition-all flex items-center gap-1.5 px-2.5 ${isJapaneseOnly ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'}`}
                    title={isJapaneseOnly ? "Showing Japanese Only" : "Showing All Languages"}
                  >
                    <Languages size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">JA Only</span>
                  </button>

                  <button
                    onClick={() => setShowImages(!showImages)}
                    className={`p-1.5 rounded-lg border transition-all ${showImages ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-slate-400'}`}
                    title={showImages ? "Hide Images" : "Show Images"}
                  >
                    {showImages ? <ImageIcon size={16} /> : <ImageOff size={16} />}
                  </button>
                </div>
              )}
              <motion.button
                onClick={() => refetch()}
                disabled={loading}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <motion.div
                  animate={loading ? { rotate: 360 } : { rotate: 0 }}
                  transition={loading ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
                  className="flex items-center justify-center"
                >
                  <RefreshCcw size={18} />
                </motion.div>
              </motion.button>
            </div>
          </header>

          <div className={`flex-grow ${isCompact ? 'p-4' : 'p-8'}`}>
            {currentView === 'feed' ? (
              <div>
                <div className="mb-10">
                  <h2 className="text-4xl font-black text-white tracking-tight mb-2">Intelligence Feed</h2>
                  <p className="text-slate-500 text-sm font-medium">Synthesizing signals from your designated node cluster.</p>
                </div>

                {loading && articles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-6">
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles size={24} className="text-primary animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-bold text-white uppercase tracking-widest">Intercepting Signals</h3>
                      <p className="text-slate-500 text-xs font-mono">Initializing node handshake & decrypting packet streams...</p>
                    </div>
                  </div>
                ) : articles.length === 0 && !loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                    <p>No active signals detected. Check your feed configuration.</p>
                  </div>
                ) : (
                  <div className="space-y-16">
                    {Object.entries(groupedArticles).map(([category, catArticles]) => (
                      <section key={category}>
                        <button
                          onClick={(e) => { e.stopPropagation(); void handleShowFeeds(category); }}
                          className="group text-xl font-black mb-8 hover:text-primary transition-all flex items-center gap-4 uppercase tracking-tighter"
                        >
                          <span className="text-2xl">{settings?.interests.categories[category]?.emoji}</span>
                          {category}
                          <div className="h-px w-20 bg-white/5 group-hover:w-32 group-hover:bg-primary/30 transition-all"></div>
                          <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 opacity-60">{catArticles.length} SIGNALS</span>
                        </button>
                        <div className={`grid gap-6 ${feedSize === 'small' ? (isCompact ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6') : feedSize === 'large' ? (isCompact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2') : (isCompact ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4')}`}>
                          {catArticles.map((article, idx) => (
                            <ArticleCard key={article.link} article={article} index={idx} size={feedSize} showImages={showImages} />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              settings && <UnifiedEditor
                currentSettings={settings}
                onSave={sync}
                alert={dialogAlert}
                confirm={dialogConfirm}
                prompt={dialogPrompt}
              />
            )}
          </div>
        </main>
      </div>
    </React.Fragment>
  );
};

export default App;
