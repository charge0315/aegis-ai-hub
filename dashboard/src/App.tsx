import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Settings2, 
  Search, 
  RefreshCcw,
  Sparkles,
  X
} from 'lucide-react';
import { ArticleCard } from './components/ArticleCard';
import { AgentMonitor } from './components/AgentMonitor';
import { UnifiedEditor } from './components/UnifiedEditor';
import { CommandPalette } from './components/CommandPalette';
import { useNexusSync, useAgentEvents, nexusApi } from './api/nexusApi';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'feed' | 'settings'>('feed');
  const { settings, articles, loading, sync, refetch } = useNexusSync();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // --- RESPONSIVE STATE ---
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isCompact = windowWidth < 1024;
  const sidebarWidth = isCompact ? 80 : 256;

  // --- SIMPLE DIALOG STATE ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogContent, setDialogContent] = useState<React.ReactNode>(null);

  const agentEvents = useAgentEvents(useCallback(() => {
    void refetch(false);
  }, [refetch]));

  const filteredArticles = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return articles.filter(article => 
      article.title.toLowerCase().includes(query) ||
      article.category.toLowerCase().includes(query)
    );
  }, [articles, searchQuery]);

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

    const feedKey = Object.keys(settings.feed_urls).find(k => 
      k === category || k.replace(/・/g, '') === category.replace(/・/g, '')
    );
    
    const feedData = settings.feed_urls[feedKey || ''] || { active: [], pool: [] };
    
    setDialogTitle(category);
    setDialogContent(
      <div className="space-y-6">
        <div>
          <p className="text-[10px] uppercase font-black tracking-widest text-primary mb-3">Active Signal Sources</p>
          <div className="space-y-2">
            {feedData.active.length > 0 ? feedData.active.map((url: string) => (
              <div key={url} className="bg-white/5 p-2 rounded-xl text-[10px] truncate border border-white/5 font-mono text-slate-300">{url}</div>
            )) : <p className="text-[10px] opacity-40 italic">No active feeds.</p>}
          </div>
        </div>

        <button
          onClick={async () => {
            setDialogTitle("Searching...");
            setDialogContent(<p className="text-center py-10 animate-pulse text-xs text-slate-500 font-bold uppercase tracking-widest">AI Discovery in Progress...</p>);
            try {
              const proposals = await nexusApi.getProposals();
              const catProposals = (proposals.sites as any[] || []).filter((s: any) => s.category === category);
              
              setDialogTitle(`Discovery: ${category}`);
              setDialogContent(
                <div className="space-y-4">
                  {catProposals.length > 0 ? catProposals.map((s: any) => (
                    <div key={s.url} className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                      <p className="font-bold text-sm text-white mb-1">{s.name}</p>
                      <p className="text-[10px] opacity-50 mb-3 truncate font-mono">{s.url}</p>
                      <p className="text-[11px] text-slate-300 italic mb-4">"{s.reason}"</p>
                      <button 
                        onClick={async () => {
                          const newSettings = { ...settings };
                          if (!newSettings.feed_urls[category]) newSettings.feed_urls[category] = { active: [], pool: [], failures: {} };
                          if (!newSettings.feed_urls[category].active.includes(s.url)) {
                            newSettings.feed_urls[category].active.push(s.url);
                            await sync(newSettings);
                          }
                          setIsDialogOpen(false);
                        }}
                        className="w-full py-2 bg-primary text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-primary/20"
                      >Add to Feed</button>
                    </div>
                  )) : <p className="text-center py-10 opacity-50 text-xs">No new verified sources found.</p>}
                  <button onClick={() => setIsDialogOpen(false)} className="w-full py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Close</button>
                </div>
              );
            } catch (err) {
              setDialogTitle("Connection Error");
              setDialogContent(<p className="text-xs text-alert text-center py-4">Failed to consult Discovery Agent.</p>);
            }
          }}
          className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/10 shadow-xl transition-all"
        >
          <Sparkles size={16} className="text-primary" /> AI DISCOVERY
        </button>
      </div>
    );
    setIsDialogOpen(true);
  };

  return (
    <React.Fragment>
      {/* --- IRONCLAD CENTERED DIALOG --- */}
      {isDialogOpen && (
        <div style={{ 
          position: 'fixed', 
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 999999, 
          display: 'grid', 
          placeItems: 'center',
          // SHIFT CENTER: The dialog container itself handles the offset
          paddingLeft: `${sidebarWidth}px`,
          pointerEvents: 'none' // Click through empty area to backdrop
        }}>
          {/* Global Backdrop - Covers entire screen */}
          <div 
            onClick={() => setIsDialogOpen(false)} 
            style={{ 
              position: 'fixed', 
              inset: 0, 
              backgroundColor: 'rgba(0,0,0,0.85)', 
              backdropFilter: 'blur(16px)', 
              WebkitBackdropFilter: 'blur(16px)', 
              cursor: 'pointer',
              zIndex: -1,
              pointerEvents: 'auto'
            }}
          ></div>
          
          {/* Dialog Box - Content events are active */}
          <div style={{ 
            width: '100%', 
            maxWidth: '460px', 
            backgroundColor: '#0f172a', 
            border: '1px solid rgba(255,255,255,0.2)', 
            borderRadius: '32px', 
            padding: '32px', 
            boxShadow: '0 50px 100px -20px rgba(0,0,0,0.9)', 
            overflow: 'hidden',
            position: 'relative',
            pointerEvents: 'auto', // Reactivate clicks for dialog content
            zIndex: 1
          }}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">{dialogTitle}</h3>
              <button onClick={() => setIsDialogOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all"><X size={20} /></button>
            </div>
            <div className="custom-scrollbar pr-1" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {dialogContent}
            </div>
          </div>
        </div>
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

        <aside className={`${isCompact ? 'w-20 px-3' : 'w-64 p-6'} sidebar-glass flex flex-col sticky top-0 h-screen z-30 transition-all duration-300`}>
          <div className={`mb-10 mt-6 flex ${isCompact ? 'justify-center' : 'px-2'}`}>
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-2xl bg-primary/20 flex items-center justify-center">
              <img 
                src="./app-icon.png" 
                alt="Nexus" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // 画像読み込み失敗時のフォールバック
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = '<span class="text-xs font-black text-primary">NEXUS</span>';
                  }
                }}
              />
            </div>
          </div>
          <nav className="space-y-4 flex-grow">
            <button onClick={() => setCurrentView('feed')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'feed' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-white/5'}`}>
              <LayoutDashboard size={18} /> {!isCompact && <span className="text-sm font-bold">Intelligence Feed</span>}
            </button>
            <button onClick={() => setCurrentView('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'settings' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-white/5'}`}>
              <Settings2 size={18} /> {!isCompact && <span className="text-sm font-bold">Nexus Command</span>}
            </button>
          </nav>
          <div className={`mt-auto py-6 border-t border-white/5 ${isCompact ? 'flex justify-center' : ''}`}>
            <AgentMonitor agents={agentEvents} compact={isCompact} />
          </div>
        </aside>

        <main className="flex-grow flex flex-col min-h-screen">
          <header className={`h-16 border-b border-white/5 sidebar-glass flex items-center justify-between ${isCompact ? 'px-4' : 'px-8'} sticky top-0 z-20`}>
            <div className="flex items-center gap-6 flex-grow">
              <Search size={16} className="text-slate-500" />
              <input type="text" placeholder="Search signals..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent outline-none text-sm w-full text-white placeholder-slate-600" />
            </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 w-full opacity-20 pointer-events-none">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-64 rounded-3xl bg-white/5 animate-pulse" />
                      ))}
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
                        <div className={`grid gap-6 ${isCompact ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'}`}>
                          {catArticles.map((article, idx) => (
                            <ArticleCard key={idx} article={article} index={idx} size="medium" />
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
                alert={(t, m) => { setDialogTitle(t); setDialogContent(m); setIsDialogOpen(true); return Promise.resolve(); }} 
                confirm={async (_t, _m) => { return true; }} 
                prompt={async (_t, _m) => { return ''; }} 
              />
            )}
          </div>
        </main>
      </div>
    </React.Fragment>
  );
};

export default App;
