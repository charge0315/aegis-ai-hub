import { test, expect } from '@playwright/test';

test.describe('API Usage Visualization', () => {
  test.beforeEach(async ({ page }) => {
    // APIをモックして初期化ダイアログを回避し、データを即座に提供する
    await page.route('**/api/v5/interests', async (route) => {
      await route.fulfill({
        json: {
          categories: {
            'Tech': { brands: [], keywords: [], emoji: '💻', score: 10 }
          },
          lastUpdated: Date.now()
        }
      });
    });

    await page.route('**/api/v5/feeds', async (route) => {
      await route.fulfill({
        json: {
          'Tech': { active: ['https://example.com/rss'], pool: [], failures: {} }
        }
      });
    });

    await page.route('**/api/dashboard', async (route) => {
      await route.fulfill({
        json: {
          'Tech': {
            emoji: '💻',
            articles: [
              { title: 'Test Article', link: 'https://example.com/1', category: 'Tech', score: 90, language: 'ja' }
            ]
          }
        }
      });
    });

    await page.route('**/api/v5/usage-stats', async (route) => {
      const today = new Date().toISOString().split('T')[0];
      await route.fulfill({
        json: {
          [today]: {
            'gemini-3.1-flash': {
              promptTokens: 1000,
              candidatesTokens: 500,
              totalTokens: 1500,
              callCount: 10
            }
          }
        }
      });
    });

    await page.route('**/api/v5/ui-settings', async (route) => {
      await route.fulfill({
        json: { jaOnly: false, viewMode: 'grid', hideImages: false, isInitialized: true, theme: 'dark', language: 'ja' }
      });
    });

    // 開発環境のURLにアクセス
    await page.goto('http://localhost:5173');
    // 初期ロード待ち
    await page.waitForSelector('aside');
  });

  test('should navigate to usage tab and display dashboard', async ({ page }) => {
    // 0. フィードが表示されるまで待つ
    await page.waitForSelector('h2:has-text("インテリジェンス・フィード")', { state: 'visible', timeout: 30000 });

    // 1. Settingsタブに移動
    await page.click('[data-testid="nav-settings"]');
    
    // 設定画面のタイトルが表示されるのを待つ
    await page.waitForSelector('[data-testid="settings-title"]', { state: 'visible', timeout: 20000 });

    // 2. Usageタブをクリック
    const usageTab = page.locator('[data-testid="tab-usage"]');
    await expect(usageTab).toBeVisible({ timeout: 10000 });
    await usageTab.click();

    // 3. UsageDashboardが表示されることを確認
    await expect(page.locator('[data-testid="usage-dashboard"]')).toBeVisible({ timeout: 10000 });
    
    // カードの項目ラベルを部分一致で確認
    await expect(page.locator('text=/Total Tokens/i')).toBeVisible();
    await expect(page.locator('text=/Active Days/i')).toBeVisible();
    await expect(page.locator('text=/API Calls/i')).toBeVisible();

    // モックデータの内容が反映されているか確認
    await expect(page.locator('.text-3xl.font-bold:has-text("1,500")')).toBeVisible(); // Overview card
    await expect(page.locator('table >> text=1,500')).toBeVisible(); // Table entry

    await expect(page.locator('text=10').first()).toBeVisible();    // API Calls

    // 4. グラフコンテナの存在確認
    const charts = page.locator('.recharts-responsive-container');
    await expect(charts).toHaveCount(2);

    // 5. 詳細テーブルの存在確認
    await expect(page.locator('text=Detailed Logs')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('td').filter({ hasText: '1,000' })).toBeVisible(); // Input tokens (exact check implicit in small string if table cell)
    await expect(page.getByRole('cell', { name: '500', exact: true })).toBeVisible();   // Output tokens (exact match)
  });
});
