/**
 * Nexus Store
 * Manages drafts, revisions, and state synchronization
 */
export class NexusStore {
  constructor() {
    this.state = {
      interests: [],
      feedConfig: [],
      draft: {
        interests: null,
        feedConfig: null,
      },
      revisions: [],
      isDirty: false,
      lastSync: null,
    };
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(l => l(this.state));
    this.saveToLocalStorage();
  }

  async initialize(api) {
    try {
      const [interests, feedConfig] = await Promise.all([
        api.fetchInterests(),
        api.fetchFeeds()
      ]);
      
      this.state.interests = interests;
      this.state.feedConfig = feedConfig;
      
      // Load draft from localStorage if exists
      this.loadFromLocalStorage();
      
      this.notify();
    } catch (error) {
      console.error('Failed to initialize store:', error);
      throw error;
    }
  }

  updateDraft(type, value) {
    this.state.draft[type] = value;
    this.state.isDirty = true;
    this.notify();
  }

  discardDraft() {
    this.state.draft = { interests: null, feedConfig: null };
    this.state.isDirty = false;
    this.notify();
  }

  async commit(api) {
    const payload = {
      interests: this.state.draft.interests || this.state.interests,
      feedConfig: this.state.draft.feedConfig || this.state.feedConfig,
    };

    try {
      const result = await api.syncSettings(payload);
      
      // Save revision before updating main state
      this.state.revisions.unshift({
        timestamp: new Date().toISOString(),
        interests: this.state.interests,
        feedConfig: this.state.feedConfig
      });
      if (this.state.revisions.length > 10) this.state.revisions.pop();

      // Update current state
      this.state.interests = payload.interests;
      this.state.feedConfig = payload.feedConfig;
      this.state.draft = { interests: null, feedConfig: null };
      this.state.isDirty = false;
      this.state.lastSync = result.timestamp;
      
      this.notify();
      return result;
    } catch (error) {
      console.error('Failed to commit changes:', error);
      throw error;
    }
  }

  rollback(revisionIndex) {
    const revision = this.state.revisions[revisionIndex];
    if (revision) {
      this.state.draft.interests = JSON.parse(JSON.stringify(revision.interests));
      this.state.draft.feedConfig = JSON.parse(JSON.stringify(revision.feedConfig));
      this.state.isDirty = true;
      this.notify();
    }
  }

  saveToLocalStorage() {
    localStorage.setItem('nexus_store_state', JSON.stringify({
      draft: this.state.draft,
      revisions: this.state.revisions
    }));
  }

  loadFromLocalStorage() {
    const saved = localStorage.getItem('nexus_store_state');
    if (saved) {
      const { draft, revisions } = JSON.parse(saved);
      this.state.draft = draft;
      this.state.revisions = revisions;
      this.state.isDirty = !!(draft.interests || draft.feedConfig);
    }
  }
}

export const store = new NexusStore();
