import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    const logo = await page.$('[data-testid="app-logo"]');
    console.log('App Logo exists:', !!logo);
    
    const body = await page.evaluate(() => document.body.innerText);
    console.log('Body text (first 200 chars):', body.substring(0, 200));

    const html = await page.content();
    console.log('Is there a React error overlay?', html.includes('vite-error-overlay'));

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
})();
