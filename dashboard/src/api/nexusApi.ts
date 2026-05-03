import { useState, useEffect, useCallback } from 'react';
import type { Article, NexusSettings, AgentStatus } from '../types';

export interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
}

// Fallback for non-Electron environments (e.g. Playwright tests)
const BACKEND_URL = 'http://localhost:3005';

/**
 * Electron IPC Bridge または HTTP API を介した API 呼び出し
 */
export const nexusApi = {
  async getArticles(): Promise<Article[]> {
    if (window.nexusApi) {
      return await window.nexusApi.getArticles();
    }
    const res = await fetch(`${BACKEND_URL}/api/dashboard`);
    const data = await res.json();
    
    // data is Record<string, { emoji: string, articles: Article[] }>
    const allArticles: Article[] = [];
    const groupedData = data as Record<string, { emoji: string, articles: Article[] }>;
    Object.values(groupedData).forEach((group) => {
      if (group && Array.isArray(group.articles)) {
        allArticles.push(...group.articles);
      }
    });
    return allArticles;
  },

  async getSettings(): Promise<NexusSettings> {
    if (window.nexusApi) {
      return await window.nexusApi.getSettings();
    }
    const res = await fetch(`${BACKEND_URL}/api/v5/interests`);
    const interests = await res.json();
    const resFeeds = await fetch(`${BACKEND_URL}/api/v5/feeds`);
    const feeds = await resFeeds.json();
    return { interests, feed_urls: feeds };
  },

  async syncSettings(settings: NexusSettings): Promise<{ lastUpdated: number }> {
    if (window.nexusApi) {
      return await window.nexusApi.syncSettings(settings);
    }
    const res = await fetch(`${BACKEND_URL}/api/v5/sync-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests: settings.interests, feedConfig: settings.feed_urls })
    });
    return await res.json();
  },

  async triggerOrchestration(requirements: string): Promise<void> {
    if (window.nexusApi) {
      await window.nexusApi.triggerOrchestration();
      return;
    }
    await fetch(`${BACKEND_URL}/api/v5/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirements })
    });
  },

  async suggestCategory(categoryName: string): Promise<{ brands: string[], keywords: string[], emoji: string, reason: string }> {
    if (window.nexusApi) {
      return await window.nexusApi.suggestCategory(categoryName);
    }
    const res = await fetch(`${BACKEND_URL}/api/v5/suggest-category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryName })
    });
    return await res.json();
  },

  async getProposals(): Promise<Record<string, unknown>> {
    if (window.nexusApi) {
      return await window.nexusApi.getProposals();
    }
    const res = await fetch(`${BACKEND_URL}/api/v5/proposals`);
    return await res.json();
  }
};

/**
 * データ取得と同期のためのカスタムフック
 */
export function useNexusSync() {
  const [settings, setSettings] = useState<NexusSettings | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [s, a] = await Promise.all([
        nexusApi.getSettings(),
        nexusApi.getArticles()
      ]);
      setSettings(s);
      setArticles(a);
      setError(null);
    } catch (err: unknown) {
      console.error('Fetch data failed:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      await fetchData(false);
      if (!isMounted) return;
    };

    void init();
    
    return () => { isMounted = false; };
  }, [fetchData]);

  const sync = useCallback(async (newSettings: NexusSettings) => {
    try {
      const result = await nexusApi.syncSettings(newSettings);
      const updatedSettings = {
        ...newSettings,
        interests: {
          ...newSettings.interests,
          lastUpdated: result.lastUpdated
        }
      };
      setSettings(updatedSettings);
      
      // 同期後に記事をリフレッシュ
      const a = await nexusApi.getArticles();
      setArticles(a);
    } catch (err) {
      console.error('Failed to sync settings:', err);
    }
  }, []);

  return { settings, articles, loading, error, sync, refetch: fetchData };
}

/**
 * エージェントイベントを受信するためのカスタムフック
 */
export function useAgentEvents(onRefresh?: () => void) {
  const [events, setEvents] = useState<AgentStatus[]>([
    { id: 'architect', name: 'Architect', status: 'idle', lastMessage: '', timestamp: '' },
    { id: 'curator', name: 'Curator', status: 'idle', lastMessage: '', timestamp: '' },
    { id: 'discovery', name: 'Discovery', status: 'idle', lastMessage: '', timestamp: '' },
    { id: 'archivist', name: 'Archivist', status: 'idle', lastMessage: '', timestamp: '' },
  ]);

  useEffect(() => {
    if (!window.nexusApi) {
      // Fallback for browser: Use SSE
      console.log('[Browser] Connecting to SSE for agent events...');
      const eventSource = new EventSource(`${BACKEND_URL}/api/v5/events`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === 'refresh') {
            console.log('[Browser] Refresh signal received');
            onRefresh?.();
            return;
          }
          if (data.agentId) {
            setEvents(prev => prev.map(agent => 
              agent.id === data.agentId 
                ? { ...agent, status: data.status, lastMessage: data.message, timestamp: data.timestamp || new Date().toISOString() }
                : agent
            ));
          }
        } catch (err) {
          console.error('[Browser] Failed to process SSE event', err);
        }
      };

      return () => eventSource.close();
    }

    console.log('[Electron] Registering agent event listener...');
    
    window.nexusApi.onAgentEvent((data) => {
      try {
        if (data.status === 'refresh') {
          onRefresh?.();
          return;
        }
        if (data.agentId) {
          setEvents(prev => prev.map(agent => 
            agent.id === data.agentId 
              ? { ...agent, status: data.status, lastMessage: data.message, timestamp: data.timestamp || new Date().toISOString() }
              : agent
          ));
        }
      } catch (err) {
        console.error('[Electron] Failed to process agent event', err);
      }
    });

    // Electronリスナーのクリーンアップ
    return () => {
      // ipcRendererのリスナーを削除
      if (window.nexusApi?.removeAgentEventListener) {
        window.nexusApi.removeAgentEventListener();
      }
    };
  }, [onRefresh]);

  return events;
}
