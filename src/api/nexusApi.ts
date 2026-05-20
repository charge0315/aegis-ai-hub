import { useState, useEffect, useCallback } from 'react';
import type { Article, NexusSettings, AgentStatus, InterestCategory, FeedConfig, UiSettings, TrendSuggestion, Interests, UsageStats } from '../types';

export interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
}

const isE2E = () => (typeof window !== 'undefined' && (window as unknown as { isE2ETest?: boolean }).isE2ETest === true);

/**
 * Aegis Nexus API Client
 * Provides a unified interface for both Electron IPC and Browser (via HTTP proxy)
 */
export const nexusApi = {
  getBackendUrl(): string {
    // In dev mode, we use the Vite proxy or direct Fastify port
    return isE2E() ? '' : 'http://localhost:3005';
  },

  async getArticles(): Promise<Article[]> {
    // 1. Electron IPC (Preferred)
    if (window.nexusApi?.getArticles && !isE2E()) {
      return await window.nexusApi.getArticles();
    }
    // 2. Browser Fallback (Fetch)
    try {
      const url = `${this.getBackendUrl()}/api/dashboard`;
      const res = await fetch(url);
      const data = await res.json();
      const allArticles: Article[] = [];
      // Flatten grouped dashboard data from HTTP API
      Object.values(data as Record<string, { articles: Article[] }>).forEach(group => {
        if (group?.articles) allArticles.push(...group.articles);
      });
      return allArticles.sort((a, b) => b.score - a.score);
    } catch (e) {
      console.error('[nexusApi] Fetch articles failed:', e);
      return [];
    }
  },

  async getSettings(): Promise<NexusSettings> {
    if (window.nexusApi?.getSettings && !isE2E()) {
      return await window.nexusApi.getSettings();
    }
    try {
      const urlInterests = `${this.getBackendUrl()}/api/v5/interests`;
      const urlFeeds = `${this.getBackendUrl()}/api/v5/feeds`;
      const interests = await fetch(urlInterests).then(r => r.json());
      const feeds = await fetch(urlFeeds).then(r => r.json());
      return { interests, feedConfig: feeds };
    } catch (e) {
      console.error('[nexusApi] Fetch settings failed:', e);
      throw e;
    }
  },

  async syncSettings(settings: NexusSettings): Promise<{ lastUpdated: number }> {
    if (window.nexusApi?.syncSettings && !isE2E()) {
      return await window.nexusApi.syncSettings(settings);
    }
    const res = await fetch(`${this.getBackendUrl()}/api/v5/sync-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return await res.json();
  },

  async triggerOrchestration(requirements?: string): Promise<{ success: boolean; newFeedsCount: number }> {
    if (window.nexusApi?.triggerOrchestration && !isE2E()) {
      return await window.nexusApi.triggerOrchestration(requirements);
    }
    const res = await fetch(`${this.getBackendUrl()}/api/v5/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirements })
    });
    return await res.json();
  },

  async suggestCategory(categoryName: string): Promise<{ brands: string[], keywords: string[], emoji: string, reason: string }> {
    if (window.nexusApi?.suggestCategory && !isE2E()) {
      return await window.nexusApi.suggestCategory(categoryName);
    }
    const res = await fetch(`${this.getBackendUrl()}/api/v5/suggest-category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryName })
    });
    return await res.json();
  },

  async restructureCategories(count?: number, language: string = 'ja'): Promise<{ categories: Record<string, InterestCategory>, feedConfig: FeedConfig }> {
    if (window.nexusApi?.restructureCategories && !isE2E()) {
      return await window.nexusApi.restructureCategories(count, language);
    }
    const res = await fetch(`${this.getBackendUrl()}/api/v5/restructure-categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, language })
    });
    return await res.json();
  },

  async discoverTrends(): Promise<{ suggestions: TrendSuggestion[] }> {
    if (window.nexusApi?.discoverTrends && !isE2E()) {
      return await window.nexusApi.discoverTrends();
    }
    const res = await fetch(`${this.getBackendUrl()}/api/v5/discover-trends`, { method: 'POST' });
    return await res.json();
  },

  async translateInterests(settings: NexusSettings): Promise<{ interests: Interests, feedConfig: FeedConfig }> {
    if (window.nexusApi?.translateInterests && !isE2E()) {
      return await window.nexusApi.translateInterests(settings);
    }
    const res = await fetch(`${this.getBackendUrl()}/api/v5/translate-interests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return await res.json();
  },

  async resetToDefaults(language: string = 'ja'): Promise<{ success: boolean }> {
    if (window.nexusApi?.resetToDefaults && !isE2E()) {
      return await window.nexusApi.resetToDefaults(language);
    }
    const res = await fetch(`${this.getBackendUrl()}/api/v5/reset-to-defaults`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language })
    });
    return await res.json();
  },

  async getApiKey(): Promise<string> {
    if (window.nexusApi?.getApiKey && !isE2E()) {
      return await window.nexusApi.getApiKey();
    }
    return '';
  },

  async saveApiKey(apiKey: string): Promise<{ success: boolean }> {
    if (window.nexusApi?.saveApiKey && !isE2E()) {
      return await window.nexusApi.saveApiKey(apiKey);
    }
    return { success: true };
  },

  async getUiSettings(): Promise<UiSettings> {
    if (window.nexusApi?.getUiSettings && !isE2E()) {
      return await window.nexusApi.getUiSettings();
    }
    try {
      const url = `${this.getBackendUrl()}/api/v5/ui-settings`;
      const res = await fetch(url);
      return await res.json();
    } catch {
      return { jaOnly: false, viewMode: 'grid', hideImages: false, isInitialized: true, theme: 'system', language: 'ja' };
    }
  },

  async saveUiSettings(settings: UiSettings): Promise<{ success: boolean }> {
    if (window.nexusApi?.saveUiSettings && !isE2E()) {
      return await window.nexusApi.saveUiSettings(settings);
    }
    return { success: true };
  },

  onUsageUpdate(callback: (stats: UsageStats) => void): () => void {
    if (window.nexusApi?.onUsageUpdate && !isE2E()) {
      return window.nexusApi.onUsageUpdate(callback);
    }
    return () => {};
  },

  async getUsageStats(): Promise<UsageStats> {
    if (window.nexusApi?.getUsageStats && !isE2E()) {
      return await window.nexusApi.getUsageStats();
    }
    try {
      const url = `${this.getBackendUrl()}/api/v5/usage-stats`;
      const res = await fetch(url);
      return await res.json();
    } catch {
      return {};
    }
  },

  windowControl(action: 'minimize' | 'maximize' | 'close' | 'quit'): void {
    if (window.nexusApi?.windowControl && !isE2E()) {
      window.nexusApi.windowControl(action as unknown as 'minimize' | 'maximize' | 'close');
    }
  },
  
  openExternal(url: string): void {
    if (window.nexusApi?.openExternal && !isE2E()) {
      window.nexusApi.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  }
};

/**
 * Hook to synchronize Nexus settings and articles
 */
export function useNexusSync() {
  const [settings, setSettings] = useState<NexusSettings | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setIsSyncing(true);

      const [s, a] = await Promise.all([
        nexusApi.getSettings(),
        nexusApi.getArticles()
      ]);
      setSettings(s);
      setArticles(a);
      setError(null);
    } catch (err: unknown) {
      console.error('[useNexusSync] Fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Fetch error');
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (active) await fetchData(false);
    };
    void load();
    return () => { active = false; };
  }, [fetchData]);

  const sync = useCallback(async (newSettings: NexusSettings) => {
    try {
      setIsSyncing(true);
      const result = await nexusApi.syncSettings(newSettings);
      setSettings({
        ...newSettings,
        interests: {
          ...newSettings.interests,
          lastUpdated: result.lastUpdated
        }
      });
      // Refresh articles after sync
      const a = await nexusApi.getArticles();
      setArticles(a);
    } catch (err: unknown) {
      console.error('[useNexusSync] Sync failed:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return { settings, articles, loading, isSyncing, error, sync, refetch: fetchData };
}
/**
 * Hook to monitor Agent swarm events
 */
export function useAgentEvents(onRefresh?: () => void) {
  const [events, setEvents] = useState<AgentStatus[]>([
    { id: 'architect', name: 'Architect', status: 'idle', lastMessage: '', timestamp: '' },
    { id: 'curator', name: 'Curator', status: 'idle', lastMessage: '', timestamp: '' },
    { id: 'discovery', name: 'Discovery', status: 'idle', lastMessage: '', timestamp: '' },
    { id: 'archivist', name: 'Archivist', status: 'idle', lastMessage: '', timestamp: '' },
  ]);

  useEffect(() => {
    const backendUrl = isE2E() ? '' : 'http://localhost:3005';
    // If not in Electron or specifically in E2E mode, use SSE
    if (!window.nexusApi || isE2E()) {
      const eventSource = new EventSource(`${backendUrl}/api/v5/events`);
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.status === 'refresh') {
            onRefresh?.();
          } else if (data.agentId) {
            setEvents(prev => prev.map(a => a.id === data.agentId ? { ...a, ...data } : a));
          }
        } catch (err) {
          console.error('[SSE] Event parse error:', err);
        }
      };
      return () => eventSource.close();
    }
    
    // Electron IPC Event Listener
    window.nexusApi.onAgentEvent((data) => {
      if (data.status === 'refresh') {
        onRefresh?.();
      } else if (data.agentId) {
        setEvents(prev => prev.map(a => a.id === data.agentId ? { ...a, ...data } : a));
      }
    });
    
    return () => { 
      window.nexusApi?.removeAgentEventListener?.(); 
    };
  }, [onRefresh]);

  return events;
}
