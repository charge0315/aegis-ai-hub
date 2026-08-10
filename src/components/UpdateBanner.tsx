import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw } from 'lucide-react';
import type { UpdateEvent } from '../hooks/useLicense';

interface UpdateBannerProps {
  updateEvent: UpdateEvent | null;
  onInstall: () => void;
}

/**
 * UpdateBanner: 自動アップデート通知バナー。
 * - update-available: アップデート利用可能を通知
 * - update-downloaded: インストールボタンを表示
 */
export const UpdateBanner: React.FC<UpdateBannerProps> = ({ updateEvent, onInstall }) => (
  <AnimatePresence>
    {updateEvent && updateEvent.type !== 'error' && (
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'fixed',
          top: '48px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15,15,25,0.95)',
          border: '1px solid rgba(99,102,241,0.4)',
          borderRadius: '12px',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backdropFilter: 'blur(16px)',
          zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {updateEvent.type === 'available' && (
          <>
            <Download size={16} color="#818cf8" />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
              新しいバージョンをダウンロード中...
            </span>
          </>
        )}
        {updateEvent.type === 'downloaded' && (
          <>
            <RefreshCw size={16} color="#34d399" />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
              アップデートの準備ができました
            </span>
            <button
              onClick={onInstall}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              今すぐ再起動
            </button>
          </>
        )}
      </motion.div>
    )}
  </AnimatePresence>
);
