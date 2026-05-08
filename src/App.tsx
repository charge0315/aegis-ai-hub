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
        if (nexusApi?.saveUiSettings) {
          const viewMode = feedSize === 'small' ? 'compact' : feedSize === 'large' ? 'list' : 'grid';
          await nexusApi.saveUiSettings({ 
            jaOnly: isJapaneseOnly, 
            viewMode: viewMode as any, 
            hideImages: !showImages 
          });
        }
      } catch (err) {
        console.error("Failed to save UI settings:", err);
      }
    };
    const timeout = setTimeout(() => { void save(); }, 500);
    return () => clearTimeout(timeout);
  }, [isJapaneseOnly, feedSize, showImages]);

  // --- INTERACTIVE DIALOG STATE ---
  const { 
    dialog, 
    alert: dialogAlert, 
    confirm: dialogConfirm, 
    prompt: dialogPrompt, 
    hideDialog 
  } = useDialog();

  // --- INITIAL SETUP CHECK ---
  useEffect(() => {
    if (settings && !loading) {
      const hasCategories = Object.keys(settings.interests.categories).length > 0;
      const isInitialized = localStorage.getItem('nexus_initialized');
      
      if (!isInitialized && hasCategories) {
        void (async () => {
          const shouldOverwrite = await dialogConfirm(
            '既存の設定を検出',
            '既にブランドやキーワードの設定が存在します。これらをデフォルトのプロファイルで上書きしますか？（「いいえ」を選択すると既存の設定を保持します）',
            'warning'
          );
          if (shouldOverwrite) {
            await nexusApi.resetToDefaults();
            void refetch();
          }
          localStorage.setItem('nexus_initialized', 'true');
        })();
      } else if (!isInitialized) {
        localStorage.setItem('nexus_initialized', 'true');
      }
    }
  }, [settings, loading, dialogConfirm, refetch]);

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
    if (!settings) return;
    const group = settings.feed_urls[category];
    if (!group) return;
    
    await dialogAlert(
      `${category} - Active Nodes`,
      group.active.length > 0 ? group.active.join('\n') : 'No active nodes connected.',
      'info'
    );
  };

  const handleNavigate = useCallback((view: 'feed' | 'settings', category?: string) => {
    setCurrentView(view);
    if (category) {
      setSearchQuery(category);
    }
  }, []);

  return (
    <React.Fragment>
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
        settings={settings}
        onNavigate={handleNavigate}
        onSync={async () => { if (settings) await sync(settings); }}
        onTriggerOrchestration={async (req) => { await nexusApi.triggerOrchestration(req); }}
      />
      
      {dialog && (
        <CustomDialog 
          {...dialog} 
          onConfirm={dialog.onConfirm}
          onCancel={hideDialog}
        />
      )}

      <div className="flex h-screen overflow-hidden bg-[#0a0a0c] text-slate-100 font-sans selection:bg-primary/30">
        <aside className={`${isCompact ? 'w-20' : 'w-72'} flex flex-col border-r border-white/5 bg-white/[0.02] backdrop-blur-3xl transition-all duration-500 ease-out z-40`}>
          <div className="p-8">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/20">
                <LayoutDashboard size={22} className="text-white" />
              </div>
              {!isCompact && (
                <div className="flex flex-col">
                  <span className="text-lg font-black tracking-tighter text-white uppercase italic">Aegis Nexus</span>
                  <span className="text-[10px] font-mono text-primary/70 tracking-widest leading-none">INTELLIGENCE V5</span>
                </div>
              )}
            </div>

            <nav className="space-y-3">
              {[
                { id: 'feed', icon: LayoutDashboard, label: 'Neural Feed' },
                { id: 'settings', icon: Settings2, label: 'System Nexus' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as any)}
                  className={`w-full flex items-center ${isCompact ? 'justify-center' : 'gap-4 px-5'} py-4 rounded-2xl transition-all duration-300 group relative ${
                    currentView === item.id 
                      ? 'bg-primary text-white shadow-xl shadow-primary/20 translate-x-1' 
                      : 'text-slate-500 hover:text-slate-100 hover:bg-white/5'
                  }`}
                >
                  <item.icon size={20} className={currentView === item.id ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} />
                  {!isCompact && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
                  {currentView === item.id && (
                    <motion.div 
                      layoutId="nav-glow"
                      className="absolute inset-0 bg-primary/20 blur-xl rounded-full -z-10"
                    />
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-6">
            <AgentMonitor agents={agentEvents} compact={isCompact} />
          </div>
        </aside>

        <main className="flex-1 flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-900/5 pointer-events-none" />
          
          <header className="h-24 flex items-center justify-between px-10 border-b border-white/5 bg-black/20 backdrop-blur-md z-30">
            <div className="flex items-center gap-6 flex-1 max-w-2xl">
              <div className="relative w-full group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Intercept signals by keyword or origin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pl-14 pr-5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/10 transition-all font-medium text-sm placeholder:text-slate-600 text-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 ml-8">
              <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                {[
                  { id: 'small', icon: LayoutGrid },
                  { id: 'medium', icon: LayoutGrid },
                  { id: 'large', icon: ListIcon }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setFeedSize(mode.id as any)}
                    className={`p-2.5 rounded-xl transition-all ${feedSize === mode.id ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <mode.icon size={18} className={mode.id === 'medium' ? 'scale-75' : ''} />
                  </button>
                ))}
              </div>

              <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                <button
                  onClick={() => setIsJapaneseOnly(!isJapaneseOnly)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${isJapaneseOnly ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Languages size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">JA ONLY</span>
                </button>
              </div>

              <button
                onClick={() => setShowImages(!showImages)}
                className={`p-3.5 rounded-2xl transition-all border ${showImages ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-400'}`}
              >
                {showImages ? <ImageIcon size={20} /> : <ImageOff size={20} />}
              </button>

              <button
                onClick={() => void refetch()}
                disabled={loading}
                className="p-3.5 bg-white/5 border border-white/5 rounded-2xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
              >
                <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar custom-scrollbar-v2">
            {currentView === 'feed' ? (
              <div className="p-10 max-w-[1920px] mx-auto min-h-full">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 w-full opacity-20 pointer-events-none">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-64 rounded-3xl bg-white/5 animate-pulse" />
                      ))}
                    </div>
                  </div>
                ) : articles.length === 0 && !loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-6">
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 text-center max-w-md">
                      <LayoutGrid size={48} className="mx-auto mb-4 opacity-20" />
                      <h3 className="text-white font-bold mb-2">No active signals detected</h3>
                      <p className="text-xs mb-6 leading-relaxed">指定されたノードクラスターからの信号を受信できませんでした。フィード設定を確認するか、ネットワーク接続を確かめてください。</p>
                      <button 
                        onClick={() => void refetch()}
                        className="px-8 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                      >
                        Reconnect Node
                      </button>
                    </div>
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
                            <ArticleCard key={idx} article={article} index={idx} size={feedSize} showImages={showImages} />
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
