import { test, expect } from '@playwright/test';

test.describe('Multi-Theme Support (Aegis Chroma)', () => {
  test.beforeEach(async ({ page }) => {
    // 1. 基本的な設定データをモック
    await page.route('**/api/v5/interests', async (route) => {
      await route.fulfill({
        json: { categories: { "Tech": { emoji: "💻", brands: [], keywords: [], score: 5 } } }
      });
    });
    await page.route('**/api/v5/feeds', async (route) => {
      await route.fulfill({ json: {} });
    });
    await page.route('**/api/dashboard', async (route) => {
      await route.fulfill({ json: {} });
    });
  });

  test('should switch between light and dark themes', async ({ page }) => {
    // UI 設定をモック
    await page.addInitScript(() => {
      const win = window as unknown as { nexusApi: Record<string, unknown>, _savedSettings: unknown };
      win.nexusApi = {
        ...win.nexusApi,
        getUiSettings: () => Promise.resolve({ jaOnly: false, viewMode: 'grid', hideImages: false, isInitialized: true, theme: 'dark' }),
        saveUiSettings: (settings: unknown) => {
          win._savedSettings = settings;
          return Promise.resolve({ success: true });
        },
        onAgentEvent: () => {},
        removeAgentEventListener: () => {},
        getSettings: () => Promise.resolve({ interests: { categories: {} }, feedConfig: {} }),
        getArticles: () => Promise.resolve([]),
        getApiKey: () => Promise.resolve('mock-key'),
        resetToDefaults: () => Promise.resolve({ success: true })
      };
    });

    await page.goto('/');
    
    // 初期状態がダークテーマであることを確認 (data-theme="dark")
    const root = page.locator('html');
    await expect(root).toHaveAttribute('data-theme', 'dark');

    // 設定画面へ移動
    await page.getByTestId('nav-settings').click();
    await page.getByTestId('tab-system').click();

    // ライトテーマに切り替え
    await page.getByRole('button', { name: /Light|ライト/ }).click();

    // 属性が更新されたか確認
    await expect(root).toHaveAttribute('data-theme', 'light');

    // デバウンスによる保存を待つ
    await page.waitForTimeout(500);

    // 保存された設定を確認
    const saved = await page.evaluate(() => (window as unknown as { _savedSettings: Record<string, unknown> })._savedSettings);
    expect(saved.theme).toBe('light');

    // ダークテーマに戻す
    await page.getByRole('button', { name: /Dark|ダーク/ }).click();
    await expect(root).toHaveAttribute('data-theme', 'dark');
  });

  test('should synchronize with system theme', async ({ page }) => {
    // システムテーマ設定で初期化
    await page.addInitScript(() => {
      const win = window as unknown as { nexusApi: Record<string, unknown> };
      win.nexusApi = {
        ...win.nexusApi,
        getUiSettings: () => Promise.resolve({ jaOnly: false, viewMode: 'grid', hideImages: false, isInitialized: true, theme: 'system' }),
        saveUiSettings: () => Promise.resolve({ success: true }),
        onAgentEvent: () => {},
        removeAgentEventListener: () => {},
        getSettings: () => Promise.resolve({ interests: { categories: {} }, feedConfig: {} }),
        getArticles: () => Promise.resolve([]),
        getApiKey: () => Promise.resolve('mock-key'),
        resetToDefaults: () => Promise.resolve({ success: true })
      };
    });

    // Playwright でシステムのカラースキーマをエミュレート
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    
    const root = page.locator('html');
    await expect(root).toHaveAttribute('data-theme', 'light');

    // システムをダークに変更
    await page.emulateMedia({ colorScheme: 'dark' });
    // リアルタイム反映を確認
    await expect(root).toHaveAttribute('data-theme', 'dark');
  });
});
