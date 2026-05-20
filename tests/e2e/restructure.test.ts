import { test, expect } from '@playwright/test';
import { MockFactory } from './helpers/mock-factory';

test.describe('Deep AI Restructure E2E Journey', () => {
  test.beforeEach(async ({ page }) => {
    await MockFactory.setupCommonMocks(page);
  });

  test('Should complete the full restructure journey successfully', async ({ page }) => {
    await page.goto('/');
    
    // Sidebar navigation
    const navSettings = page.getByTestId('nav-settings');
    await expect(navSettings).toBeVisible();
    await navSettings.click();
    
    // settings-loading が出ている場合は消えるのを待つ
    const loading = page.getByTestId('settings-loading');
    if (await loading.isVisible()) {
      await expect(loading).not.toBeVisible({ timeout: 15000 });
    }

    const restructureBtn = page.getByTestId('ai-restructure-button').last();
    await expect(restructureBtn).toBeVisible({ timeout: 15000 });
    await restructureBtn.click();

    // 1. Enter count
    const confirm1 = page.getByTestId('dialog-confirm-button').last();
    await expect(confirm1).toBeVisible();
    await confirm1.click();

    // 2. Confirm restructure
    await MockFactory.mockRestructureProposal(page, {
      categories: {
        "AI & Future Tech": { emoji: "🚀", brands: ["OpenAI"], keywords: ["LLM"], score: 10, reason: "Unified AI" },
        "Gaming Central": { emoji: "🎮", brands: ["Nintendo"], keywords: ["Switch"], score: 8, reason: "Entertainment" }
      },
      feedConfig: {
        "AI & Future Tech": { active: ["https://tc.com/feed"], pool: [], failures: {} },
        "Gaming Central": { active: ["https://ign.com/rss"], pool: [], failures: {} }
      }
    });
    const confirm2 = page.getByTestId('dialog-confirm-button').last();
    await expect(confirm2).toBeVisible();
    await confirm2.click();

    // 3. Wait for success
    const successTitle = page.getByTestId('dialog-title').last();
    await expect(successTitle).toHaveText(/再構築完了|Restructure Complete/i, { timeout: 35000 });
    
    const finalOk = page.getByTestId('dialog-confirm-button').last();
    await expect(finalOk).toBeVisible();
    await finalOk.click();

    // 4. Verify results
    await expect(page.getByText('AI & Future Tech').last()).toBeVisible();
    await expect(page.getByText('Gaming Central').last()).toBeVisible();
  });
});
