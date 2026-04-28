import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Sparkles, Calendar } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import type { Article } from '../types';

interface ArticleCardProps {
  article: Article;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  const [showReason, setShowReason] = useState(false);

  return (
    <GlassPanel 
      className="group relative flex flex-col h-full hover:border-primary/50 transition-colors duration-300 article-card"
      whileHover={{ y: -4 }}
      data-testid="article-card"
    >
      {/* Image Section */}
      <div className="relative aspect-video overflow-hidden bg-slate-800">
        {article.img ? (
          <img 
            src={article.img} 
            alt={article.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 bg-linear-to-br from-slate-900 to-slate-800">
            <Sparkles size={32} />
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute top-2 left-2 flex gap-2">
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/80 text-white rounded backdrop-blur-md">
            {article.category}
          </span>
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white rounded backdrop-blur-md border border-white/10">
            {article.brand}
          </span>
        </div>

        {/* Score Badge */}
        <div 
          className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-bold text-accent score-badge"
          data-testid="article-score"
        >
          {article.score}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="text-sm font-semibold leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        
        <p className="text-xs text-slate-400 line-clamp-3 mb-4 flex-grow">
          {article.desc}
        </p>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <Calendar size={12} />
            {new Date(article.date).toLocaleDateString()}
          </div>
          
          <div className="flex items-center gap-2">
            {article.geminiReason && (
              <button 
                onClick={() => setShowReason(!showReason)}
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
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <ExternalLink size={14} />
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
          >
            <div className="flex items-center gap-2 text-primary mb-3">
              <Sparkles size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">AI Reasoning</span>
            </div>
            <div className="text-xs leading-relaxed text-slate-200 overflow-y-auto font-mono">
              {article.geminiReason}
            </div>
            <button 
              onClick={() => setShowReason(false)}
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
