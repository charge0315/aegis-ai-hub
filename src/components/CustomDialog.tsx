import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, XCircle, Sparkles, Loader2 } from 'lucide-react';
import { GlassPanel } from './GlassPanel';

/**
 * CustomDialog Component
 * 
 * ユーザーへの重要な通知、確認事項、または入力を促すためのモーダルダイアログ。
 * 背景を透過・ぼかすGlassmorphismを採用することで、現在のコンテキストを維持しつつ、
 * ユーザーの注意を確実に最前面のダイアログへ引きつけます。
 */

export type DialogType = 'alert' | 'confirm' | 'prompt' | 'info' | 'warning' | 'success' | 'error' | 'loading';

interface CustomDialogProps {
  isOpen: boolean;
  type: DialogType;
  title: string;
  message: React.ReactNode;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value?: string) => void;
  onCancel?: () => void;
}

export const CustomDialog: React.FC<CustomDialogProps> = ({
  isOpen,
  type,
  title,
  message,
  defaultValue = '',
  placeholder = '',
  onConfirm,
  onCancel
}) => {
  const [inputValue, setInputValue] = React.useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setInputValue(defaultValue);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, defaultValue]);

  /**
   * 状態に応じたアイコングラフィックの選択
   * 成功、エラー、警告などのコンテキストを瞬時に伝えるため、
   * 意味に基づいた色とアイコンのセットを選択します。
   */
  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 size={32} className="text-emerald-400" />;
      case 'error': return <XCircle size={32} className="text-rose-400" />;
      case 'warning': return <AlertCircle size={32} className="text-amber-400" />;
      case 'prompt': return <Sparkles size={32} className="text-primary" />;
      case 'loading': return <Loader2 size={32} className="text-indigo-400 animate-spin" />;
      default: return <Info size={32} className="text-blue-400" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" data-testid="custom-dialog">
          {/* Backdrop: 全画面を暗くし、背後のコンテンツをぼかして情報の階層を明確化 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onCancel?.()}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog Body: 浮遊感を出すためのスケールと移動のアニメーション */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            {/* GlassPanel を基盤とすることで、洗練された「未来感」を維持 */}
            <GlassPanel className="p-8 space-y-6 overflow-hidden border-white/10 shadow-2xl">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-white/5 rounded-2xl">
                  {getIcon()}
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight" id="dialog-title" data-testid="dialog-title">{title}</h2>
                <div className="text-slate-400 text-sm leading-relaxed max-h-[200px] overflow-y-auto w-full px-2" data-testid="dialog-message">
                  {message}
                </div>
              </div>

              {/* Promptモード時のみ入力フィールドを表示 */}
              {type === 'prompt' && (
                <div className="space-y-2">
                  <input
                    autoFocus
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={placeholder}
                    data-testid="dialog-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onConfirm(inputValue);
                      if (e.key === 'Escape') onCancel?.();
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              )}

              {/* アクションボタン群 */}
              {type !== 'loading' && (
                <div className="flex gap-3 pt-2">
                  {onCancel && (
                    <button
                      onClick={() => onCancel()}
                      data-testid="dialog-cancel-button"
                      className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => onConfirm(type === 'prompt' ? inputValue : undefined)}
                    data-testid="dialog-confirm-button"
                    className="flex-2 px-8 py-3 rounded-xl text-sm font-bold bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all"
                  >
                    {(type === 'confirm' || type === 'warning') ? 'Confirm' : 'Continue'}
                  </button>
                </div>
              )}
            </GlassPanel>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
