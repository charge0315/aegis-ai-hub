import { test, expect } from '@playwright/test';

test.describe('AI Insights & Trend Discovery', () => {
  test.beforeEach(async ({ page }) => {
    // 1. 基本的な設定データをモック
    await page.route('**/api/v5/interests', async (route) => {
      await route.fulfill({
        json: {
          categories: {
            "AI & Robotics": {
              emoji: "🤖",
              brands: ["OpenAI", "NVIDIA"],
              keywords: ["LLM", "GPU"],
              score: 9,
              reason: "Core interest area."
            }
          },
          learned_keywords: {}
        }
      });
    });

    await page.route('**/api/v5/feeds', async (route) => {
      await route.fulfill({ json: {} });
    });

    await page.route('**/api/dashboard', async (route) => {
      await route.fulfill({ json: {} });
    });

    // 2. UI 設定をモック (初期化済みフラグをオンにしてダイアログをスキップ)
    await page.addInitScript(() => {
      const win = window as unknown as { nexusApi: Record<string, unknown> };
      win.nexusApi = {
        ...win.nexusApi,
        getApiKey: () => Promise.resolve('mock-api-key'),
        getSettings: () => Promise.resolve({
          interests: { 
            categories: {
              "AI & Robotics": {
                emoji: "🤖",
                brands: ["OpenAI", "NVIDIA"],
                keywords: ["LLM", "GPU"],
                score: 9,
                reason: "Core interest area."
              }
            }, 
            learned_keywords: {} 
          },
          feedConfig: {}
        }),
        getArticles: () => Promise.resolve([]),
        onAgentEvent: () => {},
        removeAgentEventListener: () => {},
        discoverTrends: () => fetch('/api/v5/discover-trends', { method: 'POST' }).then(res => res.json()),
        syncSettings: (settings: unknown) => fetch('/api/v5/sync-settings', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings) 
        }).then(res => res.json()),
        getUiSettings: () => Promise.resolve({ 
          jaOnly: false, 
          viewMode: 'grid', 
          hideImages: false, 
          isInitialized: true 
        }),
        saveUiSettings: () => Promise.resolve({ success: true })
      };
    });
  });

  test('Should discover and display new trends with detailed metadata', async ({ page }) => {
    await page.goto('/');

    // 3. Command & Control (UnifiedEditor) を開く
    const navSettings = page.getByTestId('nav-settings');
    await expect(navSettings).toBeVisible();
    await navSettings.click();
    
    // AI Insights タブをクリック
    const insightsTab = page.getByTestId('tab-insights');
    await expect(insightsTab).toBeVisible();
    await insightsTab.click();

    // 4. 初期状態の確認 (トレンドなし)
    await expect(page.getByText('No active trends detected')).toBeVisible();
    
    // 5. トレンド探索のモック
    await page.route('**/api/v5/discover-trends', async (route) => {
      await route.fulfill({
        json: {
          suggestions: [
            {
              value: "Liquid Neural Networks",
              category: "AI & Robotics",
              reason: "A new type of AI architecture that is more efficient for time-series data.",
              type: "emerging",
              confidence: 92,
              context: "Researchers from MIT have published several papers on Liquid AI recently."
            }
          ]
        }
      });
    });

    // 6. 探索ボタンをクリック
    const discoverBtn = page.getByRole('button', { name: 'Discover Trends Now' });
    await expect(discoverBtn).toBeVisible();
    await discoverBtn.click();

    // 7. トレンドが表示されることを確認 (ローディングが終わるのを待つ)
    await expect(page.getByText('Liquid Neural Networks')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('92% Confidence')).toBeVisible();
    await expect(page.getByText('emerging', { exact: true })).toBeVisible();
    await expect(page.getByText('Researchers from MIT')).toBeVisible();

    // 8. キーワードへ昇格
    const promoteBtn = page.getByRole('button', { name: 'Promote to Keyword' });
    await expect(promoteBtn).toBeVisible();
    
    // 保存リクエストを監視
    let syncPayload: unknown = null;
    await page.route('**/api/v5/sync-settings', async (route) => {
      syncPayload = route.request().postDataJSON();
      await route.fulfill({ json: { lastUpdated: Date.now() } });
    });

    await promoteBtn.click();

    // トレンドが消え、保存ボタンが表示される (isDirtyになるため)
    await expect(page.getByText('Liquid Neural Networks')).not.toBeVisible();
    
    const saveBtn = page.getByTestId('save-settings-button');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // 同期されたデータにキーワードが含まれているか
    const payload = syncPayload as { 
      interests: { 
        categories: Record<string, { keywords: string[] }> 
      } 
    };
    expect(payload.interests.categories["AI & Robotics"].keywords).toContain("Liquid Neural Networks");
  });
});
