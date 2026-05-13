import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Sparkles, Calendar } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import type { Article } from '../types';
import { useTranslation } from '../hooks/useTranslationHook';

/**
 * ArticleCard Component
 * 
 * 単一の「インテリジェンス・シグナル（記事）」を視覚化するためのコンポーネント。
 */

interface ArticleCardProps {
  article: Article;
  index?: number;
  size?: 'small' | 'medium' | 'large';
  showImages?: boolean;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, index = 0, size = 'medium', showImages = true }) => {
  const [showReason, setShowReason] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { t } = useTranslation();

  const isSmall = size === 'small';

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
      {showImages && (
        <div className={`relative overflow-hidden bg-surface shrink-0 ${
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
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
              <div className="relative z-1 flex flex-col items-center gap-2">
                <Sparkles size={isSmall ? 24 : 40} className="text-white/30" />
                {!isSmall && <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{t.article.synthesized}</span>}
              </div>
            </div>
          )}
          
          <div 
            className={`absolute ${isSmall ? 'top-1 right-1 w-6 h-6 text-[8px]' : 'top-2 right-2 w-8 h-8 text-xs'} flex items-center justify-center rounded-full bg-background/20 backdrop-blur-md border border-white/10 font-bold text-primary`}
          >
            {article.score}
          </div>
        </div>
      )}

      <div className={`${isSmall ? 'p-3' : 'p-5'} flex-grow flex flex-col`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded border border-primary/20">
            {article.category}
          </span>
          <span className="text-[9px] text-content-muted font-bold uppercase tracking-widest">{article.brand}</span>
        </div>
        
        <h3 className={`${isSmall ? 'text-xs' : 'text-sm'} font-bold leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors`}>
          {article.title}
        </h3>
        
        {!isSmall && (
          <p className="text-xs text-content-muted line-clamp-3 mb-4 flex-grow leading-relaxed">
            {article.desc}
          </p>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
          <div className="flex items-center gap-2 text-[10px] text-content-muted font-medium">
            <Calendar size={12} />
            {new Date(article.date).toLocaleDateString()}
          </div>
          
          <div className="flex items-center gap-1">
            {article.geminiReason && !isSmall && (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowReason(true); }}
                className="p-1.5 rounded-full hover:bg-primary/10 text-primary transition-colors"
                title={t.article.reasoning}
              >
                <Sparkles size={14} />
              </button>
            )}
            <div className="p-1.5 rounded-full hover:bg-white/5 text-content-muted transition-colors">
              <ExternalLink size={14} />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showReason && article.geminiReason && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="absolute inset-0 z-20 bg-background/90 p-6 flex flex-col rounded-[inherit]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-primary mb-4">
              <Sparkles size={16} />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">{t.article.reasoning}</span>
            </div>
            <div className="text-xs leading-relaxed text-content-base overflow-y-auto custom-scrollbar pr-2 mb-6 font-medium">
              {article.geminiReason}
            </div>
            <button 
              onClick={() => setShowReason(false)}
              className="mt-auto w-full py-2.5 text-[10px] font-bold uppercase tracking-widest text-white bg-primary rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95"
            >
              {t.article.close}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassPanel>
  );
};
