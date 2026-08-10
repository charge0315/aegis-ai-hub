/** Aegis Nexus Mobile — 共通ドメイン型。デスクトップ版 src/types と概念を共通化。 */

export type Language = 'ja' | 'en' | 'other';

export interface Article {
  title: string;
  link: string;
  desc: string;
  brand: string;
  score: number;
  img: string | null;
  date: string;
  category: string;
  aiReason?: string;
  language: Language;
}

export type AgentId = 'architect' | 'curator' | 'discovery' | 'archivist';

export type AgentRunStatus = 'idle' | 'working' | 'success' | 'error';

export interface AgentStatus {
  id: AgentId;
  name: string;
  role: string;
  status: AgentRunStatus;
  lastMessage: string;
  timestamp: string;
}

export interface InterestCategory {
  id: string;
  emoji: string;
  label: string;
  keywords: string[];
}

export interface NexusSettings {
  interests: InterestCategory[];
  lastUpdated: string;
}

export type LLMProviderId = 'gemini' | 'claude' | 'openai' | 'ollama';

export interface LLMProviderConfig {
  provider: LLMProviderId;
  model: string;
  /** Ollama など、ローカル/自前ホストのエンドポイントを使う場合のベースURL */
  baseUrl?: string;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  emoji: string;
  weight: number;
}
