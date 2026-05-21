import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Settings, 
  Search, 
  Layout, 
  Command,
  Menu,
  AlertTriangle,
  Loader2
} from 'lucide-react';

import { ArticleCard } from './components/ArticleCard';
import { AgentMonitor } from './components/AgentMonitor';
import { UnifiedEditor } from './components/UnifiedEditor';
import { CommandPalette } from './components/CommandPalette';
import { CustomDialog } from './components/CustomDialog';
import { useDialog } from './hooks/useDialog';
import { useNexusSync, useAgentEvents, nexusApi } from './api/nexusApi';
import { useTheme } from './hooks/useTheme';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useUiSettingsSync } from './hooks/useUiSettingsSync';
import { LanguageProvider } from './hooks/LanguageProvider';
import { useTranslation } from './hooks/useTranslationHook';
import type { NexusSettings, Article } from './types';

interface AppBodyProps {
  ui: ReturnType<typeof useUiSettingsSync>;
  settings: NexusSettings | null;
  articles: Article[];
  sync: (s: NexusSettings) => Promise<void>;
  refetch: () => Promise<void>;
  syncError: string | null;
  isSyncing: boolean;
}

const AppBody: React.FC<AppBodyProps> = ({ ui, settings, articles, sync, refetch, syncError, isSyncing }) => {
  const {
    feedSize,
    showImages,
    isJapaneseOnly,
    isInitialized, setIsInitialized,
    theme, setTheme
  } = ui;

  const [currentView, setCurrentView] = useState<'feed' | 'settings'>('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const { t } = useTranslation();

  useTheme(theme);
  useKeyboardShortcuts(useMemo(() => ({
    toggleCommandPalette: () => setIsCommandPaletteOpen(prev => !prev)
  }), []));

  const handleNavigate = useCallback((view: 'feed' | 'settings', category?: string) => {
    setCurrentView(view);
    if (category) setSearchQuery(category);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { dialog, alert: dialogAlert, confirm: dialogConfirm, prompt: dialogPrompt } = useDialog();

  useEffect(() => {
    if (isInitialized === false) {
      setIsInitialized(true);
      localStorage.setItem('nexus_initialized', 'true');
    }
  }, [isInitialized, setIsInitialized]);

  const agents = useAgentEvents(refetch);

  const filteredArticles = useMemo(() => {
    let result = [...articles];
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 90);
    result = result.filter(a => new Date(a.date) > limitDate);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => 
        a.category?.toLowerCase().includes(q) || 
        a.title.toLowerCase().includes(q)
      );
    }
    if (isJapaneseOnly) result = result.filter(a => a.language === 'ja');
    
    return result.sort((a, b) => {
      if (a.language === 'ja' && b.language !== 'ja') return -1;
      if (a.language !== 'ja' && b.language === 'ja') return 1;
      return (b.score || 0) - (a.score || 0);
    });
  }, [articles, searchQuery, isJapaneseOnly]);

  const articlesByCategory = useMemo(() => {
    const groups: Record<string, Article[]> = {};
    
    if (settings?.interests?.categories) {
      Object.keys(settings.interests.categories).forEach(cat => {
        groups[cat] = [];
      });
    }
    
    filteredArticles.forEach(a => {
      const cat = a.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(a);
    });

    return Object.fromEntries(
      Object.entries(groups).filter(([, items]) => items.length > 0)
    );
  }, [filteredArticles, settings]);

  return (
    <div className="flex h-screen bg-[#0a0b0c] text-slate-200 overflow-hidden font-sans">
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

      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
        settings={settings}
        onNavigate={handleNavigate} 
        onSync={() => settings ? sync(settings) : Promise.resolve()}
        onTriggerOrchestration={async (req) => { await nexusApi.triggerOrchestration(req); }}
      />

      <aside 
        style={{ width: isSidebarOpen ? '280px' : '0px' }} 
        className="relative z-40 flex-shrink-0 bg-black/40 backdrop-blur-2xl border-r border-white/5 overflow-hidden flex flex-col transition-all duration-300"
      >
        <div className="p-6 border-b border-white/5 drag">
          <h1 className="text-lg font-bold text-white tracking-widest no-drag">NEXUS</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 no-drag">
          <button onClick={() => handleNavigate('feed')} data-testid="nav-feed" className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'feed' ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <Layout size={20} />
            <span>{t.sidebar?.feed}</span>
          </button>
          <button onClick={() => handleNavigate('settings')} data-testid="nav-settings" className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'settings' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <Settings size={20} />
            <span>{t.sidebar?.settings}</span>
          </button>
        </nav>
        <div className="p-4 border-t border-white/5 no-drag"><AgentMonitor agents={agents} /></div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative">
        <header className="h-20 flex items-center justify-between px-8 bg-black/10 backdrop-blur-md border-b border-white/5 z-30 drag">
          <div className="flex items-center gap-6 no-drag">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white/5 rounded-xl"><Menu size={20} /></button>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold">{currentView === 'settings' ? t.sidebar?.settings : t.sidebar?.feed}</h2>
              {isSyncing && (
                <div className="flex items-center gap-2 text-[10px] text-primary animate-pulse font-bold">
                  <Loader2 size={10} className="animate-spin" />
                  <span>SYNCHRONIZING...</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 no-drag">
            {currentView === 'feed' && (
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input type="text" placeholder={t.header?.search || 'Search...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-all" />
              </div>
            )}
            <button onClick={() => setIsCommandPaletteOpen(true)} className="p-2 bg-white/5 rounded-xl"><Command size={20} /></button>
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
            <div className="max-w-[1600px] mx-auto space-y-12">
              {Object.entries(articlesByCategory).map(([category, items]) => (
                <div key={category} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold text-white uppercase tracking-wider">{category}</h3>
                    <div className="h-px flex-1 bg-white/10"></div>
                    <span className="text-xs font-medium text-slate-500">{items.length} Signals</span>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((article, idx) => (
                      <ArticleCard key={`${category}-${idx}`} article={article} index={idx} size={feedSize} showImages={showImages} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            settings ? (
              <div data-testid="unified-editor-container">
                <UnifiedEditor 
                  currentSettings={settings} 
                  onSave={sync} 
                  alert={dialogAlert} 
                  confirm={dialogConfirm} 
                  prompt={dialogPrompt} 
                  theme={theme} 
                  setTheme={setTheme} 
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-content-muted" data-testid="settings-loading">Loading settings...</div>
            )
          )}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const ui = useUiSettingsSync();
  const { settings, articles, sync, refetch, error: syncError, isSyncing } = useNexusSync();

  return (
    <LanguageProvider value={{ language: ui.language, setLanguage: ui.setLanguage }}>
      <AppBody ui={ui} settings={settings} articles={articles} sync={sync} refetch={refetch} syncError={syncError} isSyncing={isSyncing} />
    </LanguageProvider>
  );
};

export default App;
