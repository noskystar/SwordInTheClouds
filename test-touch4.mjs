import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

const logs = [];
page.on('console', msg => logs.push(msg.text().substring(0, 300)));
page.on('pageerror', e => logs.push(`ERR: ${e.message}`));

await page.goto('http://localhost:5173');
await page.waitForTimeout(2000);
await page.keyboard.press('Enter');
await page.waitForTimeout(4000);

const info = await page.evaluate(() => {
  const game = window.Phaser?.Games?.[0];
  const scenes = game?.scene?.scenes || [];
  const overworld = scenes.find((s) => s?.sys?.settings?.key === 'Overworld');
  const cam = overworld?.cameras?.main;
  const tc = overworld?.touchControls;
  return {
    sceneExists: !!overworld,
    cameraX: cam?.scrollX,
    cameraY: cam?.scrollY,
    cameraZoom: cam?.zoom,
    camWidth: cam?.width,
    camHeight: cam?.height,
    touchControlsExists: !!tc,
    tcVisible: tc?.visible,
    tcX: tc?.x,
    tcY: tc?.y,
    tcDepth: tc?.depth,
    joystickCenter: tc ? { x: tc.joystickCenter?.x, y: tc.joystickCenter?.y } : null,
    knobMaxRadius: tc?.knobMaxRadius,
    containerChildren: tc?.list?.length,
  };
});
console.log('Game info:', JSON.stringify(info, null, 2));
console.log('\nAll logs:');
logs.forEach(l => console.log(' ', l));
await browser.close();
