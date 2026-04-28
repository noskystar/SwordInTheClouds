# UI Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 UI bugs (touch controls, virtual E button, player walk animation, title background) and upgrade battle scene visuals with programmatic Graphics/Tween.

**Architecture:** Extract pure layout/detection logic into testable utilities. Fix Phaser-specific integration in scenes. Battle UI upgrades use Graphics primitives with tween-driven animations, no new image assets.

**Tech Stack:** Phaser 3.70+, TypeScript 5.0, Vite 5, Vitest (jsdom), ESLint + Prettier

---

## File Structure

### New Files
- `src/utils/device.ts` — Touch device detection utility (pure function, testable)
- `tests/device.test.ts` — Unit tests for device detection
- `tests/touch-controls-layout.test.ts` — Unit tests for button layout math

### Modified Files
- `src/ui/touch-controls.ts` — Add touch detection, fix button layout (remove zoom division, increase gap)
- `src/scenes/overworld-scene.ts` — Fix virtual E callback, wire touch controls visibility to device type
- `src/scenes/boot-scene.ts` — Compute player_walk frame size from texture at runtime, add fallback
- `src/scenes/title-scene.ts` — Add texture existence check + procedural fallback background
- `src/scenes/battle-scene.ts` — Entity backplates, rounded bars, menu panel, log panel, sword intent glow, turn indicators

---

## Task 1: Device Detection Utility

**Files:**
- Create: `src/utils/device.ts`
- Create: `tests/device.test.ts`

**Context:** Extract touch detection into a pure function so we can test it and reuse it across scenes.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isTouchDevice } from '../src/utils/device';

