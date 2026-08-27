import { useMemo } from 'react';
import type { Article, NexusSettings } from '../types';

interface UseArticleFilterOptions {
  articles: Article[];
  searchQuery: string;
  isJapaneseOnly: boolean;
  settings: NexusSettings | null;
}

interface UseArticleFilterResult {
  filteredArticles: Article[];
  articlesByCategory: Record<string, Article[]>;
  totalCount: number;
  japaneseRatio: number; // 0-100
  categoryCount: number;
}

/**
 * 記事データのフィルタリング、ソート、グループ化、および統計情報の計算を行うカスタムフック
 */
export const useArticleFilter = (options: UseArticleFilterOptions): UseArticleFilterResult => {
  const { articles, searchQuery, isJapaneseOnly, settings } = options;

  const filteredArticles = useMemo(() => {
    let result = [...articles];
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 90);
    result = result.filter(a => new Date(a.date) > limitDate);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => 
        (a.category && a.category.toLowerCase().includes(q)) || 
        a.title.toLowerCase().includes(q)
      );
    }
    if (isJapaneseOnly) {
      result = result.filter(a => a.language === 'ja');
    }
    
    return result.sort((a, b) => {
      if (a.language === 'ja' && b.language !== 'ja') return -1;
      if (a.language !== 'ja' && b.language === 'ja') return 1;
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (b.score || 0) - (a.score || 0);
    });
  }, [articles, searchQuery, isJapaneseOnly]);

  const articlesByCategory = useMemo(() => {
    const groups: Record<string, Article[]> = {};
    
    if (settings?.interests?.categories) {
      Object.keys(settings.interests.categories).forEach(cat => {
        groups[cat] = [];
      });
    }
    
    filteredArticles.forEach(a => {
      const cat = a.category || 'Uncategorized';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(a);
    });

    return Object.fromEntries(
      Object.entries(groups).filter(([, items]) => items.length > 0)
    );
  }, [filteredArticles, settings]);

  const stats = useMemo(() => {
    const totalCount = filteredArticles.length;
    let jaCount = 0;
    filteredArticles.forEach(a => {
      if (a.language === 'ja') jaCount++;
    });

    const japaneseRatio = totalCount > 0 ? Math.round((jaCount / totalCount) * 100) : 0;
    const categoryCount = Object.keys(articlesByCategory).length;

    return {
      totalCount,
      japaneseRatio,
      categoryCount
    };
  }, [filteredArticles, articlesByCategory]);

  return {
    filteredArticles,
    articlesByCategory,
    ...stats
  };
};
