/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';
import { MockFactory } from './helpers/mock-factory';

test.describe('Multi-Theme Support (Aegis Chroma)', () => {
  test.beforeEach(async ({ page }) => {
    // 基本的な設定データをモック
    await MockFactory.setupCommonMocks(page);
  });

  test('should switch between light and dark themes', async ({ page }) => {
    await page.goto('/');
    
    // HTML属性の初期化を待つ
    const root = page.locator('html');
    await expect(root).toHaveAttribute('data-theme', /light|dark|system/);

    // 設定画面へ移動
    await page.getByTestId('nav-settings').click();
    await page.getByTestId('tab-system').click();

    // ボタンをクリックしてテーマを変更
    const lightBtn = page.getByRole('button', { name: 'Light', exact: true });
    await expect(lightBtn).toBeVisible();
    await lightBtn.click();
    await expect(root).toHaveAttribute('data-theme', 'light');

    const darkBtn = page.getByRole('button', { name: 'Dark', exact: true });
    await darkBtn.click();
    await expect(root).toHaveAttribute('data-theme', 'dark');
  });

  test('should synchronize with system theme', async ({ page }) => {
    // システムテーマ設定で初期化
    await MockFactory.setupCommonMocks(page, {
      uiSettings: { isInitialized: true, jaOnly: false, viewMode: 'grid', theme: 'system', language: 'ja' }
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
