import axios from 'axios';
import { useState, useEffect, useCallback } from 'react';
import type { Article, NexusSettings, AgentStatus } from '../types';

const API_BASE = '/api';

export const nexusApi = {
  async getArticles(): Promise<Article[]> {
    const response = await axios.get(`${API_BASE}/dashboard`);
    return response.data;
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

  async syncSettings(settings: NexusSettings): Promise<unknown> {
    const payload = {
      interests: settings.interests,
      feedConfig: settings.feed_urls,
      lastUpdated: new Date().toISOString()
    };
    const response = await axios.post(`${API_BASE}/v5/sync-settings`, payload);
    return response.data;
  },

  async triggerOrchestration(requirements: string): Promise<void> {
    await axios.post(`${API_BASE}/v5/orchestrate`, { requirements });
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
    // Wrap in setTimeout to avoid synchronous setState in effect warning
    const timer = setTimeout(() => {
      void fetchData(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const sync = async (newSettings: NexusSettings) => {
    await nexusApi.syncSettings(newSettings);
    setSettings(newSettings);
    // Optionally refresh articles
    const a = await nexusApi.getArticles();
    setArticles(a);
  };

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
    const eventSource = new EventSource(`${API_BASE}/v5/events`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.agentId) {
          setEvents(prev => prev.map(agent => 
            agent.id === data.agentId 
              ? { ...agent, status: data.status, lastMessage: data.message, timestamp: data.timestamp }
              : agent
          ));
        }
      } catch (err) {
        console.error('Failed to parse SSE event', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return events;
}
