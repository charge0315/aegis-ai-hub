/**
 * Aegis Nexus Mobile — デザイントークン。
 * デスクトップ版(Windows 11 Acrylic Glassmorphism)のトーンをモバイルに移植した
 * ダークファーストのグラスモーフィズム・テーマ。
 */
export const colors = {
  bg: '#0b0e1a',
  bgAlt: '#12162a',
  surface: 'rgba(255,255,255,0.06)',
  surfaceBorder: 'rgba(255,255,255,0.12)',
  primary: '#6366f1',
  primaryAlt: '#8b5cf6',
  accent: '#FF6B35',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  text: '#f5f6fb',
  textDim: '#9aa0b4',
  textFaint: '#6b7085',
} as const;

export const gradients = {
  hero: ['#4338ca', '#6366f1', '#8b5cf6'] as const,
  accent: ['#FF6B35', '#f59e0b'] as const,
  screen: ['#0b0e1a', '#161b32'] as const,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};

export const spacing = (n: number) => n * 4;

export const typography = {
  title: { fontSize: 24, fontWeight: '800' as const, color: colors.text },
  heading: { fontSize: 17, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 14, fontWeight: '400' as const, color: colors.text },
  caption: { fontSize: 12, fontWeight: '500' as const, color: colors.textDim },
};

export const agentColors: Record<string, string> = {
  architect: '#6366f1',
  curator: '#22c55e',
  discovery: '#f59e0b',
  archivist: '#8b5cf6',
};
