import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Key, Rss, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  onSetup: () => void;
  onSkip: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onSetup, onSkip }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md"
  >
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 22 }}
      className="relative w-full max-w-md mx-4 bg-black/60 border border-white/10 rounded-3xl shadow-2xl p-8 text-white"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-primary/20 rounded-xl text-primary">
          <Sparkles size={24} />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-[0.15em] font-cyber">
            <span className="text-primary">A</span>EGIS <span className="text-primary">NEXUS</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Intelligence Command Center</p>
        </div>
      </div>

      <p className="text-slate-300 text-sm leading-relaxed mb-8">
        AIエージェントが最新技術ニュースを自動収集・解析します。
        まず <strong className="text-white">Gemini APIキー</strong> を設定してください。
      </p>

      {/* Steps */}
      <ol className="space-y-4 mb-8">
        {[
          { icon: <Key size={16} />, text: 'Google AI Studio で Gemini API キーを取得' },
          { icon: <Sparkles size={16} />, text: '設定画面でキーを登録' },
          { icon: <Rss size={16} />, text: 'AIが自動でフィードを収集開始' },
        ].map(({ icon, text }, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
            <span className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              {icon}
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ol>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onSetup}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          APIキーを設定する
          <ArrowRight size={18} />
        </button>
        <button
          onClick={onSkip}
          className="w-full py-2.5 text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors"
        >
          後で設定する
        </button>
      </div>
    </motion.div>
  </motion.div>
);
