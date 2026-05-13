import type { 
  InterestCategory as SchemaInterestCategory, 
  Interests as SchemaInterests, 
  FeedConfig as SchemaFeedConfig, 
  Skill as SchemaSkill,
  UiSettings as SchemaUiSettings
} from '../models/Schemas';

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
  language: string;
}

export type InterestCategory = SchemaInterestCategory;
export type Interests = SchemaInterests;
export type FeedConfig = SchemaFeedConfig;
export type Skill = SchemaSkill;
export type UiSettings = SchemaUiSettings;

export interface NexusSettings {
  interests: Interests;
  feedConfig: FeedConfig;
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

export interface TrendSuggestion {
  value: string;
  category: string;
  reason: string;
  type?: 'emerging' | 'breakthrough' | 'niche' | 'mainstream';
  confidence?: number;
  context?: string;
}

export interface NexusApiBridge {
  getArticles: (options?: Record<string, unknown>) => Promise<Article[]>;
  getSettings: () => Promise<NexusSettings>;
  syncSettings: (settings: NexusSettings) => Promise<{ lastUpdated: number }>;
  triggerOrchestration: () => Promise<{ success: boolean; newFeedsCount: number }>;
  onAgentEvent: (callback: (data: AgentEventData) => void) => void;
  removeAgentEventListener: () => void;
  suggestCategory: (categoryName: string) => Promise<{
    brands: string[];
    keywords: string[];
    emoji: string;
    reason: string;
  }>;
  getApiKey: () => Promise<string>;
  saveApiKey: (apiKey: string) => Promise<{ success: boolean }>;
  getProposals: () => Promise<{ sites: { url: string; name: string; reason: string; category: string }[] }>;
  restructureCategories: (count?: number) => Promise<{ categories: Record<string, InterestCategory>; feedConfig: FeedConfig }>;
  translateInterests: (interests: Interests) => Promise<Interests>;
  discoverTrends: () => Promise<{ suggestions: TrendSuggestion[] }>;
  resetToDefaults: () => Promise<{ success: boolean }>;
  windowControl: (action: 'minimize' | 'maximize' | 'close') => void;
  getUiSettings: () => Promise<UiSettings>;
  saveUiSettings: (settings: UiSettings) => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    nexusApi: NexusApiBridge;
  }
}