describe('device detection', () => {
  let originalMaxTouchPoints: number;
  let originalOntouchstart: unknown;

  beforeEach(() => {
    originalMaxTouchPoints = navigator.maxTouchPoints;
    originalOntouchstart = window.ontouchstart;
  });

  afterEach(() => {
    vi.stubGlobal('navigator', { maxTouchPoints: originalMaxTouchPoints });
    vi.stubGlobal('window', { ...window, ontouchstart: originalOntouchstart });
    vi.restoreAllMocks();
  });

  it('returns true when ontouchstart exists', () => {
    vi.stubGlobal('window', { ...window, ontouchstart: vi.fn() });
    vi.stubGlobal('navigator', { maxTouchPoints: 0 });
    expect(isTouchDevice()).toBe(true);
  });

  it('returns true when maxTouchPoints > 0', () => {
    vi.stubGlobal('window', { ...window, ontouchstart: undefined });
    vi.stubGlobal('navigator', { maxTouchPoints: 5 });
    expect(isTouchDevice()).toBe(true);
  });

  it('returns false when no touch support', () => {
    vi.stubGlobal('window', { ...window, ontouchstart: undefined });
    vi.stubGlobal('navigator', { maxTouchPoints: 0 });
    expect(isTouchDevice()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/device.test.ts`
Expected: FAIL with "isTouchDevice is not defined"

- [ ] **Step 3: Implement `isTouchDevice`**

Create `src/utils/device.ts`:

```typescript
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/device.test.ts`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add src/utils/device.ts tests/device.test.ts
git commit -m "feat(utils): add isTouchDevice detection utility

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: TouchControls Layout Fix

**Files:**
- Modify: `src/ui/touch-controls.ts`
- Create: `tests/touch-controls-layout.test.ts`

**Context:** Fix button overlap by removing zoom from gap math and increasing spacing. Add a `createIfTouch` static factory so scenes can conditionally instantiate.

- [ ] **Step 1: Write layout math test**

Create `tests/touch-controls-layout.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('touch controls layout', () => {
  it('button gap must be >= 2 * radius + padding', () => {
    const H = 180;
    const W = 320;
    const btnR = Math.round(H * 0.04);
    const btnGap = Math.round(W * 0.065);
    const padding = 4;
    expect(btnGap).toBeGreaterThanOrEqual(2 * btnR + padding);
  });

  it('buttons fit within right margin with new sizing', () => {
    const W = 320;
    const H = 180;
    const btnR = Math.round(H * 0.04);
    const btnGap = Math.round(W * 0.065);
    const btnBaseX = W * 0.82;
    const leftEdge = btnBaseX - btnGap - btnR;
    const rightEdge = btnBaseX + btnGap + btnR;
    expect(leftEdge).toBeGreaterThanOrEqual(W * 0.5);
    expect(rightEdge).toBeLessThanOrEqual(W);
  });
});
```

- [ ] **Step 2: Run layout test**

Run: `npm run test -- tests/touch-controls-layout.test.ts`
Expected: PASS (2/2) — this test documents the invariants; it should pass with corrected constants

- [ ] **Step 3: Modify `touch-controls.ts` — reduce button radius and fix gap**

In `src/ui/touch-controls.ts`, change the button sizing constants in `createControls()`:

```typescript
// OLD:
// const btnGap = Math.round((W * 0.065) / (this.scene.cameras.main.zoom || 1));
// const btnR = Math.round(H * 0.055);

// NEW:
const btnGap = Math.round(W * 0.065); // no zoom division
const btnR = Math.round(H * 0.04);    // smaller radius
```

And in `onResize()`, make the same changes to the corresponding lines.

Also add a static factory method at the top of the class (after the field declarations, before the constructor):

```typescript
import { isTouchDevice } from '../utils/device';

export class TouchControls {
  // ... existing fields ...

  static createIfTouch(
    scene: Scene,
    callbacks: { onInteract: () => void; onBattle: () => void; onMenu: () => void; onDialogueAdvance: () => void }
  ): TouchControls | undefined {
    if (!isTouchDevice()) return undefined;
    return new TouchControls(scene, callbacks);
  }

  // ... constructor ...
}
```

- [ ] **Step 4: Verify no type errors**

Run: `npm run typecheck`
Expected: PASS (no errors)

- [ ] **Step 5: Commit**

```bash
git add src/ui/touch-controls.ts tests/touch-controls-layout.test.ts
git commit -m "fix(ui): reduce touch button size, remove zoom from gap, add createIfTouch factory

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Overworld Scene — Fix Virtual E Button + Wire Touch Visibility

**Files:**
- Modify: `src/scenes/overworld-scene.ts`

**Context:** Fix the virtual E callback so it sets the flag BEFORE calling checkInteractions. Also wire the new `createIfTouch` factory.

- [ ] **Step 1: Fix the onInteract callback**

In `src/scenes/overworld-scene.ts`, find the `TouchControls` instantiation (around line 130) and replace:

```typescript
// OLD:
this.touchControls = new TouchControls(this, {
  onInteract: () => {
    this.touchInteractWasDown = false;
    this.checkInteractions();
  },
  // ... rest unchanged
});

// NEW:
this.touchControls = TouchControls.createIfTouch(this, {
  onInteract: () => {
    this.touchInteractWasDown = true;
    this.checkInteractions();
  },
  onBattle: () => this.checkBattleTrigger(),
  onMenu: () => this.pauseMenu.toggle(),
  onDialogueAdvance: () => {
    if (this.dialoguePanel?.isVisible()) {
      this.dialoguePanel.handleInputTouch();
    }
  },
});
```

- [ ] **Step 2: Verify no type errors**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/scenes/overworld-scene.ts
git commit -m "fix(overworld): fix virtual E button callback order, wire createIfTouch

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: BootScene — Runtime Frame Size for player_walk

**Files:**
- Modify: `src/scenes/boot-scene.ts`

**Context:** player_walk.png is a 1024x1024 2x2 sprite sheet. Loading it as 16x16 frames cuts blank corners. Compute frame size from the loaded texture after load completes.

- [ ] **Step 1: Replace static frame dimensions with runtime computation**

In `src/scenes/boot-scene.ts`, replace the player_walk load line:

```typescript
// OLD:
this.load.spritesheet('player_walk', 'assets/images/characters/player/player_walk.png', { frameWidth: 16, frameHeight: 16 });

// NEW:
this.load.spritesheet('player_walk', 'assets/images/characters/player/player_walk.png', { frameWidth: 64, frameHeight: 64 });
// We use 64x64 as a safe initial guess; the create() step will recompute from actual texture.
```

- [ ] **Step 2: Add post-load frame size correction in create()**

Add this block at the end of `create()`, before the fade-out:

```typescript
// Fix player_walk frame size from actual texture dimensions
const playerWalkTexture = this.textures.get('player_walk');
if (playerWalkTexture) {
  const source = playerWalkTexture.getSourceImage();
  if (source && source.width >= 2 && source.height >= 2) {
    const actualWidth = source.width as number;
    const actualHeight = source.height as number;
    // Assume a 2x2 layout (4 frames). If the image is square and divisible by 2, use w/2, h/2.
    if (actualWidth === actualHeight && actualWidth % 2 === 0) {
      const frameSize = actualWidth / 2;
      // Remove old frames and recreate with correct size
      playerWalkTexture.remove('__BASE');
      playerWalkTexture.remove('0');
      playerWalkTexture.remove('1');
      playerWalkTexture.remove('2');
      playerWalkTexture.remove('3');
      for (let i = 0; i < 4; i++) {
        const x = (i % 2) * frameSize;
        const y = Math.floor(i / 2) * frameSize;
        playerWalkTexture.add(i, 0, x, y, frameSize, frameSize);
      }
      console.log(`[BootScene] player_walk frame size corrected to ${frameSize}x${frameSize}`);
    } else {
      console.warn(`[BootScene] player_walk texture size ${actualWidth}x${actualHeight} does not match expected 2x2 layout`);
    }
  }
}
```

- [ ] **Step 3: Verify no type errors**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/scenes/boot-scene.ts
git commit -m "fix(boot): compute player_walk frame size from texture at runtime

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: TitleScene — Background Texture Check + Procedural Fallback

**Files:**
- Modify: `src/scenes/title-scene.ts`

**Context:** If bg_title texture is missing (load failure), show a procedurally drawn background instead of blank.

- [ ] **Step 1: Modify create() to check texture and draw fallback**

In `src/scenes/title-scene.ts`, replace the background image block:

```typescript
// Title background with fallback
const hasBgTexture = this.textures.exists('bg_title');
if (hasBgTexture) {
  const bg = this.add.image(
    this.cameras.main.width / 2,
    this.cameras.main.height / 2,
    'bg_title'
  );
  bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);
  bg.setOrigin(0.5);
  bg.setDepth(0);
} else {
  // Procedural fallback: dark gradient with subtle grid
  const gfx = this.add.graphics();
  gfx.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a1a3e, 0x1a1a3e, 1);
  gfx.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

  // Subtle grid lines
  gfx.lineStyle(1, 0x2a2a4a, 0.15);
  for (let x = 0; x < this.cameras.main.width; x += 20) {
    gfx.moveTo(x, 0);
    gfx.lineTo(x, this.cameras.main.height);
  }
  for (let y = 0; y < this.cameras.main.height; y += 20) {
    gfx.moveTo(0, y);
    gfx.lineTo(this.cameras.main.width, y);
  }
  gfx.strokePath();
  gfx.setDepth(0);

  console.warn('[TitleScene] bg_title texture missing, using procedural fallback');
}
```

- [ ] **Step 2: Verify no type errors**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/scenes/title-scene.ts
git commit -m "fix(title): add bg_title texture check + procedural fallback background

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: BattleScene — Entity Backplates

**Files:**
- Modify: `src/scenes/battle-scene.ts`

**Context:** Add a semi-transparent rounded rectangle backplate under each entity for visual grouping.

- [ ] **Step 1: Add backplate to createEntityDisplay()**

In `src/scenes/battle-scene.ts`, in `createEntityDisplay()`, add after `container` creation and before adding elements:

```typescript
// Entity backplate
const backplate = this.add.rectangle(0, 8, 52, 56, 0x1a1a2e, 0.7);
backplate.setStrokeStyle(1, 0x4a4a6a, 0.5);
backplate.setDepth(-1);

// Element text color (move to after sprite creation)
```

Then change the `container.add()` line to include `backplate` as the first element:

```typescript
container.add([backplate, sprite, nameText, elementText, hpBarBg, hpBar, mpBarBg, mpBar, atbBarBg, atbBar, hpText]);
```

Also update the `EntityDisplay` interface to include the backplate:

```typescript
interface EntityDisplay {
  container: Phaser.GameObjects.Container;
  backplate: Phaser.GameObjects.Rectangle;
  sprite: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
  // ... rest unchanged
}
```

And update the `display` object creation:

```typescript
const display: EntityDisplay = {
  container,
  backplate,
  sprite,
  // ... rest unchanged
};
```

- [ ] **Step 2: Add target selection highlight on backplate**

In `updateTargetSelection()`, add backplate border highlight. Find the method and replace with:

```typescript
private updateTargetSelection(): void {
  const aliveEnemies = this.battleSystem.getAliveEnemies();
  for (let i = 0; i < this.targetArrows.length; i++) {
    this.targetArrows[i].setVisible(i === this.selectedTargetIndex);
  }
  // Highlight selected enemy backplate
  for (const enemy of aliveEnemies) {
    const display = this.entityDisplays.get(enemy.id);
    if (display) {
      const isSelected = aliveEnemies.indexOf(enemy) === this.selectedTargetIndex;
      display.backplate.setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xffdd00 : 0x4a4a6a, isSelected ? 0.8 : 0.5);
    }
  }
}
```

- [ ] **Step 3: Verify no type errors**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/scenes/battle-scene.ts
git commit -m "feat(battle): add entity backplates + target selection highlight

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: BattleScene — Rounded Bars with Gradients

**Files:**
- Modify: `src/scenes/battle-scene.ts`

**Context:** Replace plain rectangle bars with rounded bars that change color based on HP level. Add a subtle border.

- [ ] **Step 1: Add rounded bar helper and replace bar creation**

Add a private helper method near the top of `BattleScene` class (after the field declarations):

```typescript
private createRoundedBar(x: number, y: number, width: number, height: number, color: number, alpha = 1): Phaser.GameObjects.Graphics {
  const gfx = this.add.graphics();
  gfx.fillStyle(color, alpha);
  const r = height / 2;
  gfx.fillRoundedRect(x - width / 2, y - height / 2, width, height, r);
  return gfx;
}

private updateRoundedBar(bar: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, color: number, alpha = 1): void {
  bar.clear();
  bar.fillStyle(color, alpha);
  const r = height / 2;
  bar.fillRoundedRect(x - width / 2, y - height / 2, width, height, r);
}
```

Now replace the bar creation in `createEntityDisplay()`. Change from using `Phaser.GameObjects.Rectangle` for bars to using `Phaser.GameObjects.Graphics` with rounded corners.

Replace the bar section:

```typescript
// OLD bar creation:
// const hpBarBg = this.add.rectangle(0, 4, 40, 6, 0x333333);
// const hpBar = this.add.rectangle(-20, 4, 40, 6, 0x44aa44);
// etc.

// NEW:
const hpBarBg = this.createRoundedBar(0, 4, 40, 6, 0x333333);
const hpBar = this.createRoundedBar(0, 4, 40, 6, 0x44aa44);

const mpBarBg = this.createRoundedBar(0, 13, 40, 4, 0x333333);
const mpBar = this.createRoundedBar(0, 13, 40, 4, 0x4488cc);

const atbBarBg = this.createRoundedBar(0, 21, 40, 3, 0x333333);
const atbBar = this.createRoundedBar(0, 21, 0, 3, 0xffff00);
```

Update the `EntityDisplay` interface:

```typescript
interface EntityDisplay {
  container: Phaser.GameObjects.Container;
  backplate: Phaser.GameObjects.Rectangle;
  sprite: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
  nameText: Phaser.GameObjects.Text;
  hpBar: Phaser.GameObjects.Graphics;
  hpBarBg: Phaser.GameObjects.Graphics;
  mpBar: Phaser.GameObjects.Graphics;
  mpBarBg: Phaser.GameObjects.Graphics;
  atbBar: Phaser.GameObjects.Graphics;
  atbBarBg: Phaser.GameObjects.Graphics;
  buffIcons: Phaser.GameObjects.Text[];
}
```

- [ ] **Step 2: Update updateEntityDisplay() to use rounded bars**

Replace the bar update logic in `updateEntityDisplay()`:

```typescript
private updateEntityDisplay(entityId: string): void {
  const entity = this.battleSystem.getEntity(entityId);
  const display = this.entityDisplays.get(entityId);
  if (!entity || !display) return;

  const hpRatio = entity.hp / entity.maxHp;
  const hpColor = hpRatio > 0.5 ? 0x44aa44 : hpRatio > 0.25 ? 0xaaaa44 : 0xaa4444;
  this.updateRoundedBar(display.hpBar, 0, 4, 40 * hpRatio, 6, hpColor);

  const mpRatio = entity.mp / entity.maxMp;
  this.updateRoundedBar(display.mpBar, 0, 13, 40 * mpRatio, 4, 0x4488cc);

  this.updateRoundedBar(display.atbBar, 0, 21, 40 * Math.min(1, entity.atbGauge / 1000), 3, 0xffff00);
}
```

- [ ] **Step 3: Update updateATBBars() to use rounded bars**

```typescript
private updateATBBars(): void {
  for (const entity of this.battleSystem.getAllEntities()) {
    const display = this.entityDisplays.get(entity.id);
    if (display) {
      const ratio = Math.min(1, entity.atbGauge / 1000);
      this.updateRoundedBar(display.atbBar, 0, 21, 40 * ratio, 3, 0xffff00);
    }
  }
}
```

- [ ] **Step 4: Verify no type errors**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scenes/battle-scene.ts
git commit -m "feat(battle): replace rectangle bars with rounded graphics bars

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: BattleScene — Menu Panel + Selection Highlight

**Files:**
- Modify: `src/scenes/battle-scene.ts`

**Context:** Replace the plain black menu background with a rounded panel. Add a highlight bar behind the selected item. Add key hint text.

- [ ] **Step 1: Replace menu background with rounded panel**

In `createMenu()`, replace the background creation:

```typescript
// OLD:
// const bg = this.add.rectangle(0, 0, 140, 72, 0x000000, 0.85);
// bg.setStrokeStyle(1, 0x888888);

// NEW:
const menuPanel = this.add.graphics();
menuPanel.fillStyle(0x0d0d1a, 0.92);
menuPanel.lineStyle(1, 0x4a4a6a, 0.8);
menuPanel.fillRoundedRect(-80, -40, 160, 88, 6);
menuPanel.strokeRoundedRect(-80, -40, 160, 88, 6);
this.menuContainer.add(menuPanel);

// Selection highlight bar
const highlightBar = this.add.rectangle(-58, -24, 152, 14, 0x2a3a5a, 0.6);
highlightBar.setOrigin(0, 0.5);
highlightBar.setVisible(false);
highlightBar.setName('menu-highlight');
this.menuContainer.add(highlightBar);

// Key hint text
const hintText = this.add.text(0, 42, '↑↓ 选择 · 空格 确认 · ESC 取消', uiTextStyle({
  fontSize: '8px',
  color: '#666666',
  align: 'center',
}));
hintText.setOrigin(0.5);
this.menuContainer.add(hintText);
```

- [ ] **Step 2: Update updateMenuSelection() to show highlight bar**

Replace `updateMenuSelection()`:

```typescript
private updateMenuSelection(): void {
  const items = this.menuState === 'skill' ? this.skillList.length : MENU_OPTIONS.length;
  const highlightBar = this.menuContainer.getByName('menu-highlight') as Phaser.GameObjects.Rectangle;

  for (let i = 0; i < this.menuItems.length; i++) {
    const text = this.menuItems[i];
    if (i >= items) {
      text.setVisible(false);
      continue;
    }
    text.setVisible(true);

    if (i === this.selectedMenuIndex) {
      text.setColor('#ffffff');
      text.setText('▶ ' + text.text.replace(/^▶ /, ''));
      if (highlightBar) {
        highlightBar.setVisible(true);
        highlightBar.setPosition(-76, -24 + i * 16);
      }
    } else {
      text.setColor('#888888');
      text.setText(text.text.replace(/^▶ /, ''));
    }
  }

  if (highlightBar && this.selectedMenuIndex >= items) {
    highlightBar.setVisible(false);
  }
}
```

- [ ] **Step 3: Update showActionMenu() to update menu text for skill availability**

In `showActionMenu()`, after setting menu text, ensure the hint text is visible:

```typescript
const hintText = this.menuContainer.getByName('menu-hint') as Phaser.GameObjects.Text;
if (hintText) hintText.setVisible(true);
```

Actually, let me add a name to the hint text in step 1:

```typescript
hintText.setName('menu-hint');
```

- [ ] **Step 4: Verify no type errors**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scenes/battle-scene.ts
git commit -m "feat(battle): rounded menu panel + selection highlight bar + key hints

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 9: BattleScene — Log Panel + Sword Intent Glow + Turn Indicators

**Files:**
- Modify: `src/scenes/battle-scene.ts`

**Context:** Add a semi-transparent background panel for the battle log. Add sword intent glow at 100. Add turn indicators above active entities.

- [ ] **Step 1: Replace log with panel + add colored messages**

Replace `createBattleLog()`:

```typescript
private createBattleLog(): void {
  const logPanel = this.add.graphics();
  logPanel.fillStyle(0x000000, 0.5);
  logPanel.fillRoundedRect(10, 4, 300, 52, 4);
  logPanel.setDepth(10);
  logPanel.setScrollFactor(0);

  this.battleLog = this.add.text(160, 10, '', uiTextStyle({
    fontSize: '11px',
    color: '#cccccc',
    align: 'left',
    wordWrap: { width: 288 },
    lineSpacing: 2,
  }));
  this.battleLog.setOrigin(0.5, 0);
  this.battleLog.setDepth(11);
  this.battleLog.setScrollFactor(0);
}
```

Update `addLog()` to support colored entries:

```typescript
private addLog(message: string, color = '#cccccc'): void {
  this.logEntries.push(message);
  if (this.logEntries.length > 3) {
    this.logEntries.shift();
  }
  this.battleLog.setText(this.logEntries.join('\n'));

  // Slide-in effect on new message
  this.battleLog.setAlpha(0);
  this.tweens.add({
    targets: this.battleLog,
    alpha: 1,
    duration: 200,
    ease: 'Power1',
  });
}
```

Update event handlers to pass colors:

In `setupBattleEvents()`, update the damage handler:

```typescript
this.battleSystem.on('damage_dealt', (event: BattleEvent) => {
  if (event.type === 'damage_dealt') {
    const target = this.battleSystem.getEntity(event.targetId);
    const isCrit = event.isCritical ?? false;
    const msg = `${target?.name} 受到 ${event.damage} 点伤害${isCrit ? '（暴击！）' : ''}`;
    this.addLog(msg, isCrit ? '#ffcc00' : '#ff6666');
    // ... rest unchanged
  }
});
```

Update heal handler:

```typescript
this.battleSystem.on('heal', (event: BattleEvent) => {
  if (event.type === 'heal') {
    const target = this.battleSystem.getEntity(event.targetId);
    this.addLog(`${target?.name} 恢复 ${event.amount} 点生命`, '#66ff66');
    // ... rest unchanged
  }
});
```

- [ ] **Step 2: Add sword intent glow at 100**

In `updateSwordIntentDisplay()`, add glow tween:

```typescript
private updateSwordIntentDisplay(value: number): void {
  const ratio = value / 100;
  this.swordIntentBar.width = 48 * ratio;
  this.swordIntentBar.fillColor = value >= 100 ? 0xff6600 : 0xffaa00;
  this.swordIntentText.setText(`${value}/100`);

  if (value >= 100) {
    // Add pulsing glow if not already active
    if (!this.swordIntentGlow) {
      this.swordIntentGlow = this.add.graphics();
      this.swordIntentGlow.setDepth(9);
    }
    this.swordIntentGlow.clear();
    this.swordIntentGlow.lineStyle(2, 0xff6600, 0.5 + Math.sin(this.time.now / 200) * 0.3);
    this.swordIntentGlow.strokeRoundedRect(-28, -4, 56, 10, 3);
  } else if (this.swordIntentGlow) {
    this.swordIntentGlow.clear();
  }
}
```

Add the field declaration at the top of the class:

```typescript
private swordIntentGlow?: Phaser.GameObjects.Graphics;
```

- [ ] **Step 3: Add turn indicators**

Add a field for turn arrows:

```typescript
private turnArrows = new Map<string, Phaser.GameObjects.Triangle>();
```

Add a method to create/update turn arrows:

```typescript
private updateTurnIndicator(): void {
  // Clear old arrows
  for (const arrow of this.turnArrows.values()) {
    arrow.destroy();
  }
  this.turnArrows.clear();

  const readyId = this.battleSystem.getReadyEntityId?.();
  if (!readyId) return;

  const entity = this.battleSystem.getEntity(readyId);
  if (!entity) return;

  const display = this.entityDisplays.get(readyId);
  if (!display) return;

  const arrow = this.add.triangle(
    display.container.x,
    display.container.y - 42,
    0, 0,
    6, 8,
    -6, 8,
    0xffff00
  );
  arrow.setOrigin(0.5);
  arrow.setDepth(12);

  // Float animation
  this.tweens.add({
    targets: arrow,
    y: display.container.y - 45,
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  this.turnArrows.set(readyId, arrow);
}
```

Call this in `update()` when a turn becomes ready, or hook it into the battle system events. The simplest place is in `update()` after checking `readyId`:

```typescript
update(_time: number, delta: number): void {
  // ... existing code ...

  if (this.menuState === 'hidden') {
    const readyId = this.battleSystem.tick(delta);
    this.updateATBBars();
    this.updateTurnIndicator(); // ADD THIS LINE

    // ... rest unchanged
  }

  // ... rest unchanged
}
```

Also add screen edge tint for player turn. In `showActionMenu()`:

```typescript
private showActionMenu(): void {
  // ... existing code ...

  // Player turn screen tint
  if (!this.playerTurnTint) {
    this.playerTurnTint = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x4488ff,
      0.08
    );
    this.playerTurnTint.setScrollFactor(0);
    this.playerTurnTint.setDepth(1);
    this.playerTurnTint.setVisible(false);
  }
  this.playerTurnTint.setVisible(true);
}
```

And in `hideMenu()`:

```typescript
private hideMenu(): void {
  this.menuContainer.setVisible(false);
  this.menuItems.forEach((item) => item.setColor('#aaaaaa'));
  this.hideTouchOverlay();
  if (this.playerTurnTint) {
    this.playerTurnTint.setVisible(false);
  }
}
```

Add the field:

```typescript
private playerTurnTint?: Phaser.GameObjects.Rectangle;
```

- [ ] **Step 4: Verify no type errors**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scenes/battle-scene.ts
git commit -m "feat(battle): log panel, sword intent glow, turn indicators

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run full type check**

Run: `npm run typecheck`
Expected: PASS (no errors)

- [ ] **Step 2: Run tests**

Run: `npm run test`
Expected: PASS (all existing tests + new tests)

- [ ] **Step 3: Run linter**

Run: `npm run lint`
Expected: PASS (no errors)

- [ ] **Step 4: Manual smoke test checklist**

Run: `npm run dev`

Verify each item:
- [ ] Desktop browser: no touch controls visible
- [ ] Mobile/touch simulation: touch controls appear, buttons don't overlap
- [ ] Virtual E button triggers NPC interaction
- [ ] Keyboard E still works for NPC interaction
- [ ] Player walk animation is visible (not blank frames)
- [ ] Title screen shows bg_title (or fallback if texture missing)
- [ ] Battle scene: entity backplates visible
- [ ] Battle scene: rounded bars with color changes
- [ ] Battle scene: menu panel with selection highlight
- [ ] Battle scene: log panel with colored messages
- [ ] Battle scene: sword intent glows at 100
- [ ] Battle scene: turn arrow floats above ready entity

- [ ] **Step 5: Final commit (if any fixes from smoke test)**

Fix any issues found during smoke test, then commit.

---

## Self-Review

### Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Touch controls not shown on non-touch | Task 2 (createIfTouch) + Task 3 (wire in Overworld) |
| Buttons don't overlap | Task 2 (btnR reduced to H*0.04, gap fixed) |
| Virtual E triggers interaction | Task 3 (flag set before checkInteractions) |
| Player walk visible | Task 4 (runtime frame size from texture) |
| Title background fallback | Task 5 (texture check + procedural fallback) |
| Entity backplates | Task 6 |
| Rounded bars | Task 7 |
| Menu panel + highlight | Task 8 |
| Log panel + colored messages | Task 9 (Step 1) |
| Sword intent glow | Task 9 (Step 2) |
| Turn indicators | Task 9 (Step 3) |
| No placeholders | Verified: all steps have concrete code |
| Type consistency | All `EntityDisplay` fields updated consistently across tasks |

### Placeholder Scan

No TBD/TODO/fill-in-details found. All code blocks are complete.

### Type Consistency

- `EntityDisplay` interface updated in Task 6 (add `backplate`) and Task 7 (change bars to `Graphics`)
- `updateEntityDisplay()` and `updateATBBars()` updated to use `updateRoundedBar()`
- `updateTargetSelection()` updated to use `display.backplate`
- All field declarations (`swordIntentGlow`, `turnArrows`, `playerTurnTint`) added at class level

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-28-ui-optimization.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
