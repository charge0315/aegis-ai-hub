import React from 'react';
import { motion } from 'framer-motion';
import { Radio } from 'lucide-react';

interface EmptyFeedStateProps {
  hasSearchQuery: boolean;
  onNavigateToSettings: () => void;
}

/**
 * 記事が0件の場合に表示される、サイバーパンク/ガラス質感を模したプレースホルダーコンポーネント。
 */
export const EmptyFeedState: React.FC<EmptyFeedStateProps> = ({
  hasSearchQuery,
  onNavigateToSettings
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 py-16 max-w-md mx-auto">
      {/* 脈打つグロー効果を伴うアニメーション付きRadioアイコン */}
      <div className="relative mb-6">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
        />
        <motion.div
          initial={{ rotate: 0 }}
          animate={{
            boxShadow: ["0 0 10px rgba(99, 102, 241, 0.2)", "0 0 25px rgba(99, 102, 241, 0.4)", "0 0 10px rgba(99, 102, 241, 0.2)"]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative p-5 rounded-full border border-primary/30 bg-primary/5 text-primary"
        >
          <Radio size={36} className="cyber-flicker" />
        </motion.div>
      </div>

      {/* タイトル */}
      <h3 className="text-2xl font-black text-white tracking-[0.2em] uppercase font-cyber mb-3 neon-text-white">
        No Signals Detected
      </h3>

      {/* サブタイトル */}
      <p className="text-slate-400 text-sm leading-relaxed mb-8 font-sans">
        {hasSearchQuery ? (
          "No matching signals found. Try adjusting your search query."
        ) : (
          "Your intelligence feed is empty. Configure your interests to begin signal acquisition."
        )}
      </p>

      {/* 設定画面へのナビゲーションCTAボタン (検索中でない場合のみ) */}
      {!hasSearchQuery && (
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: "0 0 15px var(--color-primary)" }}
          whileTap={{ scale: 0.98 }}
          onClick={onNavigateToSettings}
          className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 text-xs tracking-widest uppercase transition-all border border-primary-light/30"
        >
          Configure Interests
        </motion.button>
      )}
    </div>
  );
};
