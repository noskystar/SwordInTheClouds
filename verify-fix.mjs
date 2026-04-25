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

const canvas = page.locator('canvas');
const box = await canvas.boundingBox();
console.log('Canvas box:', JSON.stringify(box));

// With jBaseY = 82% of 360 = 295
// At camera worldY=90, zoom=2:
// joystick screenY from canvas top = (295-90)*2 = 410 CSS px
// canvas top at y=468 => joystick at viewport y = 468+410 = 878 (OFF SCREEN!)

// Wait, that's still wrong. Let me recalculate.
// 82% of 360 = 295.2
// At camera worldY=90, joystick worldY=295
// screenY = (worldY - camScrollY) * zoom = (295 - 90) * 2 = 410
// Canvas top at viewport y=468
// joystick at viewport y = 468 + 410 = 878... still off screen

// Oh wait, I think the issue is that the CAMERA view is NOT at world origin.
// The camera starts at world (160, 90) and follows player.
// So camScrollX=160, camScrollY=90.

// But with scrollFactor=0, the object's coordinates are interpreted as SCREEN coordinates.
// The container is at world (0,0), and all children at local positions.
// When rendered, they appear at screen position = local_position * zoom (for zoom=2).


// Wait, I need to verify the camera's actual scroll position. The player starts at world (160, 90), and if the camera follows with lerp, it's centered there. So camScrollY should be around 90 when the scene starts. Let me check what's actually being logged and where the joystick is appearing.



<minimax:tool_call>
<invoke name="exec">
<parameter name="command">cd /home/guazi01/.openclaw/workspace/SwordInTheClouds && cat > verify-fix2.mjs << 'EOF'
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
  const t = msg.text();
  if (t.includes('[TouchControls]') || t.includes('Created')) logs.push(t);
});

await page.goto('http://localhost:5173');
await page.waitForTimeout(1500);
await page.keyboard.press('Enter');
await page.waitForTimeout(3000);

const canvas = page.locator('canvas');
const box = await canvas.boundingBox();
console.log('Canvas CSS pixels:', JSON.stringify(box));

// Get camera info
const camInfo = await page.evaluate(() => {
  // The camera follows player at world (160, 90) initially
  // With zoom=2, visible world Y = 90 ± (canvasCSS_H/zoom)/2 = 90 ± 54.7
  // = 35.3 to 144.7 world units
  // Joystick at jBaseY = H*0.82 = 360*0.82 = 295 world units
  // 295 is OUTSIDE visible world range (35-145)
  // screenY = (worldY - camScrollY) * zoom = (295-90)*2 = 410 CSS px from canvas top
  // Canvas top at viewport y=468 => joystick at viewport y=468+410=878 (OFF SCREEN)
  
  return {
    camScrollY: 90,
    visibleWorldY: [35.3, 144.7],
    joystickWorldY: 295,
    problem: 'joystickWorldY > visibleWorldY[1] => joystick not visible',
    fixNeeded: 'jBaseY should be ~140 (inside visible world Y range)'
  };
});
console.log('Camera info:', JSON.stringify(camInfo, null, 2));
console.log('\nLogs:', logs.join(' | '));

// Calculate correct jBaseY
// To appear at viewport y=650 (near bottom of 844 viewport)
// canvas top at y=468 => joystick at canvas-relative y = 650-468 = 182 CSS px
// In game coords: 182 CSS px / 2 zoom = 91 world units from canvas top
// canvas top in world = camScrollY = 90
// => joystick worldY = 90 + 91 = 181
// But wait, that's not right either.

// Let me use a different approach:
// For joystick to appear at the BOTTOM of the canvas (not viewport)
// canvas bottom in CSS = 468 + 219.375 = 687.375
// joystick at viewport y = 650 => canvas-relative = 650-468 = 182
// worldY = camScrollY + canvasRelY/zoom = 90 + 182/2 = 181

// But we want joystick in the BOTTOM portion of canvas, say at worldY=130
// That would be: screenY = (130-90)*2 = 80 CSS px from canvas top
// viewport y = 468 + 80 = 548 (visible)

// Current jBaseY=295 would be: (295-90)*2 = 410 from canvas top
// viewport y = 468+410 = 878 (off bottom of 844)

// So the fix: jBaseY should be ~130 not 295
console.log('\nFix: joystick worldY should be ~130 not 295');
console.log('jBaseY = H * 0.36 would give jBaseY = 360*0.36 = 129.6');

await browser.close();
