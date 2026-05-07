import { test, expect } from '@playwright/test';

test.describe('New Features E2E Tests', () => {
  test('Japanese priority display and filtering', async ({ page }) => {
    // 模擬設定データを設定
    await page.route('**/api/v5/interests', async (route) => {
      await route.fulfill({
        json: {
          categories: {
            "Test Category": {
              brands: [],
              keywords: [],
              emoji: "🧪"
            }
          }
        }
      });
    });
    await page.route('**/api/v5/feeds', async (route) => {
      await route.fulfill({ json: {} });
    });

    // 模擬記事データを設定
    await page.route('**/api/dashboard', async (route) => {
      const mockArticles = {
        "Test Category": {
          emoji: "🧪",
          articles: [
            {
              id: '1',
              title: 'English Article 1',
              snippet: 'This is an english article',
              url: 'http://example.com/1',
              score: 80,
              language: 'en',
              category: 'Test Category',
              reasoning: 'reason 1',
              timestamp: new Date().toISOString()
            },
            {
              id: '2',
              title: '日本語の記事 1',
              snippet: 'これは日本語の記事です',
              url: 'http://example.com/2',
              score: 70,
              language: 'ja',
              category: 'Test Category',
              reasoning: '理由 1',
              timestamp: new Date().toISOString()
            },
            {
              id: '3',
              title: 'English Article 2',
              snippet: 'This is another english article',
              url: 'http://example.com/3',
              score: 90,
              language: 'en',
              category: 'Test Category',
              reasoning: 'reason 2',
              timestamp: new Date().toISOString()
            }
          ]
        }
      };
      await route.fulfill({ json: mockArticles });
    });

    // 初回起動ダイアログが出ないように localStorage を設定
    await page.addInitScript(() => {
      window.localStorage.setItem('nexus_initialized', 'true');
    });

    await page.goto('/');
    // ローディング待機
    await expect(page.getByText('Intercepting Signals')).not.toBeVisible({ timeout: 30000 });

    // 記事カードが表示されるのを待つ
    const articleCard = page.getByTestId('article-card').first();
    await expect(articleCard).toBeVisible({ timeout: 10000 });

    // 日本語の記事が最初に表示されていることを確認 (App.tsx のソートロジックにより ja が優先される)
    const firstArticleTitle = articleCard.getByRole('heading');
    await expect(firstArticleTitle).toHaveText('日本語の記事 1');

    // 「JA Only」トグルをオンにする
    const jaOnlyToggle = page.getByRole('button', { name: 'JA Only' });
    await expect(jaOnlyToggle).toBeVisible();
    await jaOnlyToggle.click();

    // 日本語以外の記事が非表示になっていることを確認
    await expect(page.getByText('English Article 1')).not.toBeVisible();
    await expect(page.getByText('English Article 2')).not.toBeVisible();
    await expect(page.getByText('日本語の記事 1')).toBeVisible();

    // トグルをオフに戻すと表示されることを確認
    await jaOnlyToggle.click();
    await expect(page.getByText('English Article 1')).toBeVisible();
    await expect(page.getByText('English Article 2')).toBeVisible();
  });

  test('Initial startup setting overwrite confirmation', async ({ page }) => {
    // 既存の設定がある状態を模擬
    await page.route('**/api/v5/interests', async (route) => {
      await route.fulfill({
        json: {
          categories: {
            "Existing": {
              brands: ["TestBrand"],
              keywords: ["TestKeyword"],
              emoji: "🚀"
            }
          }
        }
      });
    });
    
    // 他のAPIもモック
    await page.route('**/api/v5/feeds', async (route) => {
      await route.fulfill({ json: {} });
    });
    await page.route('**/api/dashboard', async (route) => {
      await route.fulfill({ json: {} });
    });
    await page.route('**/api/v5/reset-to-defaults', async (route) => {
      await route.fulfill({ json: { success: true } });
    });

    // localStorage をクリアして初期起動状態にする
    await page.addInitScript(() => {
      window.localStorage.removeItem('nexus_initialized');
    });

    await page.goto('/');
    
    // ダイアログが表示されることを確認
    await expect(page.getByText('既存の設定を検出')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/既にブランドやキーワードの設定が存在します/)).toBeVisible();

    // 「Confirm」をクリック
    await page.getByRole('button', { name: 'Confirm' }).click();

    // ダイアログが閉じることを確認
    await expect(page.getByText('既存の設定を検出')).not.toBeVisible();

    // nexus_initialized が true になっていることを確認
    const isInitialized = await page.evaluate(() => window.localStorage.getItem('nexus_initialized'));
    expect(isInitialized).toBe('true');
  });
});
