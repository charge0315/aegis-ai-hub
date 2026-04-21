/**
 * アプリケーションの状態（データ）を管理するモジュール
 */
export const Store = {
    articles: {}, // カテゴリ別の記事リスト
    readUrls: new Set(JSON.parse(localStorage.getItem('read_urls') || '[]')),
    searchQuery: '',

    setArticles(data) {
        this.articles = data;
    },

    setSearchQuery(query) {
        this.searchQuery = query.toLowerCase();
    },

    markAsRead(url) {
        this.readUrls.add(url);
        localStorage.setItem('read_urls', JSON.stringify([...this.readUrls]));
    },

    isRead(url) {
        return this.readUrls.has(url);
    },

    /**
     * 検索クエリに基づいてフィルタリングされた記事を返します。
     */
    getFilteredArticles() {
        if (!this.searchQuery) return this.articles;

        const filtered = {};
        for (const cat in this.articles) {
            filtered[cat] = this.articles[cat].filter(a => 
                a.title.toLowerCase().includes(this.searchQuery) || 
                a.desc.toLowerCase().includes(this.searchQuery) ||
                a.brand.toLowerCase().includes(this.searchQuery)
            );
        }
        return filtered;
    }
};
