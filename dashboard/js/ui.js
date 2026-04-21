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
     * スケルトンスクリーンを表示します。
     */
    renderSkeletons() {
        const container = document.getElementById('sections-container');
        const categories = Object.keys(this.catIcons);
        container.innerHTML = categories.map(cat => `
            <section class="space-y-10">
                <div class="h-12 w-64 skeleton rounded-xl"></div>
                <div class="masonry-grid">
                    ${Array(3).fill(0).map(() => `
                        <div class="card glass rounded-2xl h-80 skeleton opacity-20"></div>
                    `).join('')}
                </div>
            </section>
        `).join('');
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

            // ナビゲーション追加
            nav.innerHTML += `
                <a href="#${id}" class="flex items-center gap-4 p-4 rounded-2xl hover:bg-sky-500/10 text-sky-400 transition-all">
                    <span class="text-2xl">${icon}</span> <span class="font-bold text-xl">${catName}</span>
                </a>
            `;
            select.innerHTML += `<option value="${catName}" class="bg-slate-900 text-white">${catName}</option>`;

            // セクション描画
            const section = document.createElement('section');
            section.id = id;
            section.className = 'scroll-mt-24';
            
            const hasArticles = articles && articles.length > 0;
            section.innerHTML = `
                <h2 class="text-4xl font-bold mb-10 flex items-center gap-4 ${hasArticles ? 'text-sky-400' : 'text-slate-600 opacity-50'} uppercase tracking-tight">
                    <span class="text-5xl ${!hasArticles && 'grayscale'}">${icon}</span> ${catName} 
                    <span class="text-sm font-normal">(${hasArticles ? articles.length + ' articles' : 'No updates today'})</span>
                </h2>
                <div class="masonry-grid">
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
        return `
            <div class="card glass rounded-2xl overflow-hidden flex flex-col group border border-white/5 ${isRead ? 'is-read' : ''}" 
                 onclick="window.open('${item.link}', '_blank'); app.markAsRead('${item.link}', this)">
                <div class="relative h-48 overflow-hidden bg-slate-800">
                    <img src="${item.img}" class="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500" 
                         onerror="this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600'">
                    <div class="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10 text-white">${item.brand}</div>
                    <div class="absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-sky-500/30 text-sky-400 text-xs font-black border border-sky-500/40 backdrop-blur-sm">${item.score}</div>
                </div>
                <div class="p-6 flex flex-col">
                    <h3 class="font-bold text-xl mb-3 leading-tight group-hover:text-sky-400 transition-colors text-white">${item.title}</h3>
                    <p class="text-base text-slate-400 mb-4 line-clamp-3 leading-relaxed">${item.desc}</p>
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
