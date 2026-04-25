import { API } from './api.js';
import { Store } from './store.js';
import { UI } from './ui.js';

/**
 * アプリケーションのエントリポイント
 */
class AegisAIHubApp {
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
        this.log('Aegis AI Hub Initializing...');
        
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
     * AI進化提案を取得して表示します。
     */
    async showEvolutionProposal() {
        this.currentMode = 'evolution';
        this.log('Fetching AI evolution proposals...');
        const btn = document.getElementById('evolution-btn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner animate-spin mr-3"></i> DNA解析中...';

        try {
            this.currentProposals = await API.fetchEvolutionProposals();
            this.selectedProposals = {
                sites: new Set(this.currentProposals.sites.map((_, i) => i)),
                brands: new Set(this.currentProposals.brands.map((_, i) => i)),
                keywords: new Set(this.currentProposals.keywords.map((_, i) => i))
            };
            UI.renderEvolutionProposals(this.currentProposals, this.selectedProposals);
            UI.showEvolutionModal();
        } catch (err) {
            this.log(`Evolution Error: ${err.message}`, true);
            alert(`進化提案の取得に失敗しました: ${err.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    /**
     * AIナレッジ再構築案を取得して表示します。
     */
    async showRestructureProposal() {
        this.currentMode = 'restructure';
        this.log('Fetching knowledge restructure proposals...');
        const btn = document.getElementById('restructure-btn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner animate-spin mr-3"></i> 構造分析中...';

        try {
            this.currentProposals = await API.fetchRestructureProposals();
            UI.renderRestructureProposal(this.currentProposals);
            UI.showEvolutionModal();
        } catch (err) {
            this.log(`Restructure Error: ${err.message}`, true);
            alert(`再構築案の取得に失敗しました: ${err.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    /**
     * 現在の提案（進化または再構築）を適用します。
     */
    async applyCurrentProposal() {
        if (this.currentMode === 'evolution') {
            await this.applyEvolution();
        } else if (this.currentMode === 'restructure') {
            await this.applyRestructure();
        }
    }

    /**
     * 選択されている進化提案のみを適用します。
     */
    async applyEvolution() {
        const btn = document.getElementById('apply-evolution-btn');
        const selectedData = {
            sites: this.currentProposals.sites.filter((_, i) => this.selectedProposals.sites.has(i)),
            brands: this.currentProposals.brands.filter((_, i) => this.selectedProposals.brands.has(i)),
            keywords: this.currentProposals.keywords.filter((_, i) => this.selectedProposals.keywords.has(i))
        };
        // ... (以下既存の applyEvolution ロジック)
        if (selectedData.sites.length === 0 && selectedData.brands.length === 0 && selectedData.keywords.length === 0) {
            alert('項目が選択されていません。');
            return;
        }
        btn.disabled = true;
        btn.textContent = '進化を適用中...';
        try {
            await API.applyEvolution(selectedData);
            this.log('System evolution successful!');
            alert('システムの進化が完了しました！');
            UI.hideEvolutionModal();
            location.reload();
        } catch (err) { alert(`エラー: ${err.message}`); }
        finally { btn.disabled = false; }
    }

    /**
     * 再構築案を適用します（interests.json の全面書き換え）。
     */
    async applyRestructure() {
        if (!confirm('ナレッジ構造を完全に再構築します。現在のカテゴリ設定は上書きされますが、よろしいですか？')) return;

        const btn = document.getElementById('apply-evolution-btn');
        btn.disabled = true;
        btn.textContent = '再構築を実行中...';

        try {
            await API.applyRestructure(this.currentProposals);
            this.log('Knowledge restructure successful!');
            alert('ナレッジ構造の再構築が完了しました！');
            UI.hideEvolutionModal();
            location.reload();
        } catch (err) {
            alert(`再構築の適用に失敗しました: ${err.message}`);
        } finally {
            btn.disabled = false;
        }
    }

    /**
     * 提案項目の選択/解除を切り替えます。
     */
    toggleProposalSelection(type, index) {
        if (!this.selectedProposals) return;
        
        if (this.selectedProposals[type].has(index)) {
            this.selectedProposals[type].delete(index);
        } else {
            this.selectedProposals[type].add(index);
        }
        
        UI.renderEvolutionProposals(this.currentProposals, this.selectedProposals);
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
window.UI = UI;
window.app = new AegisAIHubApp();
window.updateInterest = (t, v, n) => window.app.updateInterest(t, v, n);
window.fetchDashboard = () => window.app.fetchDashboard();
