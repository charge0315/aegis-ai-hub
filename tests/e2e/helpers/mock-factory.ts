import { Page } from '@playwright/test';

export const DEFAULT_MOCK_SETTINGS = {
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
  feedConfig: {
    "AI & Robotics": { active: ["https://example.com/rss"], pool: [], failures: {} }
  }
};

/**
 * Singleton-like factory for E2E mocks
 */
export class MockFactory {
  private static currentSettings = JSON.parse(JSON.stringify(DEFAULT_MOCK_SETTINGS));
  private static currentUiSettings = { jaOnly: false, viewMode: 'grid' as const, hideImages: false, isInitialized: true, theme: 'system' as const, language: 'ja' as const };
  private static currentArticles: unknown[] = [];

  static async setupCommonMocks(page: Page, overrides: {
    settings?: unknown,
    uiSettings?: unknown,
    articles?: unknown[]
  } = {}) {
    // @ts-expect-error - Overriding with partial mock data
    if (overrides.settings) this.currentSettings = overrides.settings;
    else this.currentSettings = JSON.parse(JSON.stringify(DEFAULT_MOCK_SETTINGS));

    // @ts-expect-error - Overriding with partial mock data
    if (overrides.uiSettings) this.currentUiSettings = overrides.uiSettings;
    
    this.currentArticles = overrides.articles || [];

    await page.setViewportSize({ width: 1440, height: 900 });

    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.innerHTML = `*, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; opacity: 1 !important; visibility: visible !important; }`;
      document.head.appendChild(style);
      (window as unknown as { isE2ETest: boolean }).isE2ETest = true;
    });

    // 唯一のルート設定 (Singleton route)
    await page.route(url => url.href.includes('/api/v5/interests'), async (route) => {
      await route.fulfill({ json: this.currentSettings.interests, headers: { 'Access-Control-Allow-Origin': '*' } });
    });
    await page.route(url => url.href.includes('/api/v5/feeds'), async (route) => {
      await route.fulfill({ json: this.currentSettings.feedConfig, headers: { 'Access-Control-Allow-Origin': '*' } });
    });
    await page.route(url => url.href.includes('/api/dashboard'), async (route) => {
      const mock = { "AI & Robotics": { emoji: "🤖", articles: this.currentArticles } };
      await route.fulfill({ json: mock, headers: { 'Access-Control-Allow-Origin': '*' } });
    });
    await page.route(url => url.href.includes('/api/v5/ui-settings'), async (route) => {
      await route.fulfill({ json: this.currentUiSettings, headers: { 'Access-Control-Allow-Origin': '*' } });
    });
    await page.route(url => url.href.includes('/api/v5/usage-stats'), async (route) => {
      await route.fulfill({ json: {}, headers: { 'Access-Control-Allow-Origin': '*' } });
    });

    await page.route(url => url.href.includes('/api/v5/sync-settings'), async (route) => {
      await route.fulfill({ json: { lastUpdated: Date.now() }, headers: { 'Access-Control-Allow-Origin': '*' } });
    });

    await page.addInitScript(() => {
      (window as unknown as { nexusApi: unknown }).nexusApi = {
        getApiKey: () => Promise.resolve('mock-api-key'),
        saveApiKey: () => Promise.resolve({ success: true }),
        getCredentials: () => Promise.resolve({
          activeProvider: 'google',
          activeModel: 'gemini-3.5-flash',
          google: { apiKey: 'mock-api-key' },
          anthropic: {},
          openai: {},
          ollama: { baseUrl: 'http://localhost:11434' },
          geminiApiKey: 'mock-api-key'
        }),
        saveCredentials: () => Promise.resolve({ success: true }),
        onAgentEvent: () => () => {},
        removeAgentEventListener: () => {},
        windowControl: () => {},
        onUsageUpdate: () => () => {},
      };
    });
  }

  /**
   * テスト中に動的にモックデータを更新
   */
  static updateCurrentSettings(newSettings: unknown) {
    this.currentSettings = JSON.parse(JSON.stringify(newSettings));
  }

  static async mockDiscoverTrends(page: Page, suggestions: unknown[]) {
    await page.route(url => url.href.includes('/api/v5/discover-trends'), async (route) => {
      await route.fulfill({ json: { suggestions }, headers: { 'Access-Control-Allow-Origin': '*' } });
    });
  }

  static async mockRestructureProposal(page: Page, proposal: unknown) {
    await page.route(url => url.href.includes('/api/v5/restructure-categories'), async (route) => {
      await route.fulfill({ json: proposal, headers: { 'Access-Control-Allow-Origin': '*' } });
    });
  }
}
