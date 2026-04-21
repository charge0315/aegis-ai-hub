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
                    <span class="text-sm text-slate-500 font-mono lowercase">Curated for Mitsuhide</span>
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
