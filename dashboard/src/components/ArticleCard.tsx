import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Sparkles, Calendar } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import type { Article } from '../types';

interface ArticleCardProps {
  article: Article;
  index?: number;
  size?: 'small' | 'medium' | 'large';
  showImages?: boolean;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, index = 0, size = 'medium', showImages = true }) => {
  const [showReason, setShowReason] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isSmall = size === 'small';
  const isLarge = size === 'large';

  // カテゴリに応じたグラデーション生成（フォールバック用）
  const getFallbackGradient = () => {
    const gradients: Record<string, string> = {
      'ゲーム・配信': 'from-indigo-600 to-purple-600',
      'AI・ソフトウェア': 'from-blue-600 to-cyan-600',
      'PCパーツ': 'from-orange-600 to-red-600',
      'オーディオ・音楽制作': 'from-pink-600 to-rose-600',
      'PC・デバイス': 'from-slate-600 to-slate-800',
      '周辺機器・PCアクセサリ': 'from-emerald-600 to-teal-600',
      'モバイル・タブレット': 'from-violet-600 to-purple-800',
      'モビリティ・自転車・EV': 'from-lime-600 to-green-700',
      'セール・EC情報': 'from-yellow-500 to-orange-600',
      'カメラ・クリエイティブ': 'from-amber-600 to-orange-700',
      'ライフスタイル': 'from-sky-600 to-indigo-700',
      'ロードバイク・MTB・サイクリング': 'from-red-600 to-orange-600'
    };
    return gradients[article.category] || 'from-slate-700 to-slate-900';
  };

  return (
    <GlassPanel 
      className={`group relative flex flex-col h-full hover:border-primary/50 transition-colors duration-300 article-card cursor-pointer ${
        isSmall ? 'rounded-xl' : 'rounded-3xl'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.5) }}
      whileHover={{ y: -4 }}
      data-testid="article-card"
      onClick={() => window.open(article.link, '_blank', 'noopener,noreferrer')}
    >
      {/* Image Section */}
      {showImages && (
        <div className={`relative overflow-hidden bg-slate-800 shrink-0 ${
          isSmall ? 'aspect-[4/3]' : 'aspect-video'
        }`}>
          {article.img && !imageError ? (
            <img 
              src={article.img} 
              alt={article.title} 
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-white/40 bg-linear-to-br ${getFallbackGradient()} relative overflow-hidden`}>
              {/* 背景の装飾的な要素 */}
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
              <div className="relative z-1 flex flex-col items-center gap-2">
                <Sparkles size={isSmall ? 24 : 40} className="text-white/30" />
                {!isSmall && <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Signal Synthesized</span>}
              </div>
            </div>
          )}
          
          {/* Category Badge */}
          {!isSmall && (
            <div className="absolute top-2 left-2 flex gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/80 text-white rounded backdrop-blur-md">
                {article.category}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white rounded backdrop-blur-md border border-white/10">
                {article.brand}
              </span>
            </div>
          )}

          {/* Score Badge */}
          <div 
            className={`absolute ${isSmall ? 'top-1 right-1 w-6 h-6 text-[8px]' : 'top-2 right-2 w-8 h-8 text-xs'} flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/10 font-bold text-accent score-badge`}
            data-testid="article-score"
          >
            {article.score}
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className={`${isSmall ? 'p-2' : 'p-4'} flex-grow flex flex-col relative`}>
        {!showImages && (
          <div className="absolute top-2 right-2 flex gap-2">
            {!isSmall && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary rounded border border-primary/20">
                {article.category}
              </span>
            )}
            <div className="w-6 h-6 flex items-center justify-center rounded-full bg-black/40 border border-white/10 font-bold text-[10px] text-accent">
              {article.score}
            </div>
          </div>
        )}
        <h3 className={`${isSmall ? 'text-[11px] leading-tight mb-1' : isLarge ? 'text-lg mb-2' : 'text-sm leading-tight mb-2'} font-semibold line-clamp-2 group-hover:text-primary transition-colors ${!showImages ? 'pr-20' : ''}`}>
          {article.title}
        </h3>
        
        {!isSmall && (
          <p className={`${isLarge ? 'text-sm' : 'text-xs'} text-slate-400 line-clamp-3 mb-4 flex-grow`}>
            {article.desc}
          </p>
        )}

        <div className={`flex items-center justify-between mt-auto ${isSmall ? 'pt-2' : 'pt-4'} border-t border-white/5`}>
          <div className={`flex items-center gap-2 ${isSmall ? 'text-[8px]' : 'text-[10px]'} text-slate-500`}>
            <Calendar size={isSmall ? 10 : 12} />
            {new Date(article.date).toLocaleDateString()}
          </div>
          
          <div className="flex items-center gap-2">
            {article.geminiReason && !isSmall && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReason(!showReason);
                }}
                data-testid="reasoning-toggle"
                className="p-1.5 rounded-full hover:bg-white/10 text-primary transition-colors"
                title="AI Reasoning"
              >
                <Sparkles size={14} />
              </button>
            )}
            <a 
              href={article.link} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`${isSmall ? 'p-1' : 'p-1.5'} rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors`}
            >
              <ExternalLink size={isSmall ? 12 : 14} />
            </a>
          </div>
        </div>
      </div>

      {/* AI Reasoning Overlay */}
      <AnimatePresence>
        {showReason && article.geminiReason && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            data-testid="reasoning-overlay"
            className="absolute inset-0 z-10 bg-slate-900/80 p-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-primary mb-3">
              <Sparkles size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">AI Reasoning</span>
            </div>
            <div className="text-xs leading-relaxed text-slate-200 overflow-y-auto font-mono">
              {article.geminiReason}
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowReason(false);
              }}
              className="mt-auto w-full py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white border border-white/10 rounded hover:bg-white/5 transition-all"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassPanel>
  );
};
