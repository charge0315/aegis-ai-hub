/**
 * DOM操作とレンダリングを担当するモジュール
 */
export const UI = {
    catIcons: {
        'AI・ソフトウェア': '🤖',
        'ゲーム': '🎮',
        'PC・ハードウェア': '💻',
        'ガジェット': '⚡',
        '音楽・ギター・DTM': '🎸',
        'ロードバイク': '🚴'
    },

    /**
     * XSS対策用のHTMLエスケープ
     */
    escapeHTML(str) {
        if (!str) return "";
        return str.replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;',
            '"': '&quot;', "'": '&#39;'
        })[m]);
    },

    /**
     * スケルトンスクリーンを表示します。
     */
    renderSkeletons() {
        const container = document.getElementById('sections-container');
        const categories = Object.keys(this.catIcons);
        container.innerHTML = categories.map(cat => `
            <section class="space-y-10">
                <div class="h-12 w-64 skeleton rounded-xl"></div>
                <div class="panel-grid">
                    ${Array(3).fill(0).map(() => `
                        <div class="card glass rounded-2xl h-80 skeleton opacity-20"></div>
                    `).join('')}
                </div>
            </section>
        `).join('');
    },

    /**
     * Geminiによるおすすめセクションを描画します。
     */
    renderRecommendations(articles, store) {
        const container = document.getElementById('recommendations-container');
        if (!articles || articles.length === 0) {
            container.classList.add('hidden');
            return;
        }
        
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="mb-16">
                <h2 class="text-5xl font-black mb-10 flex items-center gap-6 text-white uppercase tracking-tighter">
                    <span class="w-16 h-16 bg-gradient-to-br from-fuchsia-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
                        <i class="fas fa-magic text-3xl"></i>
                    </span> 
                    Gemini's <span class="text-fuchsia-400">Picks</span>
                    <span class="text-sm text-slate-500 font-mono lowercase">Curated for User</span>
                </h2>
                <div class="panel-grid">
                    ${articles.map(item => this.renderGeminiCard(item, store)).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Gemini推薦理由付きの特別カードを生成します。
     */
    renderGeminiCard(item, store) {
        const isRead = store.isRead(item.link);
        const title = this.escapeHTML(item.title);
        const brand = this.escapeHTML(item.brand);
        const reason = this.escapeHTML(item.geminiReason);
        
        return `
            <div class="card glass rounded-3xl overflow-hidden flex flex-col group border-2 border-fuchsia-500/20 hover:border-fuchsia-500/50 bg-gradient-to-b from-fuchsia-500/5 to-transparent ${isRead ? 'is-read' : ''}" 
                 onclick="window.open('${item.link}', '_blank'); app.markAsRead('${item.link}', this)">
                <div class="relative h-40 overflow-hidden">
                    <img src="${item.img}" class="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" 
                         onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600'">
                    <div class="absolute top-4 left-4 px-3 py-1 bg-fuchsia-600 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-fuchsia-600/40">${brand}</div>
                    <div class="absolute bottom-4 right-4 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md text-fuchsia-400 text-xs font-black border border-fuchsia-500/30">AI RANK: ${item.score}</div>
                </div>
                <div class="p-6 flex flex-col gap-3">
                    <h3 class="font-bold text-xl leading-tight text-white group-hover:text-fuchsia-400 transition-colors">${title}</h3>
                    
                    <!-- Geminiの推薦理由エリア -->
                    <div class="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-2xl p-4 flex gap-3 items-start italic text-fuchsia-200 text-xs leading-relaxed">
                        <i class="fas fa-comment-dots mt-1 text-fuchsia-400 text-[10px]"></i>
                        <p>"${reason}"</p>
                    </div>

                    <div class="mt-2 pt-3 border-t border-white/5 flex justify-between items-center">
                        <span class="text-[10px] font-black uppercase tracking-widest text-fuchsia-400 flex items-center gap-2">
                            ${isRead ? '<i class="fas fa-check-circle"></i> READ' : 'CHECK THIS OUT <i class="fas fa-chevron-right text-[8px]"></i>'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * サイドバーの表示・非表示を切り替えます。
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar-container');
        if (!sidebar) return;
        
        const isHidden = sidebar.classList.contains('-translate-x-full');
        if (isHidden) {
            sidebar.classList.remove('-translate-x-full');
            sidebar.classList.add('translate-x-0');
            // 背景クリックで閉じられるようにする
            const overlay = document.createElement('div');
            overlay.id = 'sidebar-overlay';
            overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-md z-[102] transition-opacity duration-300';
            overlay.onclick = () => this.toggleSidebar();
            document.body.appendChild(overlay);
        } else {
            sidebar.classList.add('-translate-x-full');
            sidebar.classList.remove('translate-x-0');
            const overlay = document.getElementById('sidebar-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            }
        }
    },

    /**
     * 進化提案モーダルを表示します。
     */
    showEvolutionModal() {
        document.getElementById('evolution-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    /**
     * 進化提案モーダルを非表示にします。
     */
    hideEvolutionModal() {
        document.getElementById('evolution-modal').classList.add('hidden');
        document.body.style.overflow = 'auto';
    },

    /**
     * モーダルのヘッダー（タイトルとサブタイトル）を動的に更新します。
     */
    updateModalHeader(title, subtitle, iconClass = 'fa-dna') {
        const titleEl = document.getElementById('modal-title');
        const subtitleEl = document.getElementById('modal-subtitle');
        if (titleEl) titleEl.innerHTML = `
            <span class="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <i class="fas ${iconClass} text-xl text-white"></i>
            </span>
            ${title}
        `;
        if (subtitleEl) subtitleEl.textContent = subtitle;
    },

    /**
     * ナレッジ再構築案を描画します。
     */
    renderRestructureProposal(data) {
        const content = document.getElementById('evolution-content');
        this.updateModalHeader('Knowledge <span class="text-indigo-400">Restructure</span>', `AI Model: ${data.modelName} による構造の最適化案`, 'fa-project-diagram');

        content.innerHTML = `
            <div class="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-8 mb-10">
                <p class="text-indigo-200 text-sm leading-relaxed">
                    <i class="fas fa-info-circle mr-3"></i>
                    現在の interests.json を解析し、より整理された構造を提案しています。
                    確定すると、現在のカテゴリ構成はこの内容に【完全に置き換え】られます。
                </p>
            </div>
            <div class="grid grid-cols-1 gap-8">
                ${Object.entries(data.categories).map(([catName, info]) => `
                    <div class="p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all group">
                        <div class="flex justify-between items-start mb-6">
                            <div>
                                <h3 class="text-2xl font-black text-white uppercase tracking-tighter">${this.escapeHTML(catName)}</h3>
                                <p class="text-indigo-400 text-xs font-bold mt-1 uppercase tracking-widest">Reason: ${this.escapeHTML(info.reason || "最適化")}</p>
                            </div>
                            <div class="px-4 py-2 bg-indigo-500/20 rounded-xl text-indigo-300 font-bold text-xs">Score: ${info.score}</div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Brands</h4>
                                <div class="flex flex-wrap gap-2">
                                    ${info.brands.map(b => `<span class="px-3 py-1 bg-slate-800 rounded-lg text-xs text-slate-300 border border-white/5">${this.escapeHTML(b)}</span>`).join('')}
                                </div>
                            </div>
                            <div>
                                <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Keywords</h4>
                                <div class="flex flex-wrap gap-2">
                                    ${info.keywords.map(k => `<span class="px-3 py-1 bg-indigo-500/10 rounded-lg text-xs text-indigo-300 border border-indigo-500/10">#${this.escapeHTML(k)}</span>`).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * AIの進化提案を描画します。
     */
    renderEvolutionProposals(data, selectedIndices) {
        const content = document.getElementById('evolution-content');
        this.updateModalHeader('AI Evolution <span class="text-cyan-400">Proposal</span>', `AI Model: ${data.modelName} が提案する次世代の情報収集網`, 'fa-dna');

        content.innerHTML = '';

        // 1. 正常なサイト
        this.renderProposalSection(content, '🆕 新しい情報源 (RSS Feeds)', data.sites, (item, idx) => `
            <div class="flex flex-col gap-2">
                <h4 class="font-bold text-white">${this.escapeHTML(item.name)}</h4>
                <p class="text-[10px] text-cyan-400 font-mono break-all">${this.escapeHTML(item.url)}</p>
                <p class="text-xs text-slate-400 mt-2 italic leading-relaxed">"${this.escapeHTML(item.reason)}"</p>
                <div class="mt-auto pt-3 flex justify-between items-center">
                    <span class="px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-500 uppercase font-bold">${this.escapeHTML(item.category)}</span>
                    <span class="selection-status text-[10px] font-bold"></span>
                </div>
            </div>
        `, 'sites', selectedIndices.sites);

        // 2. 健康診断失敗サイト（特別表示）
        if (data.failedSites && data.failedSites.length > 0) {
            const failedSection = document.createElement('div');
            failedSection.className = 'space-y-4 opacity-60';
            failedSection.innerHTML = `
                <h3 class="text-sm font-bold text-rose-400/70 border-l-4 border-rose-500/50 pl-4 uppercase tracking-widest">⚠️ 健康診断未通過 (自動除外済み)</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${data.failedSites.map(site => `
                        <div class="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-xs">
                            <div class="font-bold text-slate-300">${this.escapeHTML(site.name)}</div>
                            <div class="text-[10px] text-slate-500 font-mono mt-1">${this.escapeHTML(site.url)}</div>
                            <div class="text-rose-400/60 mt-2"><i class="fas fa-exclamation-triangle mr-2"></i>${this.escapeHTML(site.error)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            content.appendChild(failedSection);
        }

        // 3. ブランド
        this.renderProposalSection(content, '🏷️ 注目ブランド (各カテゴリ5選)', data.brands, (item, idx) => `
            <div class="flex flex-col">
                <div class="flex justify-between items-center">
                    <span class="text-lg font-bold text-white">${this.escapeHTML(item.value)}</span>
                    <span class="selection-status text-[10px] font-bold"></span>
                </div>
                <span class="text-[10px] text-slate-500 uppercase font-black tracking-tighter mt-1">${this.escapeHTML(item.category)}</span>
                <p class="text-xs text-slate-400 mt-2 italic">"${this.escapeHTML(item.reason)}"</p>
            </div>
        `, 'brands', selectedIndices.brands);

        // 4. キーワード
        this.renderProposalSection(content, '🔍 新規キーワード', data.keywords, (item, idx) => `
            <div class="flex flex-col">
                <div class="flex justify-between items-center">
                    <span class="text-lg font-bold text-white">#${this.escapeHTML(item.value)}</span>
                    <span class="selection-status text-[10px] font-bold"></span>
                </div>
                <span class="text-[10px] text-slate-500 uppercase font-black tracking-tighter mt-1">${this.escapeHTML(item.category)}</span>
                <p class="text-xs text-slate-400 mt-2 italic">"${this.escapeHTML(item.reason)}"</p>
            </div>
        `, 'keywords', selectedIndices.keywords);
    },

    renderProposalSection(container, title, items, itemRenderer, type, selectedSet) {
        if (!items || items.length === 0) return;

        const section = document.createElement('div');
        section.className = 'space-y-6';
        section.innerHTML = `
            <h3 class="text-xl font-bold text-slate-300 border-l-4 border-cyan-500 pl-4 uppercase tracking-widest text-sm">${title}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${items.map((item, idx) => {
                    const isSelected = selectedSet.has(idx);
                    return `
                        <div onclick="app.toggleProposalSelection('${type}', ${idx})" 
                             class="proposal-card p-6 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${isSelected ? 'selected' : 'bg-white/5 border-white/5 hover:border-white/10'}">
                            ${itemRenderer(item, idx)}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        container.appendChild(section);
    },

    /**
     * ダッシュボード全体を描画します。
     */
    renderDashboard(data, store) {
        const container = document.getElementById('sections-container');
        const nav = document.getElementById('dynamic-nav');
        const select = document.getElementById('cat-select');
        
        container.innerHTML = '';
        nav.innerHTML = '<p class="text-xs text-slate-500 uppercase font-bold tracking-widest mb-4 px-3 text-white">Sections</p>';
        select.innerHTML = '';

        let index = 0;
        for (const catName in data) {
            const articles = data[catName];
            const icon = this.catIcons[catName] || '🌟';
            const id = `cat-${index++}`;
            const escapedCatName = this.escapeHTML(catName);

            // ナビゲーション追加
            nav.innerHTML += `
                <a href="#${id}" class="flex items-center gap-4 p-4 rounded-2xl hover:bg-sky-500/10 text-sky-400 transition-all">
                    <span class="text-2xl">${icon}</span> <span class="font-bold text-xl">${escapedCatName}</span>
                </a>
            `;
            select.innerHTML += `<option value="${escapedCatName}" class="bg-slate-900 text-white">${escapedCatName}</option>`;

            // セクション描画
            const section = document.createElement('section');
            section.id = id;
            section.className = 'scroll-mt-24';
            
            const hasArticles = articles && articles.length > 0;
            section.innerHTML = `
                <h2 class="text-4xl font-bold mb-10 flex items-center gap-4 ${hasArticles ? 'text-sky-400' : 'text-slate-600 opacity-50'} uppercase tracking-tight">
                    <span class="text-5xl ${!hasArticles && 'grayscale'}">${icon}</span> ${escapedCatName} 
                    <span class="text-sm font-normal">(${hasArticles ? articles.length + ' articles' : 'No updates today'})</span>
                </h2>
                <div class="panel-grid">
                    ${articles.map(item => this.renderCard(item, store)).join('')}
                </div>
            `;
            container.appendChild(section);
        }
    },

    /**
     * 1記事分のカードHTMLを生成します。
     */
    renderCard(item, store) {
        const isRead = store.isRead(item.link);
        const title = this.escapeHTML(item.title);
        const brand = this.escapeHTML(item.brand);
        const desc = this.escapeHTML(item.desc);

        return `
            <div class="card glass rounded-2xl overflow-hidden flex flex-col group border border-white/5 ${isRead ? 'is-read' : ''}" 
                 role="article" aria-label="${title}" tabindex="0"
                 onmousemove="this.style.setProperty('--x', event.offsetX + 'px'); this.style.setProperty('--y', event.offsetY + 'px')"
                 onclick="window.open('${item.link}', '_blank'); app.markAsRead('${item.link}', this)"
                 onkeydown="if(event.key === 'Enter') { window.open('${item.link}', '_blank'); app.markAsRead('${item.link}', this) }">
                <div class="relative h-32 overflow-hidden bg-slate-800">
                    <img src="${item.img}" class="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500" 
                         onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600'">
                    <div class="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10 text-white">${brand}</div>
                    <div class="absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-sky-500/30 text-sky-400 text-xs font-black border border-sky-500/40 backdrop-blur-sm">${item.score}</div>
                </div>
                <div class="p-6 flex flex-col">
                    <h3 class="font-bold text-xl mb-3 leading-tight group-hover:text-sky-400 transition-colors text-white">${title}</h3>
                    <p class="text-base text-slate-400 mb-4 line-clamp-3 leading-relaxed">${desc}</p>
                    <div class="mt-auto pt-4 flex justify-between items-center border-t border-white/5">
                        <span class="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">
                            ${isRead ? '<i class="fas fa-check-circle"></i> READ' : 'VIEW ARTICLE <i class="fas fa-external-link-alt text-[10px]"></i>'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }
};
