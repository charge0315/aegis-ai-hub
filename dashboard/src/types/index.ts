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

export interface Interests {
  categories: { [key: string]: InterestCategory };
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
  status: 'idle' | 'working' | 'error' | 'success';
  lastMessage: string;
  timestamp: string;
}

export interface NexusState {
  settings: NexusSettings;
  draft: NexusSettings;
  isDirty: boolean;
  lastUpdated: string;
}
