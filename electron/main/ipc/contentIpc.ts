import { ipcMain } from 'electron';
import type { Article } from '../../../src/models/Article';
import type { Interests } from '../../../src/types';
import type { Services } from '../services';

/** 画面に返す記事の上限（RULE-001）。 */
const MAX_ARTICLES = 500;

interface ScoredArticle extends Article {
  score: number;
}

/** ダッシュボードのグループを平坦化し、点数の高い順に上限まで返す（RULE-001）。同点は入力順を保つ。 */
export function flattenAndRank(dashboardData: Record<string, { articles?: ScoredArticle[] } | undefined>): ScoredArticle[] {
  const allArticles: ScoredArticle[] = [];
  Object.values(dashboardData).forEach((group) => {
    if (group?.articles) allArticles.push(...group.articles);
  });
  return allArticles.sort((a, b) => b.score - a.score).slice(0, MAX_ARTICLES);
}

/** 記事・興味の設定・AI 処理の IPC（旧 main.cjs と同じ順で登録する）。 */
export function registerContentIpc(services: Services): void {
  const { settingsManager, scraper, discoveryService, geminiService, orchestrator, rssFetcher, feedManager } = services;

  ipcMain.handle('get-articles', async () => {
    const interests = await settingsManager.getInterests();
    const dashboardData = await scraper.getDashboard(interests);
    return flattenAndRank(dashboardData as unknown as Record<string, { articles?: ScoredArticle[] }>);
  });

  ipcMain.handle('get-settings', async () => {
    const interests = await settingsManager.getInterests();
    const feedConfig = await settingsManager.getFeedConfig();
    return { interests, feedConfig };
  });

  // RULE-068: 検証済みの設定を保存し、稼働中の FeedManager にも反映する
  ipcMain.handle('sync-settings', async (_event, settings: Parameters<Services['settingsManager']['syncSettings']>[0]) => {
    const result = await settingsManager.syncSettings(settings, rssFetcher);
    if (feedManager) feedManager.config = result.validatedFeedConfig;
    return result;
  });

  // RULE-049: 自律ワークフローは待たずに起動し、すぐ応答する
  ipcMain.handle('trigger-orchestration', async (_event, requirements?: string) => {
    try {
      void orchestrator.runAutonomousLoop(requirements || '');
      return { success: true, newFeedsCount: 0 };
    } catch (err) {
      console.error('[Main] Trigger orchestration failed:', err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('suggest-category', async (_event, name: string) => {
    return await geminiService.suggestCategoryDetails(name);
  });

  ipcMain.handle('discover-trends', async () => {
    const interests = await settingsManager.getInterests();
    const suggestions = await scraper.discoverTrends(interests);
    return { suggestions };
  });

  ipcMain.handle('restructure-categories', async (_event, count: number, language?: string) => {
    const interests = await settingsManager.getInterests();
    return await discoveryService.getRestructureProposal(interests, count, language || 'ja');
  });

  ipcMain.handle('translate-interests', async (_event, settings: Interests) => {
    return await discoveryService.translateInterests(settings);
  });

  ipcMain.handle('reacquire-all-feeds', async () => {
    const interests = await settingsManager.getInterests();
    const updatedFeedConfig = await discoveryService.reacquireAllFeeds(interests);
    return { success: true, feedConfig: updatedFeedConfig };
  });
}
