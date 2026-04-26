import re, io

def fix_file(path, replacements):
    content = None
    for enc in ['utf-8', 'utf-8-sig', 'cp932']:
        try:
            with io.open(path, 'r', encoding=enc) as f:
                content = f.read()
            break
        except UnicodeDecodeError:
            continue
    
    if content is None:
        print(f"Failed to read {path}")
        return

    for pattern, repl in replacements:
        if isinstance(pattern, re.Pattern):
            content = pattern.sub(repl, content)
        else:
            content = content.replace(pattern, repl)
    
    with io.open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# CSS additions
css_add = """
/* --- 堅牢な設定画面レイアウト --- */
.settings-container { max-width: 1400px; margin-left: auto; margin-right: auto; padding-bottom: 5rem; }
.settings-header-grid { display: grid; grid-template-columns: 1fr; gap: 2rem; padding-bottom: 3rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); align-items: center; }
@media (min-width: 1280px) { .settings-header-grid { grid-template-columns: auto 1fr; } }
.settings-title-area { display: flex; flex-direction: column; gap: 0.5rem; }
.settings-actions-area { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: flex-start; }
@media (min-width: 1280px) { .settings-actions-area { justify-content: flex-end; } }
.action-group { display: flex; align-items: center; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 1.25rem; padding: 0.375rem; backdrop-filter: blur(10px); }
.btn-fluent { padding: 0.75rem 1.25rem; border-radius: 0.875rem; font-weight: 700; font-size: 0.875rem; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; gap: 0.5rem; white-space: nowrap; }
.btn-fluent-primary { background: linear-gradient(135deg, #0078d4, #005a9e); color: white; box-shadow: 0 4px 15px rgba(0, 120, 212, 0.3); }
.btn-fluent-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0, 120, 212, 0.4); filter: brightness(1.1); }
.btn-fluent-secondary { background: rgba(255, 255, 255, 0.05); color: #e2e8f0; border: 1px solid rgba(255, 255, 255, 0.1); }
.btn-fluent-secondary:hover { background: rgba(255, 255, 255, 0.1); color: white; }
.btn-fluent-danger { background: rgba(244, 63, 94, 0.1); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.2); }
.btn-fluent-danger:hover { background: rgba(244, 63, 94, 0.2); color: #f43f5e; }
.tabs-nav { display: flex; gap: 0.5rem; padding: 0.5rem; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 1.5rem; width: fit-content; overflow-x: auto; scrollbar-width: none; }
.tab-trigger { padding: 0.75rem 1.5rem; border-radius: 1rem; font-weight: 700; font-size: 1rem; color: #94a3b8; transition: all 0.3s ease; display: flex; align-items: center; gap: 0.5rem; }
.tab-trigger.active { background: rgba(255, 255, 255, 0.1); color: #60cdff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
.tag-brand { border-left: 3px solid #60cdff !important; background: rgba(96, 205, 255, 0.1) !important; }
.tag-keyword { border-left: 3px solid #94a3b8 !important; }
.section-card { background: rgba(45, 45, 45, 0.3); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 1.5rem; padding: 2.5rem; backdrop-filter: blur(20px); }
.section-title { font-size: 2rem; font-weight: 900; letter-spacing: -0.025em; text-transform: uppercase; color: white; }
.section-subtitle { font-size: 0.875rem; color: #94a3b8; margin-top: 0.25rem; }
"""

with open('dashboard/css/style.css', 'a', encoding='utf-8') as f:
    f.write(css_add)

# JS Changes
js_replacements = [
    (re.compile(r'renderTag\(val, type, category\) \{.*?\},', re.DOTALL), 
     """renderTag(val, type, category) {
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
    },"""),
    ('<div class="glass p-8 rounded-[2.5rem] border border-white/5 space-y-6 group">', '<div class="section-card space-y-6 group">'),
    ('<div class="overflow-x-auto">\n                <table class="w-full text-left border-separate border-spacing-y-2">', 
     '<div class="overflow-x-auto rounded-2xl border border-white/5 bg-black/20">\n                <table class="w-full text-left border-collapse">'),
    ('<thead><tr class="text-[10px] font-black text-slate-500 uppercase tracking-widest"><th class="px-6 py-2">Category</th><th class="px-6 py-2">Title</th><th class="px-6 py-2">URL</th><th class="px-6 py-2 text-right">Actions</th></tr></thead>',
     '<thead class="bg-white/5"><tr class="text-[10px] font-black text-slate-500 uppercase tracking-widest"><th class="px-6 py-4">Category</th><th class="px-6 py-4">Title</th><th class="px-6 py-4">URL</th><th class="px-6 py-4 text-right">Actions</th></tr></thead>'),
    ('<tbody>${rows', '<tbody class="divide-y divide-white/5">${rows')
]
fix_file('dashboard/js/ui.js', js_replacements)

# HTML Changes
html_new_header = """            <!-- 統合設定画面 -->
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
                        <div class="action-group">
                            <button onclick="app.showEvolutionProposal()" class="btn-fluent btn-fluent-secondary !text-cyan-400">
                                <i class="fas fa-dna"></i> <span>システムを進化</span>
                            </button>
                            <button onclick="app.showRestructureProposal()" class="btn-fluent btn-fluent-secondary !text-indigo-400">
                                <i class="fas fa-project-diagram"></i> <span>ナレッジ再構築</span>
                            </button>
                        </div>
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
                <nav class="tabs-nav">
                    <button onclick="app.switchSettingsTab('feeds')" id="tab-btn-feeds" class="tab-trigger active text-sky-400 bg-white/10"><i class="fas fa-rss"></i> フィード管理</button>
                    <button onclick="app.switchSettingsTab('categories')" id="tab-btn-categories" class="tab-trigger text-slate-400"><i class="fas fa-tags"></i> カテゴリ管理</button>
                    <button onclick="app.switchSettingsTab('keywords')" id="tab-btn-keywords" class="tab-trigger text-slate-400"><i class="fas fa-search"></i> ブランド・キーワード</button>
                </nav>"""

html_replacements = [
    (re.compile(r'<!-- 統合設定画面 -->.*?<!-- タブ切り替え.*?</div>', re.DOTALL), html_new_header)
]
fix_file('dashboard/index.html', html_replacements)
