import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Settings2, 
  Shield, 
  Search, 
  RefreshCcw,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { ArticleCard } from './components/ArticleCard';
import { AgentMonitor } from './components/AgentMonitor';
import { UnifiedEditor } from './components/UnifiedEditor';
import { CommandPalette } from './components/CommandPalette';
import { useNexusSync, useAgentEvents, nexusApi, type WindowState } from './api/nexusApi';
import { CustomDialog } from './components/CustomDialog';
import { useDialog } from './hooks/useDialog';

type View = 'feed' | 'settings';
type CardSize = 'small' | 'medium' | 'large';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('feed');
  const [cardSize, setCardSize] = useState<CardSize>('medium');
  const { settings, articles, loading, error, sync, refetch } = useNexusSync();
  const agentEvents = useAgentEvents();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const { dialog, alert: customAlert, confirm: customConfirm, prompt: customPrompt } = useDialog();

  // Save window state and update local width for responsive UI
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      
      // Debounce the remote sync to avoid excessive API calls
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (settings) {
          const state: WindowState = {
            width: window.outerWidth,
            height: window.outerHeight,
            x: window.screenX,
            y: window.screenY
          };
          void nexusApi.syncSettings(settings, state).catch(console.error);
        }
      }, 1000);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [settings]);

  const isCompact = windowWidth < 1024;
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredArticles = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return articles.filter(article => 
      article.title.toLowerCase().includes(query) ||
      article.category.toLowerCase().includes(query) ||
      article.brand.toLowerCase().includes(query)
    );
  }, [articles, searchQuery]);

  const handleTriggerOrchestration = useCallback(async (requirements: string = "Refresh and find new insights based on current interests.") => {
    try {
      await nexusApi.triggerOrchestration(requirements);
    } catch (err) {
      console.error("Failed to trigger orchestration", err);
    }
  }, []);

  const handleNavigate = (view: View, category?: string) => {
    setCurrentView(view);
    if (category) {
      setSearchQuery(category);
    } else {
      setSearchQuery('');
    }
    setIsCommandPaletteOpen(false);
  };

  const handleForceSync = async () => {
    if (settings) {
      await sync(settings);
    }
  };

  const handleRefresh = async () => {
    try {
      // 1. 最新の記事を再取得
      await refetch();
      // 2. 自律ループもトリガー（バックグラウンド）
      void handleTriggerOrchestration();
      
      await customAlert('Feed Refreshing', 'Fetching latest signals and triggering autonomous discovery...', 'info');
    } catch (err) {
      console.error("Failed to refresh feed", err);
      await customAlert('Refresh Failed', 'Could not sync with the server.', 'error');
    }
  };

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
    console.log(`[handleShowFeeds] Request for category: "${category}"`);
    if (!settings) return;

    // カテゴリ名の完全一致または「ゲーム・配信」のようなケースでの柔軟なマッチングを試みる
    const feedKey = Object.keys(settings.feed_urls).find(k => 
      k === category || k.replace(/・/g, '') === category.replace(/・/g, '')
    );
    
    if (!feedKey || !settings.feed_urls[feedKey]) {
      console.warn(`[handleShowFeeds] No feed configuration found for: "${category}" (tried: "${feedKey}")`);
      await customAlert('Information', `No feed configuration found for "${category}".`, 'warning');
      return;
    }
    
    const feedData = settings.feed_urls[feedKey];
    const activeList = feedData.active.length > 0 
      ? `【Active】\n${feedData.active.map(url => `• ${url}`).join('\n')}` 
      : '【Active】\nNo active feeds.';
    
    const poolList = feedData.pool.length > 0 
      ? `\n\n【Pool】\n${feedData.pool.map(url => `• ${url}`).join('\n')}` 
      : '';

    const failureList = Object.keys(feedData.failures).length > 0
      ? `\n\n【Failure Status】\n${Object.entries(feedData.failures).map(([url, count]) => `• ${url} (${count} errors)`).join('\n')}`
      : '';

    await customAlert(
      `${settings.interests.categories[category]?.emoji || ''} ${category} - Signals`,
      `${activeList}${poolList}${failureList}`,
      'info'
    );
  };

  return (
    <div className="bg-deep-space min-h-screen text-slate-200 flex transition-all duration-300">
      <CustomDialog 
        isOpen={dialog.isOpen}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
        defaultValue={dialog.defaultValue}
        placeholder={dialog.placeholder}
      />

      {/* Command Palette */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        settings={settings}
        onNavigate={handleNavigate}
        onSync={handleForceSync}
        onTriggerOrchestration={handleTriggerOrchestration}
      />

      {/* Sidebar Navigation */}
      <aside className={`${isCompact ? 'w-20 px-3' : 'w-64 p-6'} border-r border-white/5 bg-black/20 backdrop-blur-xl flex flex-col sticky top-0 h-screen z-30 transition-all duration-300`}>
        <div className={`flex items-center ${isCompact ? 'justify-center' : 'gap-3 px-2'} mb-10 mt-6`} data-testid="app-logo">
          <div className="w-8 h-8 rounded-lg bg-primary flex-shrink-0 flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield size={20} className="text-white" />
          </div>
          {!isCompact && <span className="text-lg font-bold tracking-tight text-white uppercase italic">Aegis <span className="text-primary">Nexus</span></span>}
        </div>

        <nav className="space-y-4 flex-grow">
          <NavItem 
            active={currentView === 'feed'} 
            onClick={() => setCurrentView('feed')}
            icon={<LayoutDashboard size={18} />}
            label={isCompact ? '' : 'Intelligence Feed'}
            data-testid="nav-feed"
          />
          <NavItem 
            active={currentView === 'settings'} 
            onClick={() => setCurrentView('settings')}
            icon={<Settings2 size={18} />}
            label={isCompact ? '' : 'Nexus Command'}
            data-testid="nav-settings"
          />
        </nav>

        <div className={`mt-auto py-6 border-t border-white/5 ${isCompact ? 'flex justify-center' : ''}`}>
          <AgentMonitor agents={agentEvents} compact={isCompact} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col min-h-screen">
        {/* Header */}
        <header className={`h-16 border-b border-white/5 bg-black/10 backdrop-blur-md flex items-center justify-between ${isCompact ? 'px-4' : 'px-8'} sticky top-0 z-20`}>
          <div className="flex items-center gap-6 flex-grow">
            <div className={`relative ${isCompact ? 'w-full' : 'w-96'}`}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                placeholder={isCompact ? "Search..." : "Search signals (Ctrl+K for commands)"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="search-input"
                className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 ml-4 flex-shrink-0">
            {currentView === 'feed' && (
              <div className="flex bg-white/5 border border-white/10 rounded-lg p-1">
                {(['small', 'medium', 'large'] as CardSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setCardSize(size)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-md ${
                      cardSize === size 
                        ? 'bg-primary text-white shadow-lg' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title={`Card Size: ${size}`}
                  >
                    {size[0]}
                  </button>
                ))}
              </div>
            )}
            <button 
              onClick={handleRefresh}
              disabled={loading}
              className={`p-2 text-slate-400 hover:text-white transition-colors ${loading ? 'animate-spin' : ''}`}
              title="Sync with Aegis"
            >
              <RefreshCcw size={18} />
            </button>
            {!isCompact && (
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-slate-500">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                v5.0 NEXUS
              </div>
            )}
          </div>
        </header>

        {/* Dynamic View Content */}
        <div className={`flex-grow p-4 ${isCompact ? 'sm:p-6' : 'md:p-8'}`}>
          <AnimatePresence mode="wait">
            {currentView === 'feed' ? (
              <motion.div
                key="feed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-8">
                  <h2 className={`font-bold text-white ${isCompact ? 'text-2xl' : 'text-4xl'}`}>Intelligence Feed</h2>
                  <p className="text-slate-500 mt-2">Synthesizing global signals for your designated interests.</p>
                </div>

                {loading ? (
                  <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                    <Loader2 className="text-primary animate-spin" size={48} />
                    <p className="text-slate-500 font-medium">Scanning node cluster...</p>
                  </div>
                ) : error ? (
                  <div className="h-[60vh] flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-red-500/20 rounded-3xl bg-red-500/5">
                    <AlertCircle className="text-alert" size={48} />
                    <h3 className="text-xl font-bold text-white">Synchronization Error</h3>
                    <p className="text-slate-400 text-center max-w-md">{error}</p>
                    <button 
                      onClick={() => refetch()}
                      className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors font-semibold"
                    >
                      Retry Connection
                    </button>
                  </div>
                ) : Object.keys(groupedArticles).length > 0 ? (
                  <div className="space-y-12">
                    {Object.entries(groupedArticles).map(([category, catArticles]) => (
                      <section key={category} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <button 
                          onClick={() => handleShowFeeds(category)}
                          className="group flex items-center gap-3 mb-6 hover:translate-x-1 transition-transform"
                        >
                          <span className="text-2xl">{settings?.interests.categories[category]?.emoji}</span>
                          <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors uppercase tracking-tight">
                            {category}
                          </h3>
                          <div className="h-px flex-grow bg-white/5 group-hover:bg-primary/20 transition-colors ml-4 mr-2"></div>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            catArticles.length > 0 
                              ? 'text-slate-600 bg-white/5 border-white/5 group-hover:border-primary/20' 
                              : 'text-slate-500 bg-white/5 border-white/5 group-hover:border-alert/20'
                          } transition-colors`}>
                            {catArticles.length} SIGNALS
                          </span>
                        </button>
                        
                        {catArticles.length > 0 ? (
                          <div className={`grid gap-6 items-start auto-rows-min ${
                            cardSize === 'small' 
                              ? 'grid-cols-2 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-3' 
                              : cardSize === 'medium'
                                ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
                                : 'grid-cols-1 md:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2 gap-8'
                          }`}>
                            {catArticles.map((article, idx) => (
                              <ArticleCard 
                                key={`${article.link}-${idx}`} 
                                article={article} 
                                index={idx} 
                                size={cardSize}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-slate-600 gap-3 group/empty hover:border-white/10 transition-colors">
                            <p className="text-sm font-medium italic">No signals found in this category.</p>
                            <button 
                              onClick={() => handleShowFeeds(category)}
                              className="text-[10px] uppercase font-bold tracking-widest text-primary/60 hover:text-primary transition-colors"
                            >
                              Check Feed Configuration
                            </button>
                          </div>
                        )}
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-600">
                    <div className="p-6 bg-white/5 rounded-full">
                      <Search size={32} />
                    </div>
                    <p className="text-lg font-medium">No signals match your current query.</p>
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="text-primary hover:underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {settings && (
                  <UnifiedEditor 
                    currentSettings={settings} 
                    onSave={sync}
                    alert={customAlert}
                    confirm={customConfirm}
                    prompt={customPrompt}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  'data-testid'?: string;
}

const NavItem: React.FC<NavItemProps> = ({ active, onClick, icon, label, 'data-testid': testId }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active 
        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
    }`}
  >
    <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform`}>
      {icon}
    </div>
    {label && <span className="font-semibold text-sm">{label}</span>}
  </button>
);

export default App;
