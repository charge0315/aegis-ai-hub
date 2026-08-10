import { test, expect } from '@playwright/test';
import { MockFactory, DEFAULT_MOCK_SETTINGS } from './helpers/mock-factory';

test.describe('AI Insights & Trend Discovery', () => {
  test.beforeEach(async ({ page }) => {
    await MockFactory.setupCommonMocks(page);
  });

  test('Should discover, promote, and persist a trend', async ({ page }) => {
    const trendValue = 'GPT-5';
    const categoryName = 'AI & Robotics';

    await page.goto('/');
    await page.getByTestId('nav-settings').click();
    await page.getByTestId('tab-insights').click();

    await MockFactory.mockDiscoverTrends(page, [
      {
        value: trendValue,
        category: categoryName,
        reason: 'Significant buzz detected.',
        type: 'emerging',
        confidence: 85,
        context: 'Next-gen LLM'
      }
    ]);

    const discoverBtn = page.getByTestId('discover-trends-button');
    await expect(discoverBtn).toBeVisible();
    await discoverBtn.click();

    const promoteBtn = page.getByTestId('promote-trend-button').last();
    await expect(promoteBtn).toBeVisible({ timeout: 15000 });
    await promoteBtn.click();

    await page.getByTestId('save-settings-button').click();

    await expect(page.getByTestId('dialog-title').last()).toHaveText(/成功|Success/i);
    await page.getByTestId('dialog-confirm-button').last().click();

    // モックデータを更新
    const updatedSettings = JSON.parse(JSON.stringify(DEFAULT_MOCK_SETTINGS));
    updatedSettings.interests.categories[categoryName].keywords.push(trendValue);
    MockFactory.updateCurrentSettings(updatedSettings);

    await page.reload();
    // ライセンス状態の非同期ロードによる再レンダリング後でもクリックできるようforce指定
    await page.getByTestId('nav-settings').click({ force: true });

    // ロード待機
    const container = page.getByTestId('unified-editor-container');
    await expect(container).toBeVisible({ timeout: 15000 });

    await page.getByTestId('tab-editor').click({ force: true });
    
    // カテゴリが選択されていることを確認
    await expect(page.getByText(categoryName).last()).toBeVisible();
    
    // キーワードが表示されていることを確認 (span 内のテキストとして検索)
    const kwElement = page.getByText(trendValue).last();
    await expect(kwElement).toBeVisible({ timeout: 10000 });
  });

  test('Should allow dismissing a trend and persist the dismissal', async ({ page }) => {
    const trendValue = 'Old Trend';
    const categoryName = 'AI & Robotics';

    const initialSettingsWithTrend = JSON.parse(JSON.stringify(DEFAULT_MOCK_SETTINGS));
    initialSettingsWithTrend.interests.learned_keywords = {
      [trendValue]: {
        category: categoryName,
        reason: 'Irrelevant.',
        type: 'niche',
        confidence: 40,
        context: 'Old news',
        detectedAt: new Date().toISOString()
      }
    };

    MockFactory.updateCurrentSettings(initialSettingsWithTrend);

    await page.goto('/');
    await page.getByTestId('nav-settings').click();
    await page.getByTestId('tab-insights').click();

    const dismissBtn = page.getByTestId('dismiss-trend-button').last();
    await expect(dismissBtn).toBeVisible();
    await dismissBtn.click();

    await page.getByTestId('save-settings-button').click();

    await expect(page.getByTestId('dialog-title').last()).toHaveText(/成功|Success/i);
    await page.getByTestId('dialog-confirm-button').last().click();

    MockFactory.updateCurrentSettings(DEFAULT_MOCK_SETTINGS);

    await page.reload();
    // ライセンス状態の非同期ロードによる再レンダリング後でもクリックできるようforce指定
    await page.getByTestId('nav-settings').click({ force: true });

    const container = page.getByTestId('unified-editor-container');
    await expect(container).toBeVisible({ timeout: 15000 });

    await page.getByTestId('tab-insights').click({ force: true });
    await expect(page.getByText(trendValue)).not.toBeVisible();
    await expect(page.getByText(/No active trends detected/i)).toBeVisible();
  });
});
