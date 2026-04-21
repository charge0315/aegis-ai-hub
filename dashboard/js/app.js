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

    async init() {
        console.log('GC Dashboard Initializing...');
        
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
        UI.renderSkeletons();
        try {
            const data = await API.fetchDashboard();
            Store.setArticles(data);
            this.refreshUI();
        } catch (err) {
            document.getElementById('sections-container').innerHTML = 
                '<div class="text-center py-20 text-rose-400 font-bold text-2xl">APIサーバーを起動、またはリロードしてください。</div>';
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
