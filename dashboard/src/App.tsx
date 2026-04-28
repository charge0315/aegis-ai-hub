import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Settings2, 
  Shield, 
  Search, 
  RefreshCcw,
  AlertCircle,
  Loader2,
  Command as CommandIcon
} from 'lucide-react';
import { ArticleCard } from './components/ArticleCard';
import { AgentMonitor } from './components/AgentMonitor';
import { UnifiedEditor } from './components/UnifiedEditor';
import { CommandPalette } from './components/CommandPalette';
import { useNexusSync, useAgentEvents, nexusApi } from './api/nexusApi';

type View = 'feed' | 'settings';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('feed');
  const { settings, articles, loading, error, sync, refetch } = useNexusSync();
  const agentEvents = useAgentEvents();
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

  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="bg-deep-space min-h-screen text-slate-200 flex">
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
      <aside className="w-64 border-r border-white/5 bg-black/20 backdrop-blur-xl flex flex-col p-6 sticky top-0 h-screen z-30">
        <div className="flex items-center gap-3 mb-10 px-2" data-testid="app-logo">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield size={20} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white uppercase italic">Aegis <span className="text-primary">Nexus</span></span>
        </div>

        <nav className="space-y-2 flex-grow">
          <NavItem 
            active={currentView === 'feed'} 
            onClick={() => setCurrentView('feed')}
            icon={<LayoutDashboard size={18} />}
            label="Intelligence Feed"
            data-testid="nav-feed"
          />
          <NavItem 
            active={currentView === 'settings'} 
            onClick={() => setCurrentView('settings')}
            icon={<Settings2 size={18} />}
            label="Nexus Command"
            data-testid="nav-settings"
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <AgentMonitor agents={agentEvents} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 border-b border-white/5 bg-black/10 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-6">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                placeholder="Search signals (Ctrl+K for commands)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="search-input"
                className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <button 
              onClick={() => setIsCommandPaletteOpen(true)}
              data-testid="command-center-button"
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-slate-400 transition-all uppercase tracking-widest"
            >
              <CommandIcon size={12} />
              Command Center
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => void refetch()}
              data-testid="refresh-button"
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={() => handleTriggerOrchestration()}
              data-testid="run-orchestrator-button"
              className="px-4 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-full border border-primary/20 transition-all"
            >
              Run Orchestrator
            </button>
          </div>
        </header>

        {/* Content View */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {loading && articles.length === 0 ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-40 gap-4"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                  <Loader2 size={48} className="text-primary animate-spin relative z-10" />
                </div>
                <p className="text-slate-400 font-medium tracking-tight">Synchronizing with Global Intelligence Grid...</p>
              </motion.div>
            ) : error ? (
              <motion.div 
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-40 gap-4 text-alert"
              >
                <AlertCircle size={40} />
                <p className="font-medium text-lg">Nexus Connectivity Error</p>
                <p className="text-slate-500 text-sm -mt-2">{error}</p>
                <button 
                  onClick={() => void refetch()}
                  className="mt-2 px-6 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-white text-sm font-bold"
                >
                  Reconnect to Nexus
                </button>
              </motion.div>
            ) : currentView === 'feed' ? (
              <motion.div
                key="feed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-4xl font-extrabold text-white tracking-tighter">Intelligence Feed</h2>
                    <p className="text-slate-500 mt-1 font-medium">Synthesizing global signals for your designated interests.</p>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    {filteredArticles.length} active signals / {articles.length} total
                  </div>
                </div>

                {filteredArticles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredArticles.map((article, idx) => (
                      <motion.div
                        key={article.link}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                      >
                        <ArticleCard article={article} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-40 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                    <Search size={48} className="mx-auto text-slate-800 mb-4" />
                    <p className="text-slate-500 text-lg font-medium">No intelligence matches your current filter.</p>
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="mt-4 text-primary text-sm font-bold hover:underline"
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
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {settings && <UnifiedEditor currentSettings={settings} onSave={sync} />}
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
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
      active 
        ? "bg-primary/10 text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-primary/20" 
        : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
    )}
  >
    <span className={cn(
      "transition-transform duration-300",
      active ? "scale-110" : "group-hover:scale-110"
    )}>
      {icon}
    </span>
    <span className="text-xs font-bold tracking-widest uppercase">{label}</span>
    {active && (
      <motion.div 
        layoutId="activeNav"
        className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
      />
    )}
  </button>
);

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default App;
