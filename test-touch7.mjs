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

// Check the player's world position and camera
const gameState = await page.evaluate(() => {
  // Access Phaser through the game element
  const el = document.querySelector('#game-container');
  const canvas = document.querySelector('canvas');
  
  // The game uses 640x360 internal resolution, zoom=2
  // Camera follows player, zoom=2
  // Player starts at (160, 90)
  
  return {
    // Camera starts centered on player at (160, 90)
    // With zoom=2, visible world is 195x109.5 (390/2 x 219.375/2)
    // World coords visible: x: 160-97.5 to 160+97.5 = 62.5 to 257.5
    //                       y: 90-54.75 to 90+54.75 = 35.25 to 144.75
    // joystick at world y=302 is OUTSIDE visible world range (35-145)!
    // That's why it's not visible.
    explanation: 'joystick worldY=302 is below visible range (y=35 to y=145)',
    
    // If we want joystick visible at bottom of screen
    // screen bottom in world coords: y=144.75
    // So we should place joystick at worldY <= 144.75
    // But the current code uses H - H*0.16 = 302, which is way below
  };
});
console.log(JSON.stringify(gameState, null, 2));

// Let's calculate where joystick SHOULD be
const H = 360; // game resolution height
const visibleWorldBottom = 144.75; // approximate visible world bottom at start
const currentJoystickY = H - Math.round(H * 0.16);
console.log('\nCurrent joystick worldY:', currentJoystickY);
console.log('Visible world bottom (approx):', visibleWorldBottom);
console.log('=> Joystick is', currentJoystickY - visibleWorldBottom, 'world units below visible area!');

// What we should use
const desiredScreenBottomWorldY = 140; // near bottom of visible world
console.log('\nDesired joystick worldY for bottom visibility:', desiredScreenBottomWorldY);

await browser.close();
