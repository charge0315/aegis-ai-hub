import { API } from './api.js';
import { Store } from './store.js';
import { UI } from './ui.js';

/**
 * アプリケーションのエントリポイント
 */
class GadgetConciergeApp {
    constructor() {
        this.init();
    }

    log(msg, isError = false) {
        const consoleEl = document.getElementById('debug-console');
        if (consoleEl) {
            consoleEl.classList.remove('hidden');
            const entry = document.createElement('div');
            entry.className = isError ? 'text-rose-500' : 'text-lime-400';
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
            consoleEl.prepend(entry);
        }
        console[isError ? 'error' : 'log'](msg);
    }

    async init() {
        this.log('GC Dashboard Initializing...');
        
        // 検索バーのイベント登録
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                Store.setSearchQuery(e.target.value);
                this.refreshUI();
            });
        }

        // 初回ロード
        await this.fetchDashboard();
    }

    /**
     * 最新のダッシュボードデータを取得します。
     */
    async fetchDashboard() {
        this.log('Fetching dashboard data...');
        UI.renderSkeletons();
        try {
            const data = await API.fetchDashboard();
            this.log(`Data loaded successfully: ${Object.keys(data).length} categories found.`);
            Store.setArticles(data);
            this.refreshUI();
        } catch (err) {
            this.log(`Dashboard fetch failed: ${err.message}`, true);
            document.getElementById('sections-container').innerHTML = 
                `<div class="text-center py-20 text-rose-400 font-bold text-2xl">APIサーバー接続エラー: ${err.message}</div>`;
        }
    }

    /**
     * Gemini APIを使用して特別なおすすめ10選を生成します。
     */
    async fetchRecommendations() {
        this.log('Generating Gemini recommendations...');
        const btn = document.getElementById('gemini-btn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner animate-spin mr-3"></i> AI思考中...';

        try {
            const recommendations = await API.fetchRecommendations();
            this.log('Gemini recommendations received.');
            UI.renderRecommendations(recommendations, Store);
            document.getElementById('recommendations-container').scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            this.log(`Gemini API Error: ${err.message}`, true);
            alert(`Gemini APIエラー: ${err.message}\n.envファイルに有効なキーが設定されているか、コンテナのログを確認してください。`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    /**
     * ストアの状態をUIに反映します（再レンダリング）。
     */
    refreshUI() {
        const filteredData = Store.getFilteredArticles();
        UI.renderDashboard(filteredData, Store);
    }

    /**
     * 記事を既読にします。
     */
    markAsRead(url, cardElement) {
        Store.markAsRead(url);
        if (cardElement) {
            cardElement.classList.add('is-read');
            // READテキストへの差し替え
            const badge = cardElement.querySelector('.mt-auto span');
            if (badge) badge.innerHTML = '<i class="fas fa-check-circle"></i> READ';
        }
    }

    /**
     * 新しい興味を学習させます。
     */
    async updateInterest(type, value, name = '') {
        if (!value) return;
        const status = document.getElementById('status-msg');
        try {
            await API.updateInterest(type, value, name);
            if (status) {
                status.textContent = '興味を学習しました！リロード中...';
                status.classList.remove('hidden');
            }
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            alert('APIエラーが発生しました。');
        }
    }
}

// グローバルからアクセス可能にする（onclickイベント用）
window.app = new GadgetConciergeApp();
window.updateInterest = (t, v, n) => window.app.updateInterest(t, v, n);
window.fetchDashboard = () => window.app.fetchDashboard();
