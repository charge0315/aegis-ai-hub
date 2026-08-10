import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

// ローカル開発環境では特定バージョンのChromiumパスを指定（CIではPlaywrightがインストールしたものを使用）
const localChromiumPath = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

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
        ...(isCI ? {} : {
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
