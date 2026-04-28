import { test, expect } from '@playwright/test';

test.describe('Aegis Nexus E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 開発サーバーが起動していることを前提とします
    await page.goto('http://localhost:5173');
  });

  test('should load the dashboard and show the intelligence feed', async ({ page }) => {
    // ロゴの存在確認（バックエンドのロード待ちを含めてタイムアウトを長めに設定）
    await expect(page.getByTestId('app-logo')).toBeVisible({ timeout: 20000 });
    
    // インテリジェンスフィードの見出しを確認
    await expect(page.getByRole('heading', { name: 'Intelligence Feed' })).toBeVisible();
    
    // エージェントモニターの確認
    await expect(page.getByTestId('agent-monitor-Architect')).toBeVisible();
    await expect(page.getByTestId('agent-monitor-Curator')).toBeVisible();
  });

  test('should open the unified editor and switch tabs', async ({ page }) => {
    // アプリがロードされるのを待つ
    await expect(page.getByTestId('app-logo')).toBeVisible({ timeout: 20000 });

    // Nexus Command (設定) ボタンをクリック
    await page.getByTestId('nav-settings').click();
    
    // 各タブの存在確認
    await expect(page.getByTestId('tab-editor')).toBeVisible();
    await expect(page.getByTestId('tab-graph')).toBeVisible();
    await expect(page.getByTestId('tab-skills')).toBeVisible();
    
    // 知識グラフタブに切り替え
    await page.getByTestId('tab-graph').click();
    // D3.jsのSVGが表示されているか
    await expect(page.locator('svg')).toBeVisible();
    
    // スキルレジストリタブに切り替え
    await page.getByTestId('tab-skills').click();
    await expect(page.getByTestId('mcp-skills-list')).toBeVisible();
  });

  test('should trigger command palette with Ctrl+K', async ({ page }) => {
    await page.keyboard.press('Control+k');
    
    // コマンドパレットが表示されるか
    const palette = page.getByTestId('command-palette');
    await expect(palette).toBeVisible();
    
    const input = page.getByTestId('command-palette-input');
    await expect(input).toBeVisible();
    
    // エスケープで閉じる
    await page.keyboard.press('Escape');
    await expect(palette).not.toBeVisible();
  });

  test('should display article cards with reasoning', async ({ page }) => {
    // 記事カードの読み込みを待機
    const articleCard = page.getByTestId('article-card').first();
    await expect(articleCard).toBeVisible({ timeout: 20000 });
    
    // スコア表示の確認
    await expect(articleCard.getByTestId('article-score')).toBeVisible();
    
    // Reasoning トグルが存在するか確認
    const reasoningToggle = articleCard.getByTestId('reasoning-toggle');
    if (await reasoningToggle.isVisible()) {
      await reasoningToggle.click();
      // オーバーレイが表示されるか
      await expect(articleCard.getByTestId('reasoning-overlay')).toBeVisible();
    }
  });
});
