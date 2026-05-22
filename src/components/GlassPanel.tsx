import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * GlassPanel Component
 * 
 * Aegis Nexus の視覚的アイデンティティである「Glassmorphism（ガラス質感）」を
 * 実現するための共通ベースコンポーネント。
 * 背景のぼかし（backdrop-blur）と半透明の境界線を組み合わせることで、
 * 深みのある多層構造のUIを構築します。
 */

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassPanelProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'light';
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ 
  children, 
  className, 
  variant = 'default',
  ...props 
}) => {
  // バリアントによって透明度やブラーの強度を調整可能
  const baseClass = variant === 'default' ? 'glass' : 'glass-light';
  
  return (
    <motion.div
      className={cn(baseClass, 'rounded-xl overflow-hidden', className)}
      // 出現時の滑らかなアニメーション: 
      // 唐突な表示を避け、インターフェースが流動的に構築される印象を与えます。
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  );
};
