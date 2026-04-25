import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

await page.goto('http://localhost:5173');
await page.waitForTimeout(1500);
await page.keyboard.press('Enter');
await page.waitForTimeout(3000);

const canvas = page.locator('canvas');
const box = await canvas.boundingBox();
console.log('Canvas CSS pixels:', JSON.stringify(box));

// Visible world coords with camera at (160,90) zoom=2
// screenX = (worldX - camScrollX) * zoom
// visible world X: (0-camScrollX)*2=0 to (390-camScrollX)*2=390 => camScrollX=160 => worldX 160±97.5
// visible world Y: (0-camScrollY)*2=0 to (219.375-camScrollY)*2=437.5 => camScrollY≈90 => worldY 90±54.7
// => visible world Y range: 35.3 to 144.7
console.log('\nVisible world Y range: ~35 to ~145');
console.log('Current joystick Y=302 is way outside visible range => NOT VISIBLE');

// Calculate what world Y should be for bottom of visible area
// If we want joystick at screen bottom (CSS y=687), and canvas top at y=468
// Joystick CSS y = canvasTop + joystickScreenY/zoom
// 687 = 468 + joystickScreenY/2
// joystickScreenY = (687-468)*2 = 438
// This is in SCREEN SPACE (640x360 coords)
// With scrollFactor=0, screen space = world coords = joystick at worldY=438/2=219? No wait.

// Let's be precise:
// - Canvas CSS height: 219.375px
// - Canvas internal height: 360px
// - Zoom: 2
// - 1 CSS pixel = 360/219.375 = 1.64 internal units
// - OR: 1 internal unit = 219.375/360 = 0.609 CSS pixels

// At zoom=2, 1 world unit = 2 CSS pixels
// CSS canvas height 219.375 => 109.6875 world units visible
// Camera at worldY=90, visible world range: 90±54.75 => 35.25 to 144.75

// Joystick at worldY=302
// At camera worldY=90: screenY = (302-90)*2 = 424 CSS pixels from TOP of canvas
// Canvas top at CSS y=468 => joystick at CSS y=468+424=892 (OFF SCREEN)

// For joystick to appear at bottom of canvas (CSS y≈687):
// (worldY - 90) * 2 + 468 = 687
// worldY = (687-468)/2 + 90 = 109.5 + 90 = 199.5

// But we want it near the BOTTOM of the VISIBLE WORLD area
// Visible world bottom ≈ 145
// If joystick at worldY=145, screenY from canvas top = (145-90)*2 = 110
// joystick CSS y = 468 + 110 = 578 (inside canvas bottom 687)

// Current jBaseY = H - H*0.16 = 360 - 57.6 = 302.4
// Should be: visible world bottom ~145

console.log('\nFix: change jBaseY from 302 to ~140 (near visible world bottom)');
console.log('Also buttons at btnY = H - H*0.08 = 360 - 28.8 = 331.2 (also off screen)');

await browser.close();
