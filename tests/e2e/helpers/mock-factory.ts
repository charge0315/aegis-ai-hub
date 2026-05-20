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
  private static currentUiSettings = { jaOnly: false, viewMode: 'grid', hideImages: false, isInitialized: true, theme: 'system', language: 'ja' };
  private static currentArticles: any[] = [];

  static async setupCommonMocks(page: Page, overrides: {
    settings?: any,
    uiSettings?: any,
    articles?: any
  } = {}) {
    this.currentSettings = overrides.settings || JSON.parse(JSON.stringify(DEFAULT_MOCK_SETTINGS));
    this.currentUiSettings = overrides.uiSettings || { jaOnly: false, viewMode: 'grid', hideImages: false, isInitialized: true, theme: 'system', language: 'ja' };
    this.currentArticles = overrides.articles || [];

    await page.setViewportSize({ width: 1440, height: 900 });

    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.innerHTML = `*, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; opacity: 1 !important; visibility: visible !important; }`;
      document.head.appendChild(style);
      (window as any).isE2ETest = true;
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

    await page.addInitScript(() => {
      (window as any).nexusApi = {
        getApiKey: () => Promise.resolve('mock-api-key'),
        saveApiKey: () => Promise.resolve({ success: true }),
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
  static updateCurrentSettings(newSettings: any) {
    this.currentSettings = JSON.parse(JSON.stringify(newSettings));
  }

  static async mockDiscoverTrends(page: Page, suggestions: any[]) {
    await page.route(url => url.href.includes('/api/v5/discover-trends'), async (route) => {
      await route.fulfill({ json: { suggestions }, headers: { 'Access-Control-Allow-Origin': '*' } });
    });
  }

  static async mockRestructureProposal(page: Page, proposal: any) {
    await page.route(url => url.href.includes('/api/v5/restructure-categories'), async (route) => {
      await route.fulfill({ json: proposal, headers: { 'Access-Control-Allow-Origin': '*' } });
    });
  }
}
