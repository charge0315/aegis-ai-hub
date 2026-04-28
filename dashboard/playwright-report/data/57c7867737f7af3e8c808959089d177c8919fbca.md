# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: nexus.test.ts >> Aegis Nexus E2E Tests >> should display article cards with reasoning
- Location: tests\e2e\nexus.test.ts:58:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('article-card').first()
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByTestId('article-card').first()

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Aegis Nexus E2E Tests', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // 開発サーバーが起動していることを前提とします
  6  |     await page.goto('http://localhost:5173');
  7  |   });
  8  | 
  9  |   test('should load the dashboard and show the intelligence feed', async ({ page }) => {
  10 |     // ロゴの存在確認（バックエンドのロード待ちを含めてタイムアウトを長めに設定）
  11 |     await expect(page.getByTestId('app-logo')).toBeVisible({ timeout: 20000 });
  12 |     
  13 |     // インテリジェンスフィードの見出しを確認
  14 |     await expect(page.getByRole('heading', { name: 'Intelligence Feed' })).toBeVisible();
  15 |     
  16 |     // エージェントモニターの確認
  17 |     await expect(page.getByTestId('agent-monitor-Architect')).toBeVisible();
  18 |     await expect(page.getByTestId('agent-monitor-Curator')).toBeVisible();
  19 |   });
  20 | 
  21 |   test('should open the unified editor and switch tabs', async ({ page }) => {
  22 |     // アプリがロードされるのを待つ
  23 |     await expect(page.getByTestId('app-logo')).toBeVisible({ timeout: 20000 });
  24 | 
  25 |     // Nexus Command (設定) ボタンをクリック
  26 |     await page.getByTestId('nav-settings').click();
  27 |     
  28 |     // 各タブの存在確認
  29 |     await expect(page.getByTestId('tab-editor')).toBeVisible();
  30 |     await expect(page.getByTestId('tab-graph')).toBeVisible();
  31 |     await expect(page.getByTestId('tab-skills')).toBeVisible();
  32 |     
  33 |     // 知識グラフタブに切り替え
  34 |     await page.getByTestId('tab-graph').click();
  35 |     // D3.jsのSVGが表示されているか
  36 |     await expect(page.locator('svg')).toBeVisible();
  37 |     
  38 |     // スキルレジストリタブに切り替え
  39 |     await page.getByTestId('tab-skills').click();
  40 |     await expect(page.getByTestId('mcp-skills-list')).toBeVisible();
  41 |   });
  42 | 
  43 |   test('should trigger command palette with Ctrl+K', async ({ page }) => {
  44 |     await page.keyboard.press('Control+k');
  45 |     
  46 |     // コマンドパレットが表示されるか
  47 |     const palette = page.getByTestId('command-palette');
  48 |     await expect(palette).toBeVisible();
  49 |     
  50 |     const input = page.getByTestId('command-palette-input');
  51 |     await expect(input).toBeVisible();
  52 |     
  53 |     // エスケープで閉じる
  54 |     await page.keyboard.press('Escape');
  55 |     await expect(palette).not.toBeVisible();
  56 |   });
  57 | 
  58 |   test('should display article cards with reasoning', async ({ page }) => {
  59 |     // 記事カードの読み込みを待機
  60 |     const articleCard = page.getByTestId('article-card').first();
> 61 |     await expect(articleCard).toBeVisible({ timeout: 20000 });
     |                               ^ Error: expect(locator).toBeVisible() failed
  62 |     
  63 |     // スコア表示の確認
  64 |     await expect(articleCard.getByTestId('article-score')).toBeVisible();
  65 |     
  66 |     // Reasoning トグルが存在するか確認
  67 |     const reasoningToggle = articleCard.getByTestId('reasoning-toggle');
  68 |     if (await reasoningToggle.isVisible()) {
  69 |       await reasoningToggle.click();
  70 |       // オーバーレイが表示されるか
  71 |       await expect(articleCard.getByTestId('reasoning-overlay')).toBeVisible();
  72 |     }
  73 |   });
  74 | });
  75 | 
```