import { NexusAPI } from './api.js';
import { store } from './store.js';
import { AgentMonitor } from './components/AgentMonitor.js';

/**
 * Nexus UI Controller
 */
class NexusUI {
  constructor() {
    this.monitor = new AgentMonitor('agent-monitor-events');
    this.currentTab = 'discover';
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.setupStoreSubscription();
    
    // Initial fetch
    try {
      await store.initialize(NexusAPI);
      this.setupSSE();
      this.render();
    } catch (error) {
      this.showNotification('Initialization failed: ' + error.message, 'error');
    }
  }

  setupEventListeners() {
    // Navigation Tabs
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Nexus Core Actions
    document.getElementById('btn-add-interest')?.addEventListener('click', () => this.addInterest());
    document.getElementById('btn-add-feed')?.addEventListener('click', () => this.addFeed());
    document.getElementById('btn-commit')?.addEventListener('click', () => this.commitChanges());
    document.getElementById('btn-discard')?.addEventListener('click', () => store.discardDraft());
    
    // Orchestration
    document.getElementById('btn-orchestrate')?.addEventListener('click', () => this.startOrchestration());

    // Refresh News
    document.getElementById('btn-refresh-news')?.addEventListener('click', () => this.refreshNews());
  }

  setupStoreSubscription() {
    store.subscribe((state) => {
      this.renderNexusCore(state);
      this.updateStatusUI(state);
    });
  }

  setupSSE() {
    const eventSource = NexusAPI.getEventSource();
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.monitor.addEvent(data);
      
      // If evolution log view is active, append to log content
      if (this.currentTab === 'evolution') {
        this.appendEvolutionLog(data);
      }
    };
    eventSource.onerror = () => {
      console.error('SSE connection lost');
      eventSource.close();
      setTimeout(() => this.setupSSE(), 5000);
    };
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    
    // Update Nav UI
    document.querySelectorAll('.nav-item').forEach(btn => {
      const isSelected = btn.dataset.tab === tabId;
      btn.classList.toggle('text-nexus-blue', isSelected);
      btn.classList.toggle('text-slate-400', !isSelected);
    });

    // Update View UI
    document.querySelectorAll('.view-section').forEach(view => {
      view.classList.toggle('hidden', view.id !== `view-${tabId}`);
    });

