export interface Article {
  title: string;
  link: string;
  desc: string;
  brand: string;
  score: number;
  img: string | null;
  date: string;
  category: string;
  geminiReason?: string;
}

export interface InterestCategory {
  emoji: string;
  brands: string[];
  keywords: string[];
  score: number;
  reason?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  agent: string;
  type: 'tool' | 'action' | 'logic';
  enabled: boolean;
}

export interface Interests {
  categories: { [key: string]: InterestCategory };
  skills?: Skill[];
  lastUpdated?: number;
}

export interface FeedGroup {
  active: string[];
  pool: string[];
  failures: { [url: string]: number };
}

export interface FeedConfig {
  [category: string]: FeedGroup;
}

export interface NexusSettings {
  interests: Interests;
  feed_urls: FeedConfig;
  lastUpdated?: string | number;
}

export interface AgentStatus {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'error' | 'success' | 'refresh';
  lastMessage: string;
  timestamp: string;
}

export interface NexusState {
  settings: NexusSettings;
  draft: NexusSettings;
  isDirty: boolean;
  lastUpdated: string;
}

// Electron IPC Bridge definitions
export interface AgentEventData {
  agentId: string;
  status: 'idle' | 'working' | 'error' | 'success' | 'refresh';
  message: string;
  timestamp?: string;
}

export interface NexusApiBridge {
  getArticles: (options?: Record<string, unknown>) => Promise<Article[]>;
  getSettings: () => Promise<NexusSettings>;
  syncSettings: (settings: NexusSettings) => Promise<{ lastUpdated: number }>;
  triggerOrchestration: () => Promise<{ success: boolean; newFeedsCount: number }>;
  onAgentEvent: (callback: (data: AgentEventData) => void) => void;
  suggestCategory: (categoryName: string) => Promise<{
    brands: string[];
    keywords: string[];
    emoji: string;
    reason: string;
  }>;
  getApiKey: () => Promise<string>;
  saveApiKey: (apiKey: string) => Promise<{ success: boolean }>;
  windowControl: (action: 'minimize' | 'maximize' | 'close') => void;
}

declare global {
  interface Window {
    nexusApi: NexusApiBridge;
  }
}
