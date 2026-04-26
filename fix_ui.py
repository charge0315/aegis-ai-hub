import sys, re

# Fix ui.js
path = 'dashboard/js/ui.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """renderTag(val, type, category) {
        const tagClass = type === 'brand' ? 'tag-brand' : 'tag-keyword';
        return `
            <div class="px-3 py-1.5 bg-white/5 rounded-xl text-[11px] font-bold text-slate-300 border border-white/5 flex items-center gap-2 group/tag hover:border-slate-500 transition-all cursor-pointer ${tagClass}" 
                 onclick="app.draftDeleteInterest('${type}', '${this.escapeHTML(val)}', '${this.escapeHTML(category)}')">
                ${this.escapeHTML(val)}
                <div class="opacity-0 group-hover/tag:opacity-100 transition-all ml-1">
                    <i class="fas fa-times text-[9px] text-rose-500"></i>
                </div>
            </div>
        `;
    },"""

content = re.sub(r'renderTag\(val, type, category\) \{.*?\n\s+\},', replacement, content, flags=re.DOTALL)
content = content.replace('<div class="glass p-8 rounded-[2.5rem] border border-white/5 space-y-6 group">', '<div class="section-card space-y-6 group">')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# Fix index.html
path_html = 'dashboard/index.html'
with open(path_html, 'r', encoding='utf-8') as f:
    html = f.read()

new_header = """            <!-- 統合設定画面 -->
            <div id="settings-container" class="hidden settings-container space-y-12 mb-24">
                <div class="settings-header-grid">
                    <div class="settings-title-area">
                        <h2 class="section-title flex items-center gap-4">
                            <i class="fas fa-sliders-h text-sky-400"></i>
                            System <span class="text-sky-400">Settings</span>
                        </h2>
                        <p class="section-subtitle">システムの興味関心と情報源を詳細にチューニングします</p>
                    </div>
                    
                    <div class="settings-actions-area">
                        <!-- AI アクション -->
                        <div class="action-group">
                            <button onclick="app.showEvolutionProposal()" class="btn-fluent btn-fluent-secondary !text-cyan-400">
                                <i class="fas fa-dna"></i> <span>システムを進化</span>
                            </button>
                            <button onclick="app.showRestructureProposal()" class="btn-fluent btn-fluent-secondary !text-indigo-400">
                                <i class="fas fa-project-diagram"></i> <span>ナレッジ再構築</span>
                            </button>
                        </div>

                        <!-- 戻る・保存 -->
                        <div class="flex items-center gap-3">
                            <button onclick="app.fetchDashboard()" class="btn-fluent btn-fluent-danger">
                                <i class="fas fa-undo"></i> <span>戻る</span>
                            </button>
                            <button onclick="app.saveAllSettings()" class="btn-fluent btn-fluent-primary">
                                <i class="fas fa-save text-lg"></i> <span>保存して再構築</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- タブ切り替え -->
                <nav class="tabs-nav">
                    <button onclick="app.switchSettingsTab('feeds')" id="tab-btn-feeds" class="tab-trigger active text-sky-400 bg-white/10"><i class="fas fa-rss"></i> フィード管理</button>
                    <button onclick="app.switchSettingsTab('categories')" id="tab-btn-categories" class="tab-trigger text-slate-400"><i class="fas fa-tags"></i> カテゴリ管理</button>
                    <button onclick="app.switchSettingsTab('keywords')" id="tab-btn-keywords" class="tab-trigger text-slate-400"><i class="fas fa-search"></i> ブランド・キーワード</button>
                </nav>"""

pattern_html = r'<!-- 統合設定画面 -->.*?<!-- タブ切り替え.*?</div>'
html = re.sub(pattern_html, new_header, html, flags=re.DOTALL)

with open(path_html, 'w', encoding='utf-8') as f:
    f.write(html)
