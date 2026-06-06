import { test, expect } from '@playwright/test';
import { MockFactory } from './helpers/mock-factory';

test.describe('UI UX Improvements E2E Tests', () => {
  const mockArticles = [
    {
      title: 'AI Signal 1',
      link: 'http://example.com/1',
      desc: 'First AI article description',
      brand: 'AIBook',
      score: 90,
      img: null,
      date: new Date().toISOString(),
      category: 'AI & Robotics',
      language: 'ja'
    },
    {
      title: 'Gadget Signal 2',
      link: 'http://example.com/2',
      desc: 'Second Gadget article description',
      brand: 'GadgetDaily',
      score: 80,
      img: null,
      date: new Date().toISOString(),
      category: 'AI & Robotics',
      language: 'en'
    }
  ];

  test.beforeEach(async ({ page }) => {
    // 共通のモックを設定してページを開く
    await MockFactory.setupCommonMocks(page, { articles: mockArticles });
    await page.goto('/');
  });

  test('StatusBar matches specifications', async ({ page }) => {
    // ステータスバーが存在すること
    const statusBar = page.locator('footer[role="contentinfo"]');
    await expect(statusBar).toBeVisible();

    // バージョン情報 v5.4.0 が表示されていること
    await expect(statusBar).toContainText('v5.4.0');

    // 接続状態 (Connected/Syncing 等) が表示されていること
    await expect(statusBar).toContainText(/Connected|Syncing/i);
  });

  test('FeedStatsHeader correctly counts and handles updates', async ({ page }) => {
    // 統計ヘッダーが表示されていること
    const statsHeader = page.locator('div.glass').filter({ hasText: 'Total Articles' });
    await expect(statsHeader).toBeVisible();

    // 記事総数（2件）が表示されていること
    await expect(statsHeader).toContainText('2');
    // カテゴリ数（1件）が表示されていること
    await expect(statsHeader).toContainText('1');
    // 日本語率（50%）が表示されていること
    await expect(statsHeader).toContainText('50%');

    // 更新ボタンが存在すること
    const refreshBtn = page.getByRole('button', { name: /Refresh/i });
    await expect(refreshBtn).toBeVisible();
  });

  test('Sidebar category filtering works', async ({ page }) => {
    const sidebarNav = page.locator('nav[role="navigation"]');
    await expect(sidebarNav).toBeVisible();

    // 「Categories」ラベルが存在すること
    await expect(sidebarNav).toContainText('Categories');

    // 特定のカテゴリフィルターボタン (AI & Robotics) が表示されていること
    const gadgetBtn = sidebarNav.getByRole('button', { name: /AI & Robotics/i });
    await expect(gadgetBtn).toBeVisible();

    // カテゴリフィルターをクリックすると、そのカテゴリの記事のみが表示されること
    await gadgetBtn.click();

    await expect(page.getByText('AI Signal 1')).toBeVisible();

    // 「All Signals」をクリックすると、すべての記事が再表示されること
    const allSignalsBtn = sidebarNav.getByRole('button', { name: /All Signals/i });
    await allSignalsBtn.click();

    await expect(page.getByText('Gadget Signal 2')).toBeVisible();
    await expect(page.getByText('AI Signal 1')).toBeVisible();
  });

  test('EmptyFeedState shows when no signals found', async ({ page }) => {
    // 検索入力欄に該当しない文字を入力 (日本語設定のプレースホルダー「記事を検索」または英語「Search...」にマッチさせる)
    const searchInput = page.getByPlaceholder(/記事を検索|Search/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('NonexistentQueryXYZ');

    // 空状態 UI が表示されること
    const emptyState = page.locator('text=No Signals Detected');
    await expect(emptyState).toBeVisible();

    // 検索語句に合わせたサブタイトルが表示されていること
    await expect(page.locator('text=No matching signals found')).toBeVisible();
  });

  test('Accessibility labels are present', async ({ page }) => {
    // サイドバー開閉ボタン
    const toggleSidebarBtn = page.getByRole('button', { name: /Toggle sidebar/i });
    await expect(toggleSidebarBtn).toBeVisible();

    // コマンドパレットボタン
    const openCmdBtn = page.getByRole('button', { name: /Open command palette/i });
    await expect(openCmdBtn).toBeVisible();

    // 各記事カード
    const firstCard = page.locator('div[role="article"]').first();
    await expect(firstCard).toBeVisible();

    // 記事カード内の外部リンクボタン
    const extLink = firstCard.locator('a[aria-label="Open article in browser"]');
    await expect(extLink).toBeVisible();
  });
});
