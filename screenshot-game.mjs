import { chromium } from '@playwright/test';
import { statSync } from 'fs';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 720 });
await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Click at game y=190 (menu first item) * 2 = CSS y=380, at center x=320
await page.mouse.click(320, 380);
await page.waitForTimeout(4000);

await page.screenshot({ path: '/tmp/controls_check.png', fullPage: false });
const size = statSync('/tmp/controls_check.png').size;
console.log('Done, screenshot size:', size);
await browser.close();
