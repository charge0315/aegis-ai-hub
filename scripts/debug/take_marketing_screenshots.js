import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, '../../docs/assets');

async function takeMarketingScreenshots() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // 1440x900 のデスクトップサイズに設定
  await page.setViewportSize({ width: 1440, height: 900 });

  console.log('Navigating to http://localhost:5173...');
  try {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    // 記事がロードされるまで少し待機
    await page.waitForTimeout(3000);
  } catch (e) {
    console.error('Failed to connect to dev server. Make sure "npm run dev" is running.');
    process.exit(1);
  }

  console.log('Applying blur filters to sensitive content...');
  // 記事カード内の要素（タイトル、要約、画像、AI推論など）にボカシを適用
  await page.addStyleTag({
    content: `
      /* 記事タイトル、要約、バッジなどのテキスト */
      h3, p, .score-badge, span {
        filter: blur(5px) !important;
        user-select: none !important;
      }
      /* 記事画像 */
      img, .bg-linear-to-br {
        filter: blur(8px) !important;
      }
      /* AI推論パネルのテキスト */
      .font-mono {
        filter: blur(6px) !important;
      }
    `
  });

  // 1. メインダッシュボードの撮影
  console.log('Capturing Dashboard...');
  await page.screenshot({ path: path.join(ASSETS_DIR, 'screenshot-dashboard.png') });

  // 2. Nexus Command (設定画面) の撮影
  console.log('Capturing Nexus Command...');
  // 設定ボタンをクリックしてパネルを開く（UnifiedEditor内の要素を想定）
  // 既存のテストコードを参考にセレクターを特定
  const settingsButton = page.locator('button:has-text("Nexus Command"), .lucide-settings').first();
  if (await settingsButton.isVisible()) {
    await settingsButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ASSETS_DIR, 'screenshot-nexus-command.png') });
  } else {
    console.warn('Settings button not found, skipping second screenshot.');
  }

  console.log(`Screenshots saved to ${ASSETS_DIR}`);
  await browser.close();
}

takeMarketingScreenshots();
