/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test';
import { MockFactory } from './helpers/mock-factory';

test.describe('Nexus Dashboard E2E Tests', () => {
  test('Japanese priority display and filtering', async ({ page }) => {
    const mockArticles = [
      {
        title: 'English Article (High Score)',
        link: 'http://example.com/1',
        desc: 'This is an english article with a high score',
        brand: 'TestBrand',
        score: 95,
        img: null,
        date: new Date().toISOString(),
        category: 'AI & Robotics',
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
        category: 'AI & Robotics',
        language: 'ja'
      }
    ];

    await MockFactory.setupCommonMocks(page, { articles: mockArticles });
    await page.goto('/');

    const firstArticle = page.getByTestId('article-card').first();
    await expect(firstArticle).toBeVisible({ timeout: 20000 });

    await expect(firstArticle).toContainText('日本語の記事 (優先表示対象)');

    const searchInput = page.getByPlaceholder(/記事を検索|Search articles/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('english');
    
    await expect(page.getByText('English Article (High Score)')).toBeVisible();
    await expect(page.getByText('日本語の記事 (優先表示対象)')).not.toBeVisible();
  });

  test('Sidebar navigation', async ({ page }) => {
    await MockFactory.setupCommonMocks(page);
    await page.goto('/');

    const navSettings = page.getByTestId('nav-settings');
    await navSettings.click();
    
    const loading = page.getByTestId('settings-loading');
    if (await loading.isVisible()) {
      await expect(loading).not.toBeVisible({ timeout: 15000 });
    }

    await expect(page.getByTestId('settings-title').last()).toBeVisible({ timeout: 15000 });

    await page.getByTestId('nav-feed').click();
    await expect(page.getByTestId('nav-feed')).toHaveClass(/bg-primary/);
  });
});
