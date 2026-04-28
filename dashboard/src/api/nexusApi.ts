import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import type { Article, NexusSettings, AgentStatus } from '../types';

const API_BASE = '/api';

export interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
}

export const nexusApi = {
  async getArticles(): Promise<Article[]> {
    const response = await axios.get(`${API_BASE}/dashboard`);
    const data = response.data;
    
    // Flatten the categorized object into a single array
    const allArticles: Article[] = [];
    Object.keys(data).forEach(category => {
      if (data[category] && Array.isArray(data[category].articles)) {
        allArticles.push(...data[category].articles);
      }
    });
    
    return allArticles;
  },

  async getSettings(): Promise<NexusSettings> {
    const [interests, feeds] = await Promise.all([
      axios.get(`${API_BASE}/v5/interests`),
      axios.get(`${API_BASE}/v5/feeds`)
    ]);
    return {
      interests: interests.data,
      feed_urls: feeds.data
    };
  },

  async syncSettings(settings: NexusSettings, windowState?: WindowState): Promise<{ lastUpdated: number }> {
    const payload: Record<string, unknown> = {
      interests: settings.interests,
      feedConfig: settings.feed_urls,
      lastUpdated: settings.interests.lastUpdated || Date.now()
    };
    if (windowState) {
      payload.windowState = windowState;
    }
    const response = await axios.post(`${API_BASE}/v5/sync-settings`, payload);
    return response.data as { lastUpdated: number };
  },

  async triggerOrchestration(requirements: string): Promise<void> {
    await axios.post(`${API_BASE}/v5/orchestrate`, { requirements });
  },

  async suggestCategory(categoryName: string): Promise<{ brands: string[], keywords: string[], emoji: string, reason: string }> {
    const response = await axios.post(`${API_BASE}/v5/suggest-category`, { categoryName });
    return response.data;
  }
};

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
    const result = await nexusApi.syncSettings(newSettings);
    // サーバー側で更新された lastUpdated をローカルステートに反映
    const updatedSettings = {
      ...newSettings,
      interests: {
        ...newSettings.interests,
        lastUpdated: result.lastUpdated
      }
    };
    setSettings(updatedSettings);
    
    // Refresh articles to match new interests
    try {
      const a = await nexusApi.getArticles();
      setArticles(a);
    } catch (err) {
      console.error('Failed to refresh articles after sync:', err);
    }
  }, []);

  return { settings, articles, loading, error, sync, refetch: fetchData };
}

export function useAgentEvents() {
  const [events, setEvents] = useState<AgentStatus[]>([
    { id: 'architect', name: 'Architect', status: 'idle', lastMessage: '', timestamp: '' },
    { id: 'curator', name: 'Curator', status: 'idle', lastMessage: '', timestamp: '' },
    { id: 'discovery', name: 'Discovery', status: 'idle', lastMessage: '', timestamp: '' },
    { id: 'archivist', name: 'Archivist', status: 'idle', lastMessage: '', timestamp: '' },
  ]);

  useEffect(() => {
    console.log('[SSE] Connecting to /api/v5/events...');
    const eventSource = new EventSource(`${API_BASE}/v5/events`);

    eventSource.onopen = () => {
      console.log('[SSE] Connection established.');
    };

    eventSource.onmessage = (event) => {
      try {
        console.log('[SSE] Received event:', event.data);
        const data = JSON.parse(event.data);
        if (data.agentId) {
          setEvents(prev => prev.map(agent => 
            agent.id === data.agentId 
              ? { ...agent, status: data.status, lastMessage: data.message, timestamp: data.timestamp || new Date().toISOString() }
              : agent
          ));
        }
      } catch (err) {
        console.error('[SSE] Failed to parse event', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Connection error/closed', err);
      eventSource.close();
    };

    return () => {
      console.log('[SSE] Closing connection.');
      eventSource.close();
    };
  }, []);

  return events;
}
