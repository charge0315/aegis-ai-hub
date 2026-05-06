const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  try {
    await page.goto('http://localhost:3005/', { waitUntil: 'networkidle' });
    const content = await page.content();
    console.log('--- DOM SNAPSHOT ---');
    console.log(content.substring(0, 1000));
    console.log('--- END SNAPSHOT ---');
  } catch (e) {
    console.log('Navigation failed:', e.message);
  }
  await browser.close();
})();
