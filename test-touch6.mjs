import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

await page.goto('http://localhost:5173');
await page.waitForTimeout(2000);
await page.keyboard.press('Enter');
await page.waitForTimeout(4000);

const info = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const rect = canvas.getBoundingClientRect();
  const cs = window.getComputedStyle(canvas);
  return {
    canvasTop: rect.top,
    canvasBottom: rect.bottom,
    canvasHeight: rect.height,
    canvasWidth: rect.width,
    marginTop: cs.marginTop,
    canvasStyle: cs.cssText.substring(0, 200),
  };
});

console.log('Canvas CSS info:', JSON.stringify(info, null, 2));

// Test: Simulate touch on left-bottom corner of canvas (where joystick should be)
const canvas = page.locator('canvas');
const box = await canvas.boundingBox();
console.log('Canvas bounding box:', box);

// Touch at screen position (83, 302) which should be joystick
// But this is relative to VIEWPORT, not canvas
// Joystick is at (83, 302) in SCREEN space, canvas starts at y=468
// So joystick is at viewport y=302, canvas top at y=468
// The joystick would appear at canvas-relative y = 302 - 468 = -166 (ABOVE canvas!)

console.log('\nTouch would be at y=302, but canvas top is at y=468');
console.log('=> joystick is ABOVE visible canvas area!');
console.log('The joystick center should be at canvas-bottom-relative position');

await browser.close();
