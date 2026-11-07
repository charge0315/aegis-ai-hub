import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

// 特定の Chromium を使いたいときだけ PW_CHROMIUM_PATH で指定する（未指定なら Playwright がインストールしたものを使う）
const localChromiumPath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(isCI || !localChromiumPath ? {} : {
          launchOptions: {
            executablePath: localChromiumPath,
          },
        }),
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !isCI,
      timeout: 120000,
    }
  ],
});
