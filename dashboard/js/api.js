/**
 * API通信を担当するモジュール
 */
export const API = {
    // 開発・実行環境に合わせてベースURLを自動決定
    // localhost:3005以外から開かれた場合は、バックエンドのアドレスを明示的に指定
    get BASE_URL() {
        if (window.location.port === '3005') {
            return ''; // 同じサーバーから配信されている場合は相対パス
        }
        return 'http://localhost:3005'; // それ以外（file://や他ポート）の場合は明示的に指定
    },

    async fetchDashboard() {
        try {
            const res = await fetch(`${this.BASE_URL}/api/dashboard`);
            if (!res.ok) throw new Error('API Error');
            return await res.json();
        } catch (err) {
            console.error('Fetch error:', err);
            throw err;
        }
    },

    async fetchRecommendations() {
        try {
            const res = await fetch(`${this.BASE_URL}/api/recommend`);
            if (!res.ok) throw new Error('API Error');
            return await res.json();
        } catch (err) {
            console.error('Recommendations error:', err);
            throw err;
        }
    },

    async updateInterest(type, value, name = '') {
        try {
            const res = await fetch(`${this.BASE_URL}/api/update-interests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, value, name })
            });
            return await res.json();
        } catch (err) {
            console.error('Update error:', err);
            throw err;
        }
    },

    async fetchEvolutionProposals() {
        try {
            const res = await fetch(`${this.BASE_URL}/api/evolution-proposals`);
            if (!res.ok) throw new Error('Evolution API Error');
            return await res.json();
        } catch (err) {
            console.error('Evolution Proposals error:', err);
            throw err;
        }
    },

    async applyEvolution(data) {
        try {
            const res = await fetch(`${this.BASE_URL}/api/apply-evolution`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Apply Evolution Error');
            return await res.json();
        } catch (err) {
            console.error('Apply Evolution error:', err);
            throw err;
        }
    },

    async fetchRestructureProposals() {
        try {
            const res = await fetch(`${this.BASE_URL}/api/restructure-proposals`);
            if (!res.ok) throw new Error('Restructure API Error');
            return await res.json();
        } catch (err) {
            console.error('Restructure Proposals error:', err);
            throw err;
        }
    },

    async applyRestructure(data) {
        try {
            const res = await fetch(`${this.BASE_URL}/api/apply-restructure`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Apply Restructure Error');
            return await res.json();
        } catch (err) {
            console.error('Apply Restructure error:', err);
            throw err;
        }
    }
};
