import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const viewports = [
  { name: '390x844', width: 390, height: 844, hasTouch: true },
  { name: '375x667', width: 375, height: 667, hasTouch: true },
];

for (const vp of viewports) {
  console.log(`\n=== ${vp.name} ===`);
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.hasTouch,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  
  const tcLogs = [];
  const errors = [];
  page.on('console', msg => {
    if (msg.text().includes('[TouchControls]')) tcLogs.push(msg.text());
    if (msg.type() === 'error' && !msg.text().includes('vite')) errors.push(msg.text());
  });
  page.on('pageerror', e => errors.push(e.message));
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  console.log('Canvas bounding box:', JSON.stringify(box));
  console.log('TouchControls logs:', tcLogs.join(' | '));
  if (errors.length) console.log('Errors:', errors.slice(0, 3));
  else console.log('No errors');
  
  await ctx.close();
}

await browser.close();
