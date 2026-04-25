import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

const allLogs = [];
page.on('console', msg => allLogs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', e => allLogs.push(`[pageerror] ${e.message}`));

await page.goto('http://localhost:5173');
await page.waitForTimeout(4000);

// Check if canvas exists and find touch-related elements
const canvasCount = await page.locator('canvas').count();
const bodyHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
const viewportInfo = await page.evaluate(() => ({
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  visualViewport: { width: visualViewport?.width, height: visualViewport?.height }
}));

console.log('Canvas count:', canvasCount);
console.log('Viewport:', JSON.stringify(viewportInfo));
console.log('Body HTML:', bodyHTML);
console.log('\nAll logs:', allLogs.join('\n'));

await browser.close();
