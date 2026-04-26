import { API } from './api.js';
import { Store } from './store.js';
import { UI } from './ui.js';

class AegisAIHubApp {
    constructor() {
        this.draftInterests = null;
        this.draftFeeds = null;
        this.currentTab = 'feeds';
        this.init();
    }

    log(msg, level = 'info') {
        const consoleEl = document.getElementById('debug-console');
        if (!consoleEl) return;
        consoleEl.classList.remove('hidden');
        const entry = document.createElement('div');
        let color = 'text-sky-400';
        if (level === 'success') color = 'text-emerald-400';
        if (level === 'error') color = 'text-rose-500 font-bold';
        if (level === 'ai') color = 'text-cyan-400 animate-pulse';
        entry.className = `flex gap-3 py-1 border-b border-white/5 last:border-0 ${color} text-[11px] font-mono`;
        entry.innerHTML = `<span>[${new Date().toLocaleTimeString()}]</span><span class="flex-grow">${msg}</span>`;
        consoleEl.prepend(entry);
    }

    async init() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.addEventListener('input', (e) => { Store.setSearchQuery(e.target.value); this.refreshUI(); });
        await this.fetchDashboard();
    }

    async fetchDashboard() {
        this.log('Returning to Neural Dashboard...', 'info');
        document.getElementById('settings-container')?.classList.add('hidden');
        document.getElementById('sections-container')?.classList.remove('hidden');
        document.getElementById('main-header')?.classList.remove('hidden');
        UI.renderSkeletons();
        try {
            const data = await API.fetchDashboard();
            Store.setArticles(data);
            this.refreshUI();
        } catch (err) { this.log(`Sync Error: ${err.message}`, 'error'); }
    }

    async showSettings() {
        this.log('Accessing Settings Core...', 'ai');
        UI.toggleSidebar();
        try {
            this.draftInterests = await API.fetchInterests();
            this.draftFeeds = await API.fetchFeeds();
            document.getElementById('settings-container').classList.remove('hidden');
            document.getElementById('sections-container').classList.add('hidden');
            document.getElementById('main-header')?.classList.add('hidden');
            document.getElementById('recommendations-container').classList.add('hidden');
            await this.switchSettingsTab(this.currentTab);
        } catch (err) { await UI.alert('設定の読み込みに失敗しました。'); }
    }

    async switchSettingsTab(tabName) {
        this.currentTab = tabName;
        const tabs = ['feeds', 'categories', 'keywords'];
        tabs.forEach(t => {
            const btn = document.getElementById(`tab-btn-${t}`);
            const content = document.getElementById(`tab-content-${t}`);
            if (t === tabName) { 
                btn?.classList.add('active', 'text-sky-400');
                btn?.classList.remove('text-slate-400');
                content?.classList.remove('hidden'); 
            } else { 
                btn?.classList.remove('active', 'text-sky-400');
                btn?.classList.add('text-slate-400');
                content?.classList.add('hidden'); 
            }
        });
        this.refreshSettingsUI();
    }

    refreshSettingsUI() {
        if (!this.draftInterests || !this.draftFeeds) return;
        if (this.currentTab === 'feeds') UI.renderFeedList(this.draftFeeds);
        else if (this.currentTab === 'categories') UI.renderCategoryManager(this.draftInterests);
        else UI.renderInterestGroups(this.draftInterests);
    }

    // --- 下書き編集操作 ---

    async draftAddInterest(type, category = '') {
        const val = await UI.showEditPrompt(`Add ${type.toUpperCase()}`, `Enter ${type} name:`, '');
        if (!val) return;
        const items = val.split(',').map(s => s.trim()).filter(s => s);
        if (type === 'category') {
            items.forEach(c => {
                if (!this.draftInterests.categories[c]) {
                    this.draftInterests.categories[c] = { brands: [], keywords: [], score: 5 };
                    if (!this.draftFeeds[c]) this.draftFeeds[c] = { active: [], pool: [] };
                }
            });
        } else {
            const list = type === 'keyword' ? this.draftInterests.categories[category].keywords : this.draftInterests.categories[category].brands;
            items.forEach(i => { if (!list.includes(i)) list.push(i); });
        }
        this.refreshSettingsUI();
    }

    async draftEditInterest(type, oldValue, category = '') {
        const newValue = await UI.showEditPrompt(`Rename ${type.toUpperCase()}`, `Current: ${oldValue}`, oldValue);
        if (!newValue || newValue === oldValue) return;
        if (type === 'category') {
            this.draftInterests.categories[newValue] = this.draftInterests.categories[oldValue];
            delete this.draftInterests.categories[oldValue];
            if (this.draftFeeds[oldValue]) {
                this.draftFeeds[newValue] = this.draftFeeds[oldValue];
                delete this.draftFeeds[oldValue];
            }
        }
        this.refreshSettingsUI();
    }

    async draftDeleteInterest(type, value, category = '') {
        if (!await UI.confirm(`「${value}」を削除(下書き)しますか？`)) return;
        if (type === 'category') {
            delete this.draftInterests.categories[value];
            delete this.draftFeeds[value];
        } else {
            const list = type === 'keyword' ? this.draftInterests.categories[category].keywords : this.draftInterests.categories[category].brands;
            const idx = list.indexOf(value);
            if (idx > -1) list.splice(idx, 1);
        }
        this.refreshSettingsUI();
    }

    async draftAddFeed() {
        const cats = Object.keys(this.draftInterests.categories);
        const res = await UI.showAddFeedDialog(cats);
        if (res) {
            if (!this.draftFeeds[res.category]) this.draftFeeds[res.category] = { active: [], pool: [] };
            if (!this.draftFeeds[res.category].pool.includes(res.url)) this.draftFeeds[res.category].pool.push(res.url);
            this.refreshSettingsUI();
        }
    }

    async draftEditFeed(category, oldUrl) {
        const newUrl = await UI.showEditPrompt('Update RSS URL', 'Enter new URL:', oldUrl);
        if (newUrl && newUrl !== oldUrl) {
            const c = this.draftFeeds[category];
            const up = (l) => l.map(u => u === oldUrl ? newUrl : u);
            c.active = up(c.active); c.pool = up(c.pool);
            this.refreshSettingsUI();
        }
    }

    async draftDeleteFeed(category, url) {
        if (!await UI.confirm('このRSSフィードを削除しますか？')) return;
        const c = this.draftFeeds[category];
        c.active = c.active.filter(u => u !== url);
        c.pool = c.pool.filter(u => u !== url);
        this.refreshSettingsUI();
    }

    async saveAllSettings() {
        if (!await UI.confirm('全ての設定を保存し、システムコアを再構築しますか？')) return;
        this.log('Rebuilding System Core...', 'ai');
        try {
            await API.syncSettings({ interests: this.draftInterests, feeds: this.draftFeeds });
            location.reload();
        } catch (err) { await UI.alert('保存に失敗しました。'); }
    }

    // --- AI 提案ロジック (アニメーション対応) ---

    async setBtnLoading(btnId, isLoading, text = '') {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (isLoading) {
            btn.dataset.original = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner animate-spin"></i> <span>${text}</span>`;
        } else {
            btn.innerHTML = btn.dataset.original;
            btn.disabled = false;
        }
    }

    async showEvolutionProposal() {
        await this.setBtnLoading('evolution-btn-settings', true, '分析中...');
        try {
            this.log('Consulting Gemini for DNA evolution...', 'ai');
            this.currentMode = 'evolution';
            this.currentProposals = await API.fetchEvolutionProposals();
            UI.renderProposalPreview(this.currentProposals);
            UI.showEvolutionModal();
        } catch (err) { await UI.alert(err.message); }
        finally { await this.setBtnLoading('evolution-btn-settings', false); }
    }

    async showRestructureProposal() {
        await this.setBtnLoading('restructure-btn-settings', true, '再構築案 生成中...');
        try {
            this.log('Running Structural Analysis...', 'ai');
            this.currentMode = 'restructure';
            this.currentProposals = await API.fetchRestructureProposals();
            UI.renderProposalPreview(this.currentProposals);
            UI.showEvolutionModal();
        } catch (err) { await UI.alert(err.message); }
        finally { await this.setBtnLoading('restructure-btn-settings', false); }
    }

    applyProposalToDraft() {
        if (this.currentMode === 'evolution') {
            const p = this.currentProposals;
            p.sites.forEach(s => {
                if (!this.draftFeeds[s.category]) this.draftFeeds[s.category] = { active: [], pool: [] };
                if (!this.draftFeeds[s.category].pool.includes(s.url)) this.draftFeeds[s.category].pool.push(s.url);
            });
            const add = (list, type) => list.forEach(i => {
                const cat = i.category;
                if (!this.draftInterests.categories[cat]) this.draftInterests.categories[cat] = { brands: [], keywords: [], score: 5 };
                const target = type === 'brand' ? this.draftInterests.categories[cat].brands : this.draftInterests.categories[cat].keywords;
                if (!target.includes(i.value)) target.push(i.value);
            });
            add(p.brands, 'brand'); add(p.keywords, 'keyword');
        } else if (this.currentMode === 'restructure') {
            this.draftInterests = { categories: this.currentProposals.categories, learned_keywords: {} };
            this.draftFeeds = {};
            for (const cat in this.currentProposals.categories) this.draftFeeds[cat] = { active: [], pool: [] };
        }
        UI.hideEvolutionModal();
        this.refreshSettingsUI();
    }

    setViewMode(mode) { Store.setViewMode(mode); this.refreshUI(); }
    refreshUI() {
        const data = Store.getFilteredArticles();
        UI.renderDashboard(data, Store);
        if (Store.recommendations.length > 0) UI.renderRecommendations(Store.recommendations, Store);
    }
    markAsRead(url, card) { Store.markAsRead(url); if (card) card.classList.add('is-read'); }
}

window.UI = UI;
window.app = new AegisAIHubApp();
window.fetchDashboard = () => window.app.fetchDashboard();
