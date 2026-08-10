import type { InterestCategory } from '../types';

/** 初回起動時のデフォルト興味カテゴリ。Nexus Command 画面で編集可能。 */
export const DEFAULT_INTERESTS: InterestCategory[] = [
  { id: 'ai-agents', emoji: '🤖', label: 'AI Agents', keywords: ['LLM', 'multi-agent', 'orchestration'] },
  { id: 'mobile-dev', emoji: '📱', label: 'Mobile Dev', keywords: ['React Native', 'Swift', 'Kotlin'] },
  { id: 'security', emoji: '🛡️', label: 'Security', keywords: ['privacy', 'encryption', 'zero-trust'] },
  { id: 'design', emoji: '🎨', label: 'Design', keywords: ['glassmorphism', 'motion', 'UI systems'] },
];
