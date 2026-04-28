# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: nexus.test.ts >> Aegis Nexus E2E Tests >> should open the unified editor and switch tabs
- Location: tests\e2e\nexus.test.ts:21:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('tab-editor')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('tab-editor')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e7]
      - generic [ref=e9]: Aegis Nexus
    - navigation [ref=e10]:
      - button "Intelligence Feed" [ref=e11]:
        - img [ref=e13]
        - generic [ref=e18]: Intelligence Feed
      - button "Nexus Command" [active] [ref=e19]:
        - img [ref=e21]
        - generic [ref=e24]: Nexus Command
    - generic [ref=e27]:
      - heading "Agent Swarm" [level=2] [ref=e29]:
        - img [ref=e30]
        - text: Agent Swarm
      - generic [ref=e37]:
        - generic [ref=e38]:
          - generic [ref=e40]: Architect
          - paragraph [ref=e43]: Waiting for instructions...
        - generic [ref=e44]:
          - generic [ref=e46]: Curator
          - paragraph [ref=e49]: Waiting for instructions...
        - generic [ref=e50]:
          - generic [ref=e52]: Discovery
          - paragraph [ref=e55]: Waiting for instructions...
        - generic [ref=e56]:
          - generic [ref=e58]: Archivist
          - paragraph [ref=e61]: Waiting for instructions...
  - main [ref=e62]:
    - generic [ref=e63]:
      - generic [ref=e64]:
        - generic [ref=e65]:
          - img [ref=e66]
          - textbox "Search signals (Ctrl+K for commands)" [ref=e69]
        - button "Command Center" [ref=e70]:
          - img [ref=e71]
          - text: Command Center
      - generic [ref=e73]:
        - button "Refresh Data" [ref=e74]:
          - img [ref=e75]
        - button "Run Orchestrator" [ref=e80]
    - generic [ref=e82]:
      - img [ref=e85]
      - paragraph [ref=e87]: Synchronizing with Global Intelligence Grid...
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
> 29 |     await expect(page.getByTestId('tab-editor')).toBeVisible();
     |                                                  ^ Error: expect(locator).toBeVisible() failed
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
  61 |     await expect(articleCard).toBeVisible({ timeout: 20000 });
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