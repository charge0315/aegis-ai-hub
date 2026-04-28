import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  const baseClass = variant === 'default' ? 'glass' : 'glass-light';
  
  return (
    <motion.div
      className={cn(baseClass, 'rounded-xl overflow-hidden', className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  );
};
