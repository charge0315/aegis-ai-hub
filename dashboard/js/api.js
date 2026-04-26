/**
 * API通信を担当するモジュール
 */
export const API = {
    // 常に /api プレフィックスを含むベースURLを返す
    get BASE_URL() {
        const origin = window.location.port === '3005' ? '' : 'http://localhost:3005';
        return `${origin}/api`;
    },

    async fetchDashboard() {
        const res = await fetch(`${this.BASE_URL}/dashboard`);
        if (!res.ok) throw new Error('API Error');
        return await res.json();
    },

    async fetchRecommendations() {
        const res = await fetch(`${this.BASE_URL}/recommend`);
        if (!res.ok) throw new Error('API Error');
        return await res.json();
    },

    async fetchInterests() {
        const res = await fetch(`${this.BASE_URL}/interests`);
        if (!res.ok) throw new Error('Interests API Error');
        return await res.json();
    },

    async fetchFeeds() {
        const res = await fetch(`${this.BASE_URL}/feeds`);
        if (!res.ok) throw new Error('Feeds API Error');
        return await res.json();
    },

    async syncSettings(data) {
        const res = await fetch(`${this.BASE_URL}/sync-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Settings Sync Error');
        return await res.json();
    },

    async fetchEvolutionProposals() {
        const res = await fetch(`${this.BASE_URL}/evolution-proposals`);
        if (!res.ok) throw new Error('Evolution API Error');
        return await res.json();
    },

    async fetchRestructureProposals() {
        const res = await fetch(`${this.BASE_URL}/restructure-proposals`);
        if (!res.ok) throw new Error('Restructure API Error');
        return await res.json();
    }
};
