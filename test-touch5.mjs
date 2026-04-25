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
  const game = document.querySelector('canvas');
  if (!game) return { error: 'no canvas' };
  const rect = game.getBoundingClientRect();
  return {
    canvasRect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
    scrollY: window.scrollY,
    innerHeight: window.innerHeight,
  };
});

console.log('Canvas info:', JSON.stringify(info, null, 2));

// Calculate expected joystick screen position
// joystick at world (83, 302), zoom=2, camera at (160, 90)
// screenX = (worldX - cameraScrollX) * zoom
// screenY = (worldY - cameraScrollY) * zoom
const zoom = 2;
const worldX = 83, worldY = 302;
const camX = 160, camY = 90;
const screenX = (worldX - camX) * zoom;
const screenY = (worldY - camY) * zoom;
console.log('Expected joystick screen pos:', { screenX, screenY });
console.log('Canvas bottom Y:', 468 + 219, '(total:', 468+219, ')');
console.log('Player starts at world (160, 90), zoom=2, camera follows');

await browser.close();
