import { test, expect } from '@playwright/test';

test.describe('Nexus Dashboard E2E Tests', () => {
  test('Japanese priority display and filtering', async ({ page }) => {
    // 模擬設定データを設定
    await page.route('**/api/v5/interests', async (route) => {
      await route.fulfill({
        json: {
          categories: {
            'Test Category': {
              brands: [],
              keywords: [],
              emoji: '🧪'
            }
          }
        }
      });
    });
    await page.route('**/api/v5/feeds', async (route) => {
      await route.fulfill({ json: {} });
    });

    // 模擬記事データを設定 (Article インターフェースに準拠)
    await page.route('**/api/dashboard', async (route) => {
      const mockArticles = {
        'Test Category': {
          emoji: '🧪',
          articles: [
            {
              title: 'English Article (High Score)',
              link: 'http://example.com/1',
              desc: 'This is an english article with a high score',
              brand: 'TestBrand',
              score: 95,
              img: null,
              date: new Date().toISOString(),
              category: 'Test Category',
              language: 'en'
            },
            {
              title: '日本語の記事 (優先表示対象)',
              link: 'http://example.com/2',
              desc: 'これは日本語の記事です。スコアが低くても優先されるはずです。',
              brand: 'テストブランド',
              score: 70,
              img: null,
              date: new Date().toISOString(),
              category: 'Test Category',
              language: 'ja'
            },
            {
              title: 'Another English Article',
              link: 'http://example.com/3',
              desc: 'Another english article',
              brand: 'TestBrand',
              score: 80,
              img: null,
              date: new Date().toISOString(),
              category: 'Test Category',
              language: 'en'
            }
          ]
        }
      };
      await route.fulfill({ json: mockArticles });
    });

    // 初回起動ダイアログが出ないように UI 設定をモック
    await page.addInitScript(() => {
      (window as any).nexusApi = {
        ...(window as any).nexusApi,
        getUiSettings: () => Promise.resolve({ jaOnly: false, viewMode: 'grid', hideImages: false, isInitialized: true }),
        saveUiSettings: () => Promise.resolve({ success: true })
      };
    });

    await page.goto('/');
    
    // ローディング待機
    await expect(page.getByText('Intercepting Signals')).not.toBeVisible({ timeout: 30000 });

    // 記事カードが表示されるのを待つ
    const articleCard = page.getByTestId('article-card').first();
    await expect(articleCard).toBeVisible({ timeout: 10000 });

    // 日本語の記事が最初に表示されていることを確認 (言語優先ソートの検証)
    const firstArticleTitle = articleCard.getByRole('heading');
    await expect(firstArticleTitle).toHaveText('日本語の記事 (優先表示対象)');

    // 「JA Only」トグルをオンにする
    const jaOnlyToggle = page.getByRole('button', { name: 'JA Only' });
    await expect(jaOnlyToggle).toBeVisible();
    await jaOnlyToggle.click();

    // 日本語以外の記事が非表示になっていることを確認
    await expect(page.getByText('English Article (High Score)')).not.toBeVisible();
    await expect(page.getByText('Another English Article')).not.toBeVisible();
    await expect(page.getByText('日本語の記事 (優先表示対象)')).toBeVisible();

    // トグルをオフに戻すと表示されることを確認
    await jaOnlyToggle.click();
    await expect(page.getByText('English Article (High Score)')).toBeVisible();
  });

  test('Initial startup setup guard dialog', async ({ page }) => {
    // 既存の設定がある状態を模擬
    await page.route('**/api/v5/interests', async (route) => {
      await route.fulfill({
        json: {
          categories: {
            'Existing Category': {
              brands: ['TestBrand'],
              keywords: ['TestKeyword'],
              emoji: '🚀'
            }
          }
        }
      });
    });
    
    await page.route('**/api/v5/feeds', async (route) => {
      await route.fulfill({ json: {} });
    });
    await page.route('**/api/dashboard', async (route) => {
      await route.fulfill({ json: {} });
    });
    await page.route('**/api/v5/reset-to-defaults', async (route) => {
      await route.fulfill({ json: { success: true } });
    });

    // UI 設定を「未初期化」状態でモック
    await page.addInitScript(() => {
      (window as any).nexusApi = {
        ...(window as any).nexusApi,
        getUiSettings: () => Promise.resolve({ jaOnly: false, viewMode: 'grid', hideImages: false, isInitialized: false }),
        saveUiSettings: (settings: any) => {
          (window as any)._savedSettings = settings;
          return Promise.resolve({ success: true });
        }
      };
    });

    await page.goto('/');
    
    // ダイアログが表示されることを確認
    await expect(page.getByText('既存の設定を検出')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/既にブランドやキーワードの設定が存在します/)).toBeVisible();

    // 「Confirm」をクリック
    await page.getByRole('button', { name: 'Confirm' }).click();

    // ダイアログが閉じることを確認
    await expect(page.getByText('既存の設定を検出')).not.toBeVisible();

    // isInitialized が true として保存されたことを確認
    const savedSettings = await page.evaluate(() => (window as any)._savedSettings);
    expect(savedSettings.isInitialized).toBe(true);
  });
});
