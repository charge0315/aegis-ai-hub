import type { Article } from '../types';

/**
 * ダッシュボードの初期表示用シードデータ。
 * 実運用では Discovery/Curator エージェントが RSS・Web 探索の結果を
 * ここに差し替える想定（デスクトップ版の FeedManager / RSSFetcher に相当）。
 */
export const SEED_ARTICLES: Article[] = [
  {
    title: 'Multi-agent orchestration patterns for on-device LLMs',
    link: 'https://example.com/agent-orchestration',
    desc: 'A survey of patterns for coordinating specialized AI agents running partly on-device and partly in the cloud.',
    brand: 'AI Weekly',
    score: 9,
    img: null,
    date: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    category: 'AI Agents',
    aiReason: 'あなたの興味「AI Agents」に強く合致し、オーケストレーション設計の実例を含みます。',
    language: 'en',
  },
  {
    title: 'React Native 0.86 で変わったこと',
    link: 'https://example.com/rn-086',
    desc: '新アーキテクチャの安定化とビルド速度改善について解説。',
    brand: 'Zenn Trends',
    score: 8,
    img: null,
    date: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    category: 'Mobile Dev',
    aiReason: 'モバイル移植プロジェクトに直結する内容として抽出されました。',
    language: 'ja',
  },
  {
    title: 'Zero-trust API key storage on mobile: Keychain vs Keystore',
    link: 'https://example.com/zero-trust-mobile',
    desc: 'Comparing platform-native secure storage guarantees for client-held secrets.',
    brand: 'SecOps Digest',
    score: 7,
    img: null,
    date: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    category: 'Security',
    aiReason: 'safeStorage 相当のモバイル実装検討のため収集。',
    language: 'en',
  },
  {
    title: 'Glassmorphism in 2026: still worth it?',
    link: 'https://example.com/glassmorphism-2026',
    desc: 'A retrospective on translucent UI trends and their accessibility trade-offs.',
    brand: 'Design Signal',
    score: 6,
    img: null,
    date: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    category: 'Design',
    aiReason: 'Aegis Chroma UI のモバイル版デザイン検討に関連。',
    language: 'en',
  },
];
