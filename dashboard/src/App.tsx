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
  X,
  Image as ImageIcon,
  ImageOff,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import { ArticleCard } from './components/ArticleCard';
import { AgentMonitor } from './components/AgentMonitor';
import { UnifiedEditor } from './components/UnifiedEditor';
import { CommandPalette } from './components/CommandPalette';
import { useNexusSync, useAgentEvents, nexusApi } from './api/nexusApi';

const App: React.FC = () => {
  // --- PRIMARY CONTEXT STATE ---
  // ユーザーが現在「情報の消費（feed）」をしているか、「システムの調整（settings）」をしているかの状態
  const [currentView, setCurrentView] = useState<'feed' | 'settings'>('feed');
  
  // バックエンド（NexusOrchestrator）との同期とデータ取得を司るコアフック
  const { settings, articles, loading, sync, refetch } = useNexusSync();
  
  // --- COGNITIVE FILTER STATE ---
  // ユーザーの認知的負荷を調整するための表示制御ステート群
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [feedSize, setFeedSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showImages, setShowImages] = useState(true);

  // --- RESPONSIVE STATE ---
  // WindowsのFancyZonesなどで画面が分割された際、自動的にナビゲーションを
  // 最小化（Compact）してコンテンツ領域を確保するためのレイアウト適応ロジック
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isCompact = windowWidth < 1024;
  const sidebarWidth = isCompact ? 80 : 256;

  // --- SIMPLE DIALOG STATE ---
  // アプリケーション全体を覆うブロッキング・ダイアログの制御。
  // 設定の警告やAIディスカバリーなど、ユーザーの完全な注意が必要な処理で使用します。
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogContent, setDialogContent] = useState<React.ReactNode>(null);

  // バックエンドの自律エージェントの活動状態を監視。
  // エージェントが新しい情報を発見（同期完了）した際、即座にUIへ反映（refetch）させます。
  const agentEvents = useAgentEvents(useCallback(() => {
    void refetch(false);
  }, [refetch]));

  /**
   * 検索クエリに基づくシグナル（記事）の絞り込み。
   * 大量の記事データが流れてきても、再レンダリングコストを抑えるためにメモ化しています。
   */
  const filteredArticles = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return articles.filter(article => 
      article.title.toLowerCase().includes(query) ||
      article.category.toLowerCase().includes(query)
    );
  }, [articles, searchQuery]);

  /**
   * ユーザーの「興味（Interests）」カテゴリに基づいて記事をグループ化。
   * これにより、ユーザーは自分の関心領域ごとに整理された形で情報を消化できます。
   */
  const groupedArticles = useMemo(() => {
    const groups: Record<string, typeof articles> = {};
    if (settings) {
      Object.keys(settings.interests.categories).forEach(cat => {
        groups[cat] = filteredArticles.filter(a => a.category === cat);
      });
    }
    return groups;
  }, [filteredArticles, settings]);

  /**
   * 特定のカテゴリに関する情報源（フィード）の管理と、AIによる新規開拓（Discovery）を司る。
   * ユーザーが未知の優良情報源を安全に探せるよう、AIエージェントにプロンプトを投げます。
   */
  const handleShowFeeds = async (category: string) => {
    if (!settings) return;

    // カテゴリ名と設定キーの不整合（ドットや記号の揺れ）を吸収するための正規化処理
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
              const catProposals = (proposals.sites as { url: string; name: string; reason: string; category: string }[] || []).filter(s => s.category === category);
              
              setDialogTitle(`Discovery: ${category}`);
              setDialogContent(
                <div className="space-y-4">
                  {catProposals.length > 0 ? catProposals.map(s => (
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
            } catch {
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
      {/* アプリケーションの状態を一時停止し、ユーザーの決定を促すモーダルレイヤー。
          背後（サイドバーなど）への誤操作を防ぐための Ironclad（鉄壁）な設計です。 */}
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
          // SHIFT CENTER: サイドバーが展開されている場合でも、メインコンテンツの
          // 「視覚的な中心」にダイアログが配置されるようにオフセットを計算します。
          paddingLeft: `${sidebarWidth}px`,
          pointerEvents: 'none' // Backdrop側にクリックを透過させるための措置
        }}>
          {/* Global Backdrop - 画面全体を暗くし、背後の情報をボカす（認知負荷の低減） */}
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
          
          {/* Dialog Box - 実際の操作領域（イベントを再有効化） */}
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
            pointerEvents: 'auto', // ダイアログ内部のクリック操作を許可
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
        {/* キーボード駆動のユーザー向け：素早いナビゲーションとシステム制御 */}
        <CommandPalette 
          isOpen={isCommandPaletteOpen} 
          onClose={() => setIsCommandPaletteOpen(false)} 
          settings={settings} 
          onNavigate={(v) => setCurrentView(v)} 
          onSync={async () => { if (settings) await sync(settings); }} 
          onTriggerOrchestration={async (req) => { await nexusApi.triggerOrchestration(req); }}
        />

        {/* 左側ナビゲーション（サイドバー）。
            dragクラスによって、ウィンドウ全体を移動させるための「つかみしろ」として機能します。 */}
        <aside className={`${isCompact ? 'w-20 px-3' : 'w-64 p-6'} sidebar-glass flex flex-col sticky top-0 h-screen z-30 transition-all duration-300 drag`}>
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
          <nav className="space-y-4 flex-grow no-drag">
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
          {/* メインヘッダー。
              検索ボックスと表示オプション（UIカスタマイズ）を提供し、
              ここもウィンドウ移動のドラッグ領域（drag）として機能します。 */}
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

                {/* 起動直後、まだエージェントがデータを構築している間のローディングステート。
                    ユーザーに「バックグラウンドで高度な処理が走っている」ことを視覚的に伝えます。 */}
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
                    {/* 関心カテゴリごとに記事をマッピングして表示。
                        各セクションは論理的な情報の塊としてユーザーに提示されます。 */}
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
                alert={(t, m) => { setDialogTitle(t); setDialogContent(m); setIsDialogOpen(true); return Promise.resolve(); }} 
                confirm={async () => { return true; }} 
                prompt={async () => { return ''; }} 
              />
            )}
          </div>
        </main>
      </div>
    </React.Fragment>
  );
};

export default App;
