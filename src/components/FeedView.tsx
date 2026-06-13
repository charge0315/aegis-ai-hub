import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArticleCard } from './ArticleCard';
import type { Article, NexusSettings } from '../types';

interface FeedViewProps {
  articlesByCategory: Record<string, Article[]>;
  settings: NexusSettings | null;
  feedSize: 'small' | 'medium' | 'large';
  showImages: boolean;
  isSyncing: boolean;
}

/**
 * 記事フィードのメイン表示エリアを担当するコンポーネント。
 * 同期中のオーバーレイ表示と、カテゴリごとにグループ化された記事リストのレンダリングを行います。
 */
export const FeedView: React.FC<FeedViewProps> = ({
  articlesByCategory,
  settings,
  feedSize,
  showImages,
  isSyncing
}) => {
  return (
    <div className="max-w-[1600px] mx-auto space-y-12 relative">
      {/* 同期中アニメーション: データの鮮度を保つためのAIエージェントの活動を演出 */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-md pointer-events-none"
          >
            <div className="cyber-scanline"></div>
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <motion.div 
                  animate={{ 
                    rotate: 360,
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ 
                    rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                    scale: { duration: 1, repeat: Infinity }
                  }}
                  className="w-24 h-24 border-t-2 border-l-2 border-primary rounded-full shadow-[0_0_15px_var(--color-primary)]"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 border-b-2 border-r-2 border-accent rounded-full animate-reverse-spin opacity-50 shadow-[0_0_10px_var(--color-accent)]" />
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black tracking-[0.3em] text-white cyber-glitch font-mono uppercase">
                  Synchronizing
                </h3>
                <p className="text-[10px] tracking-[0.5em] text-primary cyber-flicker font-mono uppercase opacity-70">
                  Establishing Neural Link...
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* カテゴリ別の記事レンダリング */}
      {Object.entries(articlesByCategory).map(([category, items]) => (
        <div key={category} className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                {settings?.interests?.categories[category]?.emoji || '🌐'}
              </span>
              <h3 className="text-xl font-bold text-white uppercase tracking-wider">{category}</h3>
            </div>
            <div className="h-px flex-1 bg-white/10"></div>
            <span className="text-xs font-medium text-slate-500">{items.length} Signals</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((article, idx) => (
              <ArticleCard 
                key={`${category}-${idx}`} 
                article={article} 
                index={idx} 
                size={feedSize} 
                showImages={showImages} 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