    if (tabId === 'discover') this.refreshNews();
  }

  render() {
    this.renderNexusCore(store.state);
  }

  renderNexusCore(state) {
    const interestsList = document.getElementById('interests-list');
    const feedsList = document.getElementById('feeds-list');
    const revisionsList = document.getElementById('revisions-list');
    
    if (!interestsList || !feedsList) return;

    const currentInterests = state.draft.interests || state.interests;
    const currentFeeds = state.draft.feedConfig || state.feedConfig;

    // Render Interests
    interestsList.innerHTML = currentInterests.map((interest, idx) => `
      <div class="px-4 py-2 rounded-full bg-nexus-blue/10 border border-nexus-blue/30 text-nexus-blue text-sm flex items-center gap-2 group animate-fade-in">
        ${interest}
        <button onclick="window.nexusUI.removeInterest(${idx})" class="opacity-0 group-hover:opacity-100 transition-opacity">
          <i data-lucide="x" class="w-3 h-3"></i>
        </button>
      </div>
    `).join('') || '<p class="text-slate-500 italic">No interests defined.</p>';

    // Render Feeds
    feedsList.innerHTML = currentFeeds.map((feed, idx) => `
      <div class="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center group animate-fade-in">
        <div>
          <h3 class="font-medium text-slate-200">${feed.name}</h3>
          <p class="text-xs text-slate-500 truncate max-w-[300px]">${feed.url}</p>
        </div>
        <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span class="px-2 py-1 rounded bg-nexus-violet/20 text-nexus-violet text-[10px] uppercase font-bold">${feed.category || 'general'}</span>
          <button onclick="window.nexusUI.removeFeed(${idx})" class="text-rose-400 hover:text-rose-300">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `).join('') || '<p class="text-slate-500 italic">No intelligence sources defined.</p>';

    // Render Revisions
    if (revisionsList) {
      revisionsList.innerHTML = state.revisions.map((rev, idx) => `
        <button onclick="window.nexusUI.rollback(${idx})" class="w-full text-left p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-nexus-border transition-all">
          <div class="flex justify-between items-center mb-1">
            <span class="text-xs font-mono text-slate-400">#${state.revisions.length - idx}</span>
            <span class="text-[10px] text-slate-500">${new Date(rev.timestamp).toLocaleString()}</span>
          </div>
          <p class="text-xs text-slate-300">Restoration Point Available</p>
        </button>
      `).join('') || '<p class="text-slate-500 text-center py-4 text-xs">No revisions recorded yet.</p>';
    }

    if (window.lucide) window.lucide.createIcons();
  }

  updateStatusUI(state) {
    const btnCommit = document.getElementById('btn-commit');
    const btnDiscard = document.getElementById('btn-discard');
    const statusText = document.getElementById('store-status-text');

    if (btnCommit && btnDiscard && statusText) {
      btnCommit.disabled = !state.isDirty;
      btnDiscard.disabled = !state.isDirty;
      btnDiscard.classList.toggle('opacity-50', !state.isDirty);
      btnDiscard.classList.toggle('cursor-not-allowed', !state.isDirty);
      
      statusText.textContent = state.isDirty ? 'Draft Changes (Uncommitted)' : 'Synchronized';
      statusText.className = `font-mono ${state.isDirty ? 'text-amber-400' : 'text-emerald-400'}`;
    }
  }

  addInterest() {
    const interest = prompt('Enter new interest/keyword:');
    if (interest) {
      const current = store.state.draft.interests || store.state.interests;
      store.updateDraft('interests', [...current, interest]);
    }
  }

  removeInterest(index) {
    const current = [...(store.state.draft.interests || store.state.interests)];
    current.splice(index, 1);
    store.updateDraft('interests', current);
  }

  addFeed() {
    const name = prompt('Feed Name:');
    const url = prompt('RSS URL:');
    if (name && url) {
      const current = store.state.draft.feedConfig || store.state.feedConfig;
      store.updateDraft('feedConfig', [...current, { name, url, category: 'manual' }]);
    }
  }

  removeFeed(index) {
    const current = [...(store.state.draft.feedConfig || store.state.feedConfig)];
    current.splice(index, 1);
    store.updateDraft('feedConfig', current);
  }

  async commitChanges() {
    try {
      const btn = document.getElementById('btn-commit');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Committing...';
      if (window.lucide) window.lucide.createIcons();

      await store.commit(NexusAPI);
      this.showNotification('Changes synchronized successfully');
    } catch (error) {
      this.showNotification('Sync failed: ' + error.message, 'error');
    } finally {
      const btn = document.getElementById('btn-commit');
      btn.innerHTML = '<i data-lucide="check-circle" class="w-5 h-5"></i> Commit Changes';
      if (window.lucide) window.lucide.createIcons();
    }
  }

  rollback(index) {
    if (confirm('Rollback to this revision? Current draft will be overwritten.')) {
      store.rollback(index);
    }
  }

  async startOrchestration() {
    const input = document.getElementById('orchestrate-input');
    const requirements = input.value.trim();
    if (!requirements) return;

    try {
      await NexusAPI.startOrchestration(requirements);
      input.value = '';
      this.showNotification('Orchestration started');
    } catch (error) {
      this.showNotification('Failed to start orchestration: ' + error.message, 'error');
    }
  }

  async refreshNews() {
    const grid = document.getElementById('news-grid');
    // Using existing /api/articles or similar if available, 
    // but for now let's use a mock or fetch if the endpoint exists.
    try {
      const res = await fetch('/api/articles');
      if (!res.ok) throw new Error();
      const articles = await res.json();
      
      grid.innerHTML = articles.map(article => `
        <div class="glass-card overflow-hidden flex flex-col group animate-fade-in">
          <div class="h-48 bg-white/5 relative">
            ${article.imageUrl ? `<img src="${article.imageUrl}" class="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />` : '<div class="w-full h-full flex items-center justify-center text-slate-700"><i data-lucide="image" class="w-12 h-12"></i></div>'}
            <div class="absolute top-4 left-4 flex gap-2">
              <span class="px-2 py-1 rounded bg-nexus-blue/80 text-[10px] text-white backdrop-blur-md uppercase font-bold">${article.category || 'AI'}</span>
            </div>
          </div>
          <div class="p-6 flex-1 flex flex-col">
            <h3 class="text-lg font-bold mb-3 line-clamp-2 text-slate-100 group-hover:text-nexus-blue transition-colors">${article.title}</h3>
            <p class="text-sm text-slate-400 line-clamp-3 mb-4">${article.summary || article.content}</p>
            <div class="mt-auto pt-4 border-t border-white/5 flex justify-between items-center">
              <span class="text-[10px] text-slate-500 uppercase">${new Date(article.publishedAt || Date.now()).toLocaleDateString()}</span>
              <a href="${article.url}" target="_blank" class="text-nexus-blue hover:text-nexus-cyan transition-colors">
                <i data-lucide="external-link" class="w-4 h-4"></i>
              </a>
            </div>
          </div>
        </div>
      `).join('') || '<p class="col-span-full text-center py-20 text-slate-500">No signals detected in the neural grid.</p>';
      
      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      grid.innerHTML = '<p class="col-span-full text-center py-20 text-rose-400">Neural Grid Disconnected.</p>';
    }
  }

  appendEvolutionLog(data) {
    const log = document.getElementById('evolution-log-content');
    if (!log) return;
    
    const entry = document.createElement('div');
    entry.className = 'animate-slide-up';
    const timestamp = new Date().toLocaleTimeString();
    const agentName = data.agent ? `[${data.agent.toUpperCase()}]` : '[SYSTEM]';
    const agentColor = this.getLogColorForAgent(data.agent);
    
    entry.innerHTML = `<span class="text-slate-600">${timestamp}</span> <span class="${agentColor}">${agentName}</span> ${data.message}`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }

  getLogColorForAgent(agent) {
    switch (agent?.toLowerCase()) {
      case 'architect': return 'text-nexus-blue';
      case 'generator': return 'text-nexus-cyan';
      case 'evaluator': return 'text-nexus-violet';
      default: return 'text-slate-500';
    }
  }

  showNotification(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl mica-effect border-l-4 ${type === 'success' ? 'border-emerald-500' : 'border-rose-500'} flex items-center gap-3 shadow-2xl z-[200] animate-slide-up`;
    toast.innerHTML = `
      <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" class="w-5 h-5 ${type === 'success' ? 'text-emerald-500' : 'text-rose-500'}"></i>
      <span class="text-sm font-medium">${message}</span>
    `;
    document.body.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();
    
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      toast.style.transition = 'all 0.5s ease-out';
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }
}

window.nexusUI = new NexusUI();
