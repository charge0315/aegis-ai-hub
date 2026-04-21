/**
 * API通信を担当するモジュール
 */
export const API = {
    BASE_URL: 'http://localhost:3005',

    async fetchDashboard() {
        try {
            const res = await fetch(`${this.BASE_URL}/dashboard`);
            if (!res.ok) throw new Error('API Error');
            return await res.json();
        } catch (err) {
            console.error('Fetch error:', err);
            throw err;
        }
    },

    async updateInterest(type, value, name = '') {
        try {
            const res = await fetch(`${this.BASE_URL}/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, value, name })
            });
            return await res.json();
        } catch (err) {
            console.error('Update error:', err);
            throw err;
        }
    }
};
