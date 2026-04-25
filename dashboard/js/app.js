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

    /**
     * デバッグコンソールにログを出力します。
     * @param {string} msg - メッセージ
     * @param {string} level - info | success | warn | error | ai
     */
    log(msg, level = 'info') {
        const consoleEl = document.getElementById('debug-console');
        if (!consoleEl) return;

        consoleEl.classList.remove('hidden');
        const entry = document.createElement('div');
        
        let color = 'text-slate-300';
        let icon = 'fa-info-circle';

        switch (level) {
            case 'success': color = 'text-emerald-400'; icon = 'fa-check-circle'; break;
            case 'warn': color = 'text-amber-400'; icon = 'fa-exclamation-triangle'; break;
            case 'error': color = 'text-rose-500 font-bold'; icon = 'fa-bug'; break;
            case 'ai': color = 'text-cyan-400 animate-pulse'; icon = 'fa-microchip'; break;
            default: color = 'text-sky-400'; icon = 'fa-terminal'; break;
        }

        entry.className = `flex gap-3 py-1 border-b border-white/5 last:border-0 ${color} transition-all duration-300 transform translate-x-2`;
        entry.innerHTML = `
            <span class="opacity-40 font-mono shrink-0">[${new Date().toLocaleTimeString()}]</span>
            <i class="fas ${icon} mt-1 shrink-0 text-[10px]"></i>
            <span class="break-words">${msg}</span>
        `;
        
        consoleEl.prepend(entry);
        setTimeout(() => entry.classList.remove('translate-x-2'), 10);

        // コンソールログにも出力
        const consoleMap = { info: 'info', success: 'log', warn: 'warn', error: 'error', ai: 'log' };
        console[consoleMap[level] || 'log'](`[${level.toUpperCase()}] ${msg}`);
    }

    /**
     * 長時間のAI処理中に疑似的な進捗ログを出力します。
     * @param {string} taskName - 処理名
     * @returns {number} Timer ID
     */
    startPseudoProgress(taskName) {
        let progress = 0;
        const subTasks = [
            'Initializing semantic analyzer...',
            'Traversing knowledge graph nodes...',
            'Extracting trending entities...',
            'Filtering high-relevancy signals...',
            'Optimizing data structures...',
            'Generating synthesis report...',
            'Validating output consistency...'
        ];

        this.log(`[0%] Starting ${taskName}...`, 'ai');

        return setInterval(() => {
            if (progress < 95) {
                progress += Math.floor(Math.random() * 8) + 2;
                if (progress > 95) progress = 95;
                
                const task = subTasks[Math.floor(Math.random() * subTasks.length)];
                this.log(`[${progress}%] ${task}`, 'ai');
            }
        }, 1500);
    }

    async init() {
        this.log('Aegis AI Hub Engine v5.0 Initializing...', 'ai');
        
        // 検索バーのイベント登録
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value;
                Store.setSearchQuery(query);
                this.refreshUI();
                if (query) this.log(`Filtering articles: "${query}"`, 'info');
            });
        }

        // 初回ロード
        await this.fetchDashboard();
    }

    /**
     * 最新のダッシュボードデータを取得します。
     */
    async fetchDashboard() {
        this.log('Requesting latest feed data from server...', 'info');
        UI.renderSkeletons();
        try {
            const data = await API.fetchDashboard();
            const count = Object.keys(data).length;
            this.log(`Dashboard data synchronized. ${count} categories loaded.`, 'success');
            Store.setArticles(data);
            this.refreshUI();
        } catch (err) {
            this.log(`Synchronization failed: ${err.message}`, 'error');
            document.getElementById('sections-container').innerHTML = 
                `<div class="text-center py-20 text-rose-400 font-bold text-2xl">APIサーバー接続エラー: ${err.message}</div>`;
        }
    }

    /**
     * Gemini APIを使用して特別なおすすめ10選を生成します。
     */
    async fetchRecommendations() {
        this.log('Gemini AI is analyzing your interests and latest news...', 'ai');
        const timer = this.startPseudoProgress('Curation');
        const btn = document.getElementById('gemini-btn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner animate-spin mr-3"></i> AI思考中...';

        try {
            const recommendations = await API.fetchRecommendations();
            clearInterval(timer);
            this.log('[100%] AI Curation complete. 10 articles selected.', 'success');
            UI.renderRecommendations(recommendations, Store);
            document.getElementById('recommendations-container').scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            clearInterval(timer);
            this.log(`AI Curation Error: ${err.message}`, 'error');
            alert(`Gemini APIエラー: ${err.message}`);
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
        this.log('Searching for new trends and RSS feeds...', 'ai');
        const timer = this.startPseudoProgress('DNA Analysis');
        const btn = document.getElementById('evolution-btn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner animate-spin mr-3"></i> DNA解析中...';

        try {
            this.currentProposals = await API.fetchEvolutionProposals();
            clearInterval(timer);
            const total = this.currentProposals.sites.length + this.currentProposals.brands.length + this.currentProposals.keywords.length;
            this.log(`[100%] Evolution data received: ${total} proposals generated.`, 'success');
            
            this.selectedProposals = {
                sites: new Set(this.currentProposals.sites.map((_, i) => i)),
                brands: new Set(this.currentProposals.brands.map((_, i) => i)),
                keywords: new Set(this.currentProposals.keywords.map((_, i) => i))
            };
            UI.renderEvolutionProposals(this.currentProposals, this.selectedProposals);
            UI.showEvolutionModal();
        } catch (err) {
            clearInterval(timer);
            this.log(`Discovery Process Error: ${err.message}`, 'error');
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
        this.log('Deep-analyzing knowledge graph structure...', 'ai');
        const timer = this.startPseudoProgress('Structure Analysis');
        const btn = document.getElementById('restructure-btn');
        const applyBtn = document.getElementById('apply-evolution-btn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner animate-spin mr-3"></i> 構造分析中...';

        if (applyBtn) applyBtn.textContent = '提案を受け入れる';

        try {
            this.currentProposals = await API.fetchRestructureProposals();
            clearInterval(timer);
            this.log(`[100%] Restructure plan ready. Model: ${this.currentProposals.modelName}`, 'success');
            UI.renderRestructureProposal(this.currentProposals);
            UI.showEvolutionModal();
        } catch (err) {
            clearInterval(timer);
            this.log(`Structure Analysis Error: ${err.message}`, 'error');
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
        btn.textContent = '選択した項目で確定する';
        
        const selectedData = {
            sites: this.currentProposals.sites.filter((_, i) => this.selectedProposals.sites.has(i)),
            brands: this.currentProposals.brands.filter((_, i) => this.selectedProposals.brands.has(i)),
            keywords: this.currentProposals.keywords.filter((_, i) => this.selectedProposals.keywords.has(i))
        };

        if (selectedData.sites.length === 0 && selectedData.brands.length === 0 && selectedData.keywords.length === 0) {
            this.log('Application cancelled: No items selected.', 'warn');
            alert('項目が選択されていません。');
            return;
        }

        btn.disabled = true;
        btn.textContent = '進化を適用中...';
        this.log(`Applying ${selectedData.sites.length + selectedData.brands.length + selectedData.keywords.length} items to system core...`, 'ai');

        try {
            await API.applyEvolution(selectedData);
            this.log('System evolved successfully. Reloading...', 'success');
            alert('システムの進化が完了しました！');
            UI.hideEvolutionModal();
            location.reload();
        } catch (err) { 
            this.log(`Evolution application failed: ${err.message}`, 'error');
            alert(`エラー: ${err.message}`); 
        } finally { 
            btn.disabled = false; 
        }
    }

    /**
     * 再構築案を適用します（interests.json の全面書き換え）。
     */
    async applyRestructure() {
        if (!confirm('ナレッジ構造を完全に再構築します。現在のカテゴリ設定は上書きされますが、よろしいですか？')) {
            this.log('Restructure process aborted by user.', 'warn');
            return;
        }

        const btn = document.getElementById('apply-evolution-btn');
        btn.disabled = true;
        btn.textContent = '再構築を実行中...';
        this.log('Rebuilding knowledge database structure...', 'ai');

        try {
            await API.applyRestructure(this.currentProposals);
            this.log('Database restructured. System optimization complete.', 'success');
            alert('ナレッジ構造の再構築が完了しました！');
            UI.hideEvolutionModal();
            location.reload();
        } catch (err) {
            this.log(`Restructure failure: ${err.message}`, 'error');
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
        
        const isSelected = this.selectedProposals[type].has(index);
        if (isSelected) {
            this.selectedProposals[type].delete(index);
        } else {
            this.selectedProposals[type].add(index);
        }
        
        this.log(`${type.slice(0, -1).toUpperCase()} ${isSelected ? 'deselected' : 'selected'}.`, 'info');
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
        this.log(`Article marked as read.`, 'info');
        if (cardElement) {
            cardElement.classList.add('is-read');
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
        this.log(`Submitting new interest: ${value} (${type})...`, 'info');
        try {
            await API.updateInterest(type, value, name);
            this.log(`Core learning success: ${value} added.`, 'success');
            if (status) {
                status.textContent = '興味を学習しました！リロード中...';
                status.classList.remove('hidden');
            }
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            this.log(`Learning error: ${err.message}`, 'error');
            alert('APIエラーが発生しました。');
        }
    }
}

// グローバルからアクセス可能にする（onclickイベント用）
window.UI = UI;
window.app = new AegisAIHubApp();
window.updateInterest = (t, v, n) => window.app.updateInterest(t, v, n);
window.fetchDashboard = () => window.app.fetchDashboard();
