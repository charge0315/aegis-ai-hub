/**
 * DOM操作とレンダリングを担当するモジュール
 */
export const UI = {
    catIcons: {
        'AI・ソフトウェア・開発': '🤖',
        'モバイル・スマートデバイス': '📱',
        'PC・周辺機器': '💻',
        '半導体・PCパーツ': '🔌',
        'ゲーム・eスポーツ': '🎮',
        'オーディオ・楽器・DTM': '🎸',
        'スマートアクセサリ・IoT': '🏠',
        'ロードバイク・スポーツテック': '🚴'
    },

    escapeHTML(str) {
        if (!str) return "";
        return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
    },

    renderSkeletons() {
        const container = document.getElementById('sections-container');
        container.innerHTML = Object.keys(this.catIcons).map(cat => `
            <section class="space-y-10">
                <div class="h-12 w-64 skeleton rounded-xl"></div>
                <div class="panel-grid">${Array(3).fill(0).map(() => `<div class="card glass rounded-2xl h-80 skeleton opacity-20"></div>`).join('')}</div>
            </section>
        `).join('');
    },

    /**
     * フィード一覧（表形式）の描画
     */
    renderFeedList(feeds) {
        const container = document.getElementById('feed-list');
        if (!container) return;

        let rows = '';
        for (const [cat, data] of Object.entries(feeds)) {
            const allUrls = [...new Set([...data.active, ...data.pool])];
            allUrls.forEach(url => {
                rows += `
                    <tr class="glass group hover:bg-white/5 transition-all">
                        <td class="px-6 py-4"><span class="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black text-sky-400 border border-sky-500/20">${this.escapeHTML(cat)}</span></td>
                        <td class="px-6 py-4 font-bold text-white text-sm">RSS Source</td>
                        <td class="px-6 py-4 text-slate-400 text-xs font-mono truncate max-w-xs">${this.escapeHTML(url)}</td>
                        <td class="px-6 py-4 text-right">
                            <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button onclick="app.draftEditFeed('${this.escapeHTML(cat)}', '${this.escapeHTML(url)}')" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-sky-400 hover:bg-sky-500/10"><i class="fas fa-pencil-alt text-xs"></i></button>
                                <button onclick="app.draftDeleteFeed('${this.escapeHTML(cat)}', '${this.escapeHTML(url)}')" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-rose-500/10"><i class="fas fa-trash-alt text-xs"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="w-full text-left border-separate border-spacing-y-2">
                    <thead><tr class="text-[10px] font-black text-slate-500 uppercase tracking-widest"><th class="px-6 py-2">Category</th><th class="px-6 py-2">Title</th><th class="px-6 py-2">URL</th><th class="px-6 py-2 text-right">Actions</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="4" class="text-center p-10 text-slate-600">No feeds configured.</td></tr>'}</tbody>
                </table>
            </div>
        `;
    },

    /**
     * カテゴリ管理（カテゴリのみ）
     */
    renderCategoryManager(interests) {
        const container = document.getElementById('category-list');
        if (!container) return;

        container.innerHTML = Object.entries(interests.categories).map(([catName, info]) => `
            <div class="glass p-8 rounded-[2rem] border border-white/5 flex items-center justify-between group">
                <div class="flex items-center gap-5">
                    <span class="text-5xl">${info.emoji || '📂'}</span>
                    <div>
                        <h3 class="text-2xl font-black text-white uppercase tracking-tighter">${this.escapeHTML(catName)}</h3>
                        <div class="flex gap-4 mt-1">
                            <span class="text-[10px] text-sky-400 font-bold uppercase tracking-widest">${info.brands.length} Brands</span>
                            <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">${info.keywords.length} Keywords</span>
                        </div>
                    </div>
                </div>
                <div class="flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                    <button onclick="app.draftEditInterest('category', '${this.escapeHTML(catName)}')" class="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 text-slate-400 hover:text-sky-400"><i class="fas fa-pencil-alt"></i></button>
                    <button onclick="app.draftDeleteInterest('category', '${this.escapeHTML(catName)}')" class="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 text-slate-400 hover:text-rose-500"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        `).join('');
    },

    /**
     * ブランド・キーワード管理
     */
    renderInterestGroups(interests) {
        const container = document.getElementById('keyword-list-grouped');
        if (!container) return;

        container.innerHTML = Object.entries(interests.categories).map(([catName, info]) => `
            <div class="glass p-10 rounded-[2.5rem] border border-white/5 space-y-8">
                <div class="flex items-center gap-5">
                    <span class="text-5xl">${info.emoji || '📂'}</span>
                    <h3 class="text-3xl font-black text-white uppercase tracking-tighter">${this.escapeHTML(catName)}</h3>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6 border-t border-white/5">
                    <div>
                        <h4 class="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-4 px-1">Brands</h4>
                        <div class="flex flex-wrap gap-2.5">
                            ${info.brands.map(b => this.renderTag(b, 'brand', catName)).join('')}
                            <button onclick="app.draftAddInterest('brand', '${this.escapeHTML(catName)}')" class="px-4 py-2 border border-dashed border-sky-500/30 rounded-xl text-xs font-bold text-sky-400 hover:bg-sky-500/5 transition-all"><i class="fas fa-plus mr-2"></i>追加</button>
                        </div>
                    </div>
                    <div>
                        <h4 class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1">Keywords</h4>
                        <div class="flex flex-wrap gap-2.5">
                            ${info.keywords.map(k => this.renderTag(k, 'keyword', catName)).join('')}
                            <button onclick="app.draftAddInterest('keyword', '${this.escapeHTML(catName)}')" class="px-4 py-2 border border-dashed border-slate-500/30 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/5 transition-all"><i class="fas fa-plus mr-2"></i>追加</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    renderTag(val, type, category) {
        const isBrand = type === 'brand';
        return `
            <div class="px-4 py-2 ${isBrand ? 'tag-brand' : 'tag-keyword'} rounded-xl text-[12px] font-bold border flex items-center gap-2 group/tag transition-all cursor-pointer hover:border-rose-500/50" 
                 onclick="app.draftDeleteInterest('${type}', '${this.escapeHTML(val)}', '${this.escapeHTML(category)}')">
                ${this.escapeHTML(val)}
                <i class="fas fa-times text-[10px] text-rose-500 opacity-0 group-hover/tag:opacity-100 transition-all"></i>
            </div>
        `;
    },

    renderProposalPreview(data) {
        const container = document.getElementById('evolution-content');
        if (!container) return;
        container.innerHTML = `
            <div class="bg-sky-500/10 border border-sky-500/20 rounded-3xl p-8 mb-8">
                <p class="text-sky-200 text-sm leading-relaxed"><i class="fas fa-magic mr-3"></i>AIが提案する新しい構成案です。取り込むと、現在のエディタにマージされます。</p>
            </div>
            <div id="proposal-items" class="space-y-10">
                ${data.sites ? `
                    <div class="space-y-4">
                        <h4 class="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Proposed RSS Feeds</h4>
                        <div class="grid grid-cols-1 gap-3">
                            ${data.sites.map(s => `<div class="glass p-5 rounded-2xl flex justify-between items-center"><div class="min-w-0"><p class="text-white font-bold truncate">${this.escapeHTML(s.name)}</p><p class="text-[10px] text-sky-400 font-mono truncate">${this.escapeHTML(s.url)}</p></div><span class="px-3 py-1 bg-slate-800 rounded-lg text-[10px] text-slate-400 border border-white/5">${this.escapeHTML(s.category)}</span></div>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${data.categories ? `
                    <div class="space-y-4">
                        <h4 class="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Proposed Structure</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${Object.keys(data.categories).map(c => `<div class="glass p-6 rounded-2xl border border-sky-500/20 font-bold text-white text-lg">${this.escapeHTML(c)}</div>`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    alert(m, t) { return this.showDialog({ title: t, message: m, showCancel: false }); },
    confirm(m, t) { return this.showDialog({ title: t, message: m, showCancel: true }); },

    showDialog({ title, message, showCancel = false }) {
        return new Promise((resolve) => {
            const container = document.getElementById('custom-dialog-container');
            const box = document.getElementById('custom-dialog-box');
            document.getElementById('dialog-title').textContent = title;
            document.getElementById('dialog-message').innerHTML = message;
            const actionsEl = document.getElementById('dialog-actions');
            actionsEl.innerHTML = '';
            if (showCancel) {
                const c = document.createElement('button'); c.className = 'px-6 py-3 rounded-xl text-slate-400 font-bold hover:text-white transition-all'; c.textContent = 'キャンセル'; c.onclick = () => { this.hideDialog(); resolve(false); };
                actionsEl.appendChild(c);
            }
            const o = document.createElement('button'); o.className = `px-8 py-3 rounded-xl text-white font-black shadow-lg transition-all active:scale-95 ${showCancel ? 'bg-sky-600' : 'bg-emerald-600'}`; o.textContent = showCancel ? '実行する' : '了解'; o.onclick = () => { this.hideDialog(); resolve(true); };
            actionsEl.appendChild(o);
            container.classList.remove('hidden');
            setTimeout(() => { box.classList.add('scale-100', 'opacity-100'); box.classList.remove('scale-95', 'opacity-0'); }, 10);
        });
    },

    hideDialog() {
        const container = document.getElementById('custom-dialog-container');
        const box = document.getElementById('custom-dialog-box');
        box.classList.add('scale-95', 'opacity-0'); box.classList.remove('scale-100', 'opacity-100');
        setTimeout(() => container.classList.add('hidden'), 300);
    },

    showEditPrompt(title, label, val) {
        return new Promise((resolve) => {
            const container = document.getElementById('custom-dialog-container');
            const box = document.getElementById('custom-dialog-box');
            document.getElementById('dialog-title').textContent = title;
            document.getElementById('dialog-message').innerHTML = `<div class="mt-4 text-left"><label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">${label}</label><input id="dialog-prompt-input" type="text" class="input-glass w-full" value="${this.escapeHTML(val)}"></div>`;
            const actionsEl = document.getElementById('dialog-actions');
            actionsEl.innerHTML = '';
            const c = document.createElement('button'); c.className = 'px-6 py-3 rounded-xl text-slate-400 font-bold hover:text-white'; c.textContent = 'キャンセル'; c.onclick = () => { this.hideDialog(); resolve(null); };
            const o = document.createElement('button'); o.className = 'px-8 py-3 rounded-xl bg-sky-600 text-white font-black shadow-lg'; o.textContent = '更新する'; o.onclick = () => { resolve(document.getElementById('dialog-prompt-input').value); this.hideDialog(); };
            actionsEl.appendChild(c); actionsEl.appendChild(o);
            container.classList.remove('hidden');
            setTimeout(() => { box.classList.add('scale-100', 'opacity-100'); box.classList.remove('scale-95', 'opacity-0'); }, 10);
        });
    },

    showAddFeedDialog(cats) {
        return new Promise((resolve) => {
            const container = document.getElementById('custom-dialog-container');
            const box = document.getElementById('custom-dialog-box');
            document.getElementById('dialog-title').textContent = 'Add Feed Source';
            document.getElementById('dialog-message').innerHTML = `<div class="space-y-4 mt-4 text-left"><div><label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Category</label><select id="dialog-feed-cat" class="input-glass w-full bg-slate-800">${cats.map(c => `<option value="${this.escapeHTML(c)}">${this.escapeHTML(c)}</option>`).join('')}</select></div><div><label class="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">URL</label><input id="dialog-feed-url" type="url" class="input-glass w-full"></div></div>`;
            const actionsEl = document.getElementById('dialog-actions');
            actionsEl.innerHTML = '';
            const c = document.createElement('button'); c.className = 'px-6 py-3 rounded-xl text-slate-400 font-bold hover:text-white'; c.textContent = 'キャンセル'; c.onclick = () => { this.hideDialog(); resolve(null); };
            const o = document.createElement('button'); o.className = 'px-8 py-3 rounded-xl bg-sky-600 text-white font-black shadow-lg'; o.textContent = '追加'; o.onclick = () => { resolve({ category: document.getElementById('dialog-feed-cat').value, url: document.getElementById('dialog-feed-url').value }); this.hideDialog(); };
            actionsEl.appendChild(c); actionsEl.appendChild(o);
            container.classList.remove('hidden');
            setTimeout(() => { box.classList.add('scale-100', 'opacity-100'); box.classList.remove('scale-95', 'opacity-0'); }, 10);
        });
    },

    toggleSidebar() {
        const s = document.getElementById('sidebar-container'); if (!s) return;
        if (s.classList.contains('-translate-x-full')) {
            s.classList.replace('-translate-x-full', 'translate-x-0');
            const o = document.createElement('div'); o.id = 'sidebar-overlay'; o.className = 'fixed inset-0 bg-black/60 backdrop-blur-md z-[102]'; o.onclick = () => this.toggleSidebar(); document.body.appendChild(o);
        } else {
            s.classList.replace('translate-x-0', '-translate-x-full');
            const o = document.getElementById('sidebar-overlay'); if (o) setTimeout(() => o.remove(), 300);
        }
    },

    showEvolutionModal() { document.getElementById('evolution-modal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; },
    hideEvolutionModal() { document.getElementById('evolution-modal').classList.add('hidden'); document.body.style.overflow = 'auto'; },

    renderDashboard(data, store) {
        const container = document.getElementById('sections-container');
        const nav = document.getElementById('dynamic-nav');
        container.innerHTML = '';
        nav.innerHTML = '<p class="text-xs text-slate-500 uppercase font-bold tracking-widest mb-4 px-3 text-white">Sections</p>';
        const viewMode = store.viewMode || 'grid';
        let index = 0;
        for (const catName in data) {
            const categoryData = data[catName];
            const articles = categoryData.articles || [];
            const icon = categoryData.emoji || this.catIcons[catName] || '🌟';
            const id = `cat-${index++}`;
            const escapedCatName = this.escapeHTML(catName);
            nav.innerHTML += `<a href="#${id}" class="flex items-center gap-4 p-4 rounded-2xl hover:bg-sky-500/10 text-sky-400 transition-all whitespace-nowrap overflow-hidden text-ellipsis"><span class="text-2xl shrink-0">${icon}</span> <span class="font-bold text-xl truncate">${escapedCatName}</span></a>`;
            const section = document.createElement('section');
            section.id = id;
            section.className = 'scroll-mt-24';
            const hasArticles = articles && articles.length > 0;
            section.innerHTML = `<h2 class="text-3xl md:text-4xl font-bold mb-10 flex items-center gap-4 ${hasArticles ? 'text-sky-400' : 'text-slate-600 opacity-50'} uppercase tracking-tight"><span class="text-4xl md:text-5xl ${!hasArticles && 'grayscale'}">${icon}</span> ${escapedCatName} <span class="text-sm font-normal">(${hasArticles ? articles.length + ' articles' : 'No updates today'})</span></h2><div class="${viewMode === 'grid' ? 'panel-grid' : 'list-grid'}">${articles.map(item => viewMode === 'grid' ? this.renderCard(item, store) : this.renderListItem(item, store)).join('')}</div>`;
            container.appendChild(section);
        }
        this.updateViewButtons(viewMode);
    },

    renderCard(item, store) {
        const isRead = store.isRead(item.link);
        return `<div class="card glass rounded-2xl overflow-hidden flex flex-col group border border-white/5 ${isRead ? 'is-read' : ''}" onclick="window.open('${item.link}', '_blank'); app.markAsRead('${item.link}', this)"><div class="card-image-container"><img src="${item.img}" class="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500" onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600'"><div class="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10 text-white">${this.escapeHTML(item.brand)}</div><div class="absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-sky-500/30 text-sky-400 text-xs font-black border border-sky-500/40 backdrop-blur-sm">${item.score}</div></div><div class="p-6 flex flex-col flex-grow overflow-hidden"><h3 class="font-bold text-lg mb-3 leading-tight group-hover:text-sky-400 transition-colors text-white line-clamp-2 shrink-0">${this.escapeHTML(item.title)}</h3><p class="text-sm text-slate-400 line-clamp-3 leading-relaxed">${this.escapeHTML(item.desc)}</p><div class="mt-auto pt-4 flex justify-between items-center border-t border-white/5 shrink-0"><span class="text-[10px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">${isRead ? '<i class="fas fa-check-circle"></i> READ' : 'VIEW ARTICLE <i class="fas fa-external-link-alt text-[8px]"></i>'}</span></div></div></div>`;
    },

    renderListItem(item, store, isGemini = false) {
        const isRead = store.isRead(item.link);
        const accentClass = isGemini ? 'text-fuchsia-400' : 'text-sky-400';
        return `<div class="list-item glass border-white/5 hover:border-sky-500/30 ${isRead ? 'is-read' : ''}" onclick="window.open('${item.link}', '_blank'); app.markAsRead('${item.link}', this)"><img src="${item.img}" class="list-item-image" onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100'"><div class="flex-grow min-w-0"><div class="flex items-center gap-3 mb-1"><span class="px-2 py-0.5 bg-black/40 rounded text-[9px] font-bold uppercase tracking-widest text-slate-400 border border-white/5">${this.escapeHTML(item.brand)}</span></div><h3 class="font-bold text-base text-white truncate group-hover:${accentClass} transition-colors">${this.escapeHTML(item.title)}</h3></div><div class="flex items-center gap-6 shrink-0 text-right"><div><div class="text-[9px] text-slate-500 font-bold uppercase mb-1">Score</div><div class="text-lg font-black ${accentClass}">${item.score}</div></div><div class="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-slate-500 hover:text-white transition-all"><i class="fas fa-chevron-right text-sm"></i></div></div></div>`;
    },

    renderRecommendations(articles, store) {
        const container = document.getElementById('recommendations-container');
        if (!articles || articles.length === 0) { container.classList.add('hidden'); return; }
        container.classList.remove('hidden');
        const viewMode = store.viewMode || 'grid';
        container.innerHTML = `<div class="mb-16"><div class="flex items-center gap-6 mb-10"><span class="w-16 h-16 bg-gradient-to-br from-fuchsia-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-fuchsia-500/20"><i class="fas fa-magic text-3xl text-white"></i></span><div><h2 class="text-5xl font-black text-white uppercase tracking-tighter">AI's <span class="text-fuchsia-400">Picks</span></h2><p class="text-sm text-slate-500 font-mono lowercase">Curated based on your interests</p></div></div><div class="${viewMode === 'grid' ? 'panel-grid' : 'list-grid'}">${articles.map(item => viewMode === 'grid' ? this.renderGeminiCard(item, store) : this.renderListItem(item, store, true)).join('')}</div></div>`;
    },

    renderGeminiCard(item, store) {
        const isRead = store.isRead(item.link);
        return `<div class="card glass rounded-3xl overflow-hidden flex flex-col group border-2 border-fuchsia-500/20 hover:border-fuchsia-500/50 bg-gradient-to-b from-fuchsia-500/5 to-transparent ${isRead ? 'is-read' : ''}" onclick="window.open('${item.link}', '_blank'); app.markAsRead('${item.link}', this)"><div class="card-image-container rounded-t-3xl"><img src="${item.img}" class="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600'"><div class="absolute top-4 left-4 px-3 py-1 bg-fuchsia-600 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-fuchsia-600/40">${this.escapeHTML(item.brand)}</div><div class="absolute bottom-4 right-4 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md text-fuchsia-400 text-xs font-black border border-fuchsia-500/30">AI RANK: ${item.score}</div></div><div class="p-6 flex flex-col flex-grow overflow-hidden"><h3 class="font-bold text-lg leading-tight text-white group-hover:text-fuchsia-400 transition-colors line-clamp-2 shrink-0">${this.escapeHTML(item.title)}</h3><div class="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-2xl p-4 mt-3 flex gap-3 items-start italic text-fuchsia-200 text-xs leading-relaxed overflow-hidden"><i class="fas fa-comment-dots mt-1 text-fuchsia-400 text-[10px] shrink-0"></i><p class="line-clamp-3">"${this.escapeHTML(item.geminiReason)}"</p></div><div class="mt-auto pt-3 border-t border-white/5 flex justify-between items-center shrink-0"><span class="text-[10px] font-black uppercase tracking-widest text-fuchsia-400 flex items-center gap-2">${isRead ? '<i class="fas fa-check-circle"></i> READ' : 'CHECK THIS OUT <i class="fas fa-chevron-right text-[8px]"></i>'}</span></div></div></div>`;
    },

    updateViewButtons(viewMode) {
        const g = document.getElementById('view-grid-btn'); const l = document.getElementById('view-list-btn');
        if (!g || !l) return;
        if (viewMode === 'grid') { g.classList.add('bg-white/10'); g.querySelector('i').classList.replace('text-slate-400', 'text-sky-400'); l.classList.remove('bg-white/10'); l.querySelector('i').classList.replace('text-sky-400', 'text-slate-400'); }
        else { l.classList.add('bg-white/10'); l.querySelector('i').classList.replace('text-slate-400', 'text-sky-400'); g.classList.remove('bg-white/10'); g.querySelector('i').classList.replace('text-sky-400', 'text-slate-400'); }
    }
};
