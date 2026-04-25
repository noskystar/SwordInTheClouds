import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

const logs = [];
page.on('console', msg => {
  if (msg.text().includes('[TouchControls]')) logs.push(msg.text());
});

await page.goto('http://localhost:5173');
await page.waitForTimeout(1500);
await page.keyboard.press('Enter');
await page.waitForTimeout(3000);

const box = await page.locator('canvas').boundingBox();
console.log('Canvas viewport rect:', JSON.stringify(box));
console.log('TouchControls logs:', logs.join(' | '));

// With jBaseY = 360 * 0.82 = 295
// At camera worldY=90, zoom=2:
// screenY = (worldY - camScrollY) * zoom = (295 - 90) * 2 = 410 CSS px from canvas top
// Canvas top at viewport y = box.y
// Joystick at viewport y = box.y + 410 = 468 + 410 = 878 (OFF SCREEN!)

// Fix: use jBaseY = 360 * 0.36 = 129.6 (inside visible world Y range 35-145)
console.log('\nProblem: joystick at worldY=295 is outside visible world range [35, 145]');
console.log('Fix: jBaseY should be ~130 (inside visible range)');

await browser.close();