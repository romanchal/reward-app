const { test, expect } = require('@playwright/test');

test('capture blank page runtime errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push('PAGEERROR: ' + error.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text());
  });

  await page.goto('http://localhost:4175/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);

  console.log('URL=' + page.url());
  console.log('TITLE=' + await page.title());
  console.log('BODY=' + await page.locator('body').innerText());
  console.log('ERRORS=' + JSON.stringify(errors));
  await expect(page.locator('#root')).not.toBeEmpty();
});
