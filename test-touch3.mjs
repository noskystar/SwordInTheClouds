import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

const logs = [];
page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text().substring(0, 200)}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

await page.goto('http://localhost:5173');
await page.waitForTimeout(2000);

// Press Enter to go from title to overworld
await page.keyboard.press('Enter');
await page.waitForTimeout(3000);

const canvas = page.locator('canvas');
const box = await canvas.boundingBox();
console.log('Canvas:', JSON.stringify(box));

// Filter relevant logs
const relevant = logs.filter(l => l.includes('TouchControls') || l.includes('touch') || l.includes('error') || l.includes('Error'));
console.log('Relevant logs:');
relevant.forEach(l => console.log(' ', l));
console.log('\nAll unique log prefixes:');
const prefixes = [...new Set(logs.map(l => l.substring(0, 50)))];
prefixes.forEach(p => console.log(' ', p));

await browser.close();
