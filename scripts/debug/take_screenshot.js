import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'initial-load.png', fullPage: true });
    console.log('Screenshot saved as initial-load.png');
    const content = await page.content();
    console.log('Page title:', await page.title());
    console.log('Body snippet:', content.substring(0, 500));
  } catch (e) {
    console.error('Failed to load page:', e);
  } finally {
    await browser.close();
  }
})();
