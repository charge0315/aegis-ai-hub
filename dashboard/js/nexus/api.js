/**
 * Nexus API Interface
 * Optimised for v5.0 API endpoints
 */
export const NexusAPI = {
  baseUrl: '/api/v5',

  async fetchInterests() {
    const res = await fetch(`${this.baseUrl}/interests`);
    if (!res.ok) throw new Error('Failed to fetch interests');
    return res.json();
  },

  async fetchFeeds() {
    const res = await fetch(`${this.baseUrl}/feeds`);
    if (!res.ok) throw new Error('Failed to fetch feeds');
    return res.json();
  },

  async syncSettings(settings) {
    const res = await fetch(`${this.baseUrl}/sync-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to sync settings');
    }
    return res.json();
  },

  async startOrchestration(requirements) {
    const res = await fetch(`${this.baseUrl}/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirements })
    });
    if (!res.ok) throw new Error('Failed to start orchestration');
    return res.json();
  },

  getEventSource() {
    return new EventSource(`${this.baseUrl}/events`);
  }
};
