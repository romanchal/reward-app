const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];

  page.on('pageerror', (error) => {
    errors.push('PAGEERROR: ' + error.message);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push('CONSOLE: ' + msg.text());
    }
  });

  await page.goto('http://localhost:4175/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);

  const bodyText = await page.locator('body').innerText();
  console.log('URL=' + page.url());
  console.log('TITLE=' + await page.title());
  console.log('BODY=' + bodyText.slice(0, 2000));
  console.log('ERRORS=' + JSON.stringify(errors));

  await browser.close();
})();
