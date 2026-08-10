import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles, X } from 'lucide-react';
import type { FeatureGate } from '../services/LicenseManager';

interface ProGateProps {
  feature: keyof FeatureGate;
  featureGates: FeatureGate | null;
  children: React.ReactNode;
  /** ロック時に子要素を表示するか（半透明でオーバーレイ）*/
  showLocked?: boolean;
  onUpgradeClick?: () => void;
}

/**
 * ProGate: Pro限定機能のアクセス制御コンポーネント。
 *
 * - Pro版の場合: 子要素をそのまま表示
 * - Free版の場合: 🔒アイコン付きのオーバーレイを表示し、クリックでアップグレードダイアログへ誘導
 */
export const ProGate: React.FC<ProGateProps> = ({
  feature,
  featureGates,
  children,
  showLocked = true,
  onUpgradeClick,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // featureGatesがnull/undefined（ロード中）の間はブロックしない
  const isAllowed = featureGates == null ? true : (featureGates[feature] ?? true);

  if (isAllowed) return <>{children}</>;

  if (!showLocked) return null;

  return (
    <div className="pro-gate-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{ opacity: 0.4, pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>
      <motion.div
        className="pro-gate-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          borderRadius: '8px',
          background: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.3)',
          backdropFilter: 'blur(2px)',
        }}
        whileHover={{ background: 'rgba(99,102,241,0.25)' }}
        onClick={() => { setShowTooltip(true); onUpgradeClick?.(); }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <Lock size={16} color="rgba(99,102,241,0.9)" />
          <span style={{ fontSize: '10px', color: 'rgba(99,102,241,0.9)', fontWeight: 600 }}>Pro</span>
        </div>
      </motion.div>

      <AnimatePresence>
        {showTooltip && (
          <UpgradeTooltip onClose={() => setShowTooltip(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

interface UpgradeTooltipProps {
  onClose: () => void;
}

const UpgradeTooltip: React.FC<UpgradeTooltipProps> = ({ onClose }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9, y: -4 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9, y: -4 }}
    transition={{ duration: 0.15 }}
    style={{
      position: 'absolute',
      bottom: 'calc(100% + 8px)',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(15,15,25,0.95)',
      border: '1px solid rgba(99,102,241,0.4)',
      borderRadius: '12px',
      padding: '12px 16px',
      width: '220px',
      backdropFilter: 'blur(16px)',
      zIndex: 1000,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}
  >
    <button
      onClick={onClose}
      style={{
        position: 'absolute', top: '8px', right: '8px',
        background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
        padding: '2px',
      }}
    >
      <X size={12} />
    </button>

    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
      <Sparkles size={14} color="#818cf8" />
      <span style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8' }}>Pro版限定機能</span>
    </div>

    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
      この機能はPro版でのみご利用いただけます。
    </p>

    <a
      href="https://aegis-nexus.gumroad.com/l/pro"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
        color: 'white',
        padding: '7px 12px',
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: 700,
        textDecoration: 'none',
      }}
    >
      ✨ Pro版にアップグレード
    </a>
  </motion.div>
);
