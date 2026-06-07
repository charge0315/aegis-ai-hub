import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, FolderOpen, Languages, Clock, RefreshCw } from 'lucide-react';
import { GlassPanel } from './GlassPanel';

interface FeedStatsHeaderProps {
  totalArticles: number;
  categoryCount: number;
  japaneseRatio: number; // 0-100
  lastUpdated: Date | null;
  onRefresh: () => void;
  isSyncing: boolean;
}

/**
 * 記事フィード上部に表示する統計情報および同期用ヘッダー
 */
export const FeedStatsHeader: React.FC<FeedStatsHeaderProps> = ({
  totalArticles,
  categoryCount,
  japaneseRatio,
  lastUpdated,
  onRefresh,
  isSyncing
}) => {
  const [relativeTime, setRelativeTime] = useState<string>('--');

  useEffect(() => {
    const updateTime = () => {
      if (!lastUpdated) {
        setRelativeTime('--');
        return;
      }
      const now = new Date();
      const diffMs = now.getTime() - lastUpdated.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) {
        setRelativeTime('たった今');
      } else if (diffMins < 60) {
        setRelativeTime(`${diffMins}分前`);
      } else {
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) {
          setRelativeTime(`${diffHours}時間前`);
        } else {
          setRelativeTime(lastUpdated.toLocaleTimeString());
        }
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 30000); // 30秒ごとに更新
    return () => clearInterval(timer);
  }, [lastUpdated]);

  return (
    <GlassPanel className="p-4 flex flex-wrap items-center justify-between gap-4 border border-white/5 bg-black/20">
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        {/* 総記事数 */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Database size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Total Articles</span>
            <motion.span 
              key={totalArticles}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-lg font-bold text-white tabular-nums font-mono"
            >
              {totalArticles}
            </motion.span>
          </div>
        </div>

        {/* カテゴリ数 */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <FolderOpen size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Categories</span>
            <motion.span 
              key={categoryCount}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-lg font-bold text-white tabular-nums font-mono"
            >
              {categoryCount}
            </motion.span>
          </div>
        </div>

        {/* 日本語記事の割合 */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 text-accent">
            <Languages size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">JA Signals</span>
            <motion.span 
              key={japaneseRatio}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-lg font-bold text-white tabular-nums font-mono"
            >
              {japaneseRatio}%
            </motion.span>
          </div>
        </div>

        {/* 最終更新日時 */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5 text-slate-400 relative">
            <Clock size={16} />
            {lastUpdated && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium flex items-center gap-1.5">
              Last Updated
            </span>
            <span className="text-sm font-semibold text-slate-300 font-sans">
              {relativeTime}
            </span>
          </div>
        </div>
      </div>

      {/* 更新ボタン */}
      <button
        onClick={() => onRefresh()}
        disabled={isSyncing}
        aria-label="Refresh feeds"
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 active:bg-white/15 text-slate-300 hover:text-white rounded-xl transition-all border border-white/10 font-medium text-xs disabled:opacity-50"
      >
        <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
        <span>{isSyncing ? 'Syncing...' : 'Refresh'}</span>
      </button>
    </GlassPanel>
  );
};
