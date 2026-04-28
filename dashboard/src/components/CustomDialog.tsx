import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, XCircle, Shield } from 'lucide-react';

export type DialogType = 'info' | 'success' | 'warning' | 'error' | 'confirm' | 'prompt';

interface CustomDialogProps {
  isOpen: boolean;
  type: DialogType;
  title: string;
  message: string;
  onConfirm: (value?: string) => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultValue?: string;
  placeholder?: string;
}

const DialogContent: React.FC<Omit<CustomDialogProps, 'isOpen'>> = ({
  type,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  defaultValue = '',
  placeholder = 'Type here...'
}) => {
  const [inputValue, setInputValue] = React.useState(defaultValue);

  const dialogConfig = {
    success: { icon: <CheckCircle className="text-primary" size={32} />, color: 'bg-primary' },
    warning: { icon: <AlertCircle className="text-accent" size={32} />, color: 'bg-accent' },
    error: { icon: <XCircle className="text-alert" size={32} />, color: 'bg-alert' },
    confirm: { icon: <Shield className="text-primary" size={32} />, color: 'bg-primary' },
    prompt: { icon: <Shield className="text-accent" size={32} />, color: 'bg-accent' },
    info: { icon: <Info className="text-slate-400" size={32} />, color: 'bg-slate-500' },
  };

  const { icon, color: accentColor } = dialogConfig[type] || dialogConfig.info;

  const handleConfirm = () => {
    onConfirm(type === 'prompt' ? inputValue : undefined);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel || handleConfirm}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto"
      />
      
      {/* Absolute Centering to avoid flex-stretch issues */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-4 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full bg-deep-space border border-white/10 rounded-3xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col"
          style={{ 
            height: 'auto',
            minHeight: '0', // Important: allow it to shrink below any default flex min
            flexShrink: 1,
            flexGrow: 0
          }}
        >
          {/* Top accent bar */}
          <div className={`h-1.5 w-full shrink-0 ${accentColor}`} />
          
          <div className="p-8 flex flex-col">
            <div className="flex items-center gap-4 mb-6 shrink-0">
              <div className="p-3 bg-white/5 rounded-2xl shrink-0">
                {icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white uppercase tracking-tight leading-tight">{title}</h3>
                <div className="h-1 w-12 bg-white/10 mt-1 rounded-full" />
              </div>
            </div>
            
            <div className="mb-8 overflow-y-auto max-h-[50vh]">
              <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">
                {message}
              </p>
            </div>

            {type === 'prompt' && (
              <div className="mb-8 shrink-0">
                <input
                  autoFocus
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                  placeholder={placeholder}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent/50 transition-colors"
                />
              </div>
            )}
            
            <div className="flex gap-3 justify-end mt-auto shrink-0">
              {(type === 'confirm' || type === 'prompt') && (
                <button
                  onClick={onCancel}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                >
                  {cancelLabel}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className={`px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg active:scale-95 ${accentColor} hover:brightness-110`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
          
          {/* Decorative shield background - purely decorative, no layout impact */}
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Shield size={120} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export const CustomDialog: React.FC<CustomDialogProps> = (props) => {
  return (
    <AnimatePresence>
      {props.isOpen && (
        <DialogContent 
          key="dialog-content"
          {...props}
        />
      )}
    </AnimatePresence>
  );
};
