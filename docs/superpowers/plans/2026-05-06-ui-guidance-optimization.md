# UI 引导优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复游戏 640×360 分辨率适配，在大地图添加任务追踪面板和方向箭头，并将交互提示从常驻改为上下文按需出现。

**Architecture:** 将 UI 渲染与纯逻辑分离：QuestTrackerHUD 和 DirectionArrow 各自提供可单元测试的纯函数（计算显示文本/箭头位置），再由 Phaser 包装类负责创建和管理 GameObjects。所有现有硬编码 320×180 的坐标统一改为引用 `GAME_WIDTH/GAME_HEIGHT`。

**Tech Stack:** Phaser 3, TypeScript 5, Vitest (jsdom), Vite

---

## File Structure

| 文件 | 职责 |
|---|---|
| `src/ui/quest-tracker-hud.ts` | QuestTrackerHUD 组件：纯逻辑 + Phaser 渲染 |
| `src/ui/direction-arrow.ts` | DirectionArrow 组件：纯计算 + Phaser 渲染 |
| `tests/ui/quest-tracker-hud.test.ts` | QuestTrackerHUD 逻辑测试 |
| `tests/ui/direction-arrow.test.ts` | DirectionArrow 计算测试 |
| `src/ui/quick-bar.ts` | 修复硬编码 320/180 |
| `src/ui/settings-panel.ts` | 修复硬编码 320/180 |
| `src/ui/pause-menu.ts` | 修复硬编码 320/180 |
| `src/ui/inventory-panel.ts` | 修复硬编码 320/180 |
| `src/scenes/battle-scene.ts` | 修复战斗场景坐标（×2 适配 640×360） |
| `src/scenes/overworld-scene.ts` | zoom 3→2、集成 HUD、目标解析、Tab 键、交互提示 |
| `src/entities/npc.ts` | 将 "E" 提示改为 "按 E 对话" |

---

## Task 1: Fix UI Resolution Hardcoding

**Files:**
- Modify: `src/ui/quick-bar.ts:1-5`
- Modify: `src/ui/settings-panel.ts:1-5`
- Modify: `src/ui/pause-menu.ts:1-5`
- Modify: `src/ui/inventory-panel.ts:1-5`

所有四个 UI 文件需要添加 `GAME_WIDTH` / `GAME_HEIGHT` 导入，并替换硬编码的 `320`/`180`/`160`/`90`。

- [ ] **Step 1: Add config import to quick-bar.ts**

在文件顶部（第1行之前）添加：
```typescript
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
```

将第18-19行：
```typescript
const x = (320 - totalWidth) / 2;
const y = 180 - QUICK_SLOT_SIZE - 4;
```
改为：
```typescript
const x = (GAME_WIDTH - totalWidth) / 2;
const y = GAME_HEIGHT - QUICK_SLOT_SIZE - 4;
```

- [ ] **Step 2: Add config import to settings-panel.ts**

在文件顶部添加：
```typescript
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
```

将第32-33行：
```typescript
const x = (320 - PANEL_WIDTH) / 2;
const y = (180 - PANEL_HEIGHT) / 2;
```
改为：
```typescript
const x = (GAME_WIDTH - PANEL_WIDTH) / 2;
const y = (GAME_HEIGHT - PANEL_HEIGHT) / 2;
```

- [ ] **Step 3: Add config import to pause-menu.ts**

在文件顶部添加：
```typescript
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
```

将第59行：
```typescript
this.bg = this.scene.add.rectangle(160, 90, 320, 180, 0x000000, 0.85);
```
改为：
```typescript
this.bg = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85);
```

- [ ] **Step 4: Add config import to inventory-panel.ts**

在文件顶部添加：
```typescript
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
```

将第21-22行：
```typescript
const x = (320 - PANEL_WIDTH) / 2;
const y = (180 - PANEL_HEIGHT) / 2;
```
改为：
```typescript
const x = (GAME_WIDTH - PANEL_WIDTH) / 2;
const y = (GAME_HEIGHT - PANEL_HEIGHT) / 2;
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```
Expected: 无报错

- [ ] **Step 6: Commit**

```bash
git add src/ui/quick-bar.ts src/ui/settings-panel.ts src/ui/pause-menu.ts src/ui/inventory-panel.ts
git commit -m "fix(ui): replace hardcoded 320x180 with GAME_WIDTH/GAME_HEIGHT"
```

---

## Task 2: Fix Battle Scene Layout

**Files:**
- Modify: `src/scenes/battle-scene.ts:264,267,269,341,349-350,404,417`

战斗场景的所有绝对布局坐标都是基于 320×180 设计的，需按 640×360 的比例调整。

- [ ] **Step 1: Update entity display positions**

将第264行：
```typescript
this.createEntityDisplay(player, 60, 90);
```
改为：
```typescript
this.createEntityDisplay(player, 120, 180);
```

将第267行：
```typescript
const startY = 90 - ((enemies.length - 1) * 30) / 2;
```
改为：
```typescript
const startY = 180 - ((enemies.length - 1) * 60) / 2;
```

将第269行：
```typescript
this.createEntityDisplay(enemies[i], 260, startY + i * 30);
```
改为：
```typescript
this.createEntityDisplay(enemies[i], 520, startY + i * 60);
```

- [ ] **Step 2: Update menu and log positions**

将第341行：
```typescript
this.menuContainer = this.add.container(160, 148);
```
改为：
```typescript
this.menuContainer = this.add.container(320, 296);
```

将第349-350行：
```typescript
menuPanel.fillRoundedRect(-80, -40, 160, 88, 6);
menuPanel.strokeRoundedRect(-80, -40, 160, 88, 6);
```
改为：
```typescript
menuPanel.fillRoundedRect(-160, -80, 320, 176, 6);
menuPanel.strokeRoundedRect(-160, -80, 320, 176, 6);
```

将第404行：
```typescript
this.battleLog = this.add.text(160, 10, '', uiTextStyle({
```
改为：
```typescript
this.battleLog = this.add.text(320, 20, '', uiTextStyle({
```

将第417行：
```typescript
const container = this.add.container(40, 155);
```
改为：
```typescript
const container = this.add.container(80, 310);
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```
Expected: 无报错

- [ ] **Step 4: Commit**

```bash
git add src/scenes/battle-scene.ts
git commit -m "fix(battle): scale layout coordinates to 640x360"
```

---

## Task 3: QuestTrackerHUD Logic (TDD)

**Files:**
- Create: `src/ui/quest-tracker-hud.ts`
- Create: `tests/ui/quest-tracker-hud.test.ts`

先写纯逻辑函数和测试，暂不涉及 Phaser 渲染。

- [ ] **Step 1: Write failing test for getQuestDisplayInfo**

创建 `tests/ui/quest-tracker-hud.test.ts`：
```typescript
import { describe, it, expect } from 'vitest';
import { getQuestDisplayInfo, getNextTrackedQuestId } from '../../src/ui/quest-tracker-hud';
import { QuestSystem } from '../../src/systems/quest-system';
import questsData from '../../src/data/quests.json';
import type { QuestData } from '../../src/types/quest';

const mockQuests = questsData as QuestData[];

describe('getQuestDisplayInfo', () => {
  it('should return null when no tracked quest', () => {
    const qs = new QuestSystem(mockQuests);
    const result = getQuestDisplayInfo(qs, null);
    expect(result).toBeNull();
  });

  it('should return quest name and stage description for tracked quest', () => {
    const qs = new QuestSystem(mockQuests);
    qs.acceptQuest('main_chapter1');
    const result = getQuestDisplayInfo(qs, 'main_chapter1');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('初入天剑宗');
    expect(result!.description).toBe('与长老对话');
    expect(result!.statusText).toBe('');
  });

  it('should show status text when target not in current map', () => {
    const qs = new QuestSystem(mockQuests);
    qs.acceptQuest('main_chapter1');
    const result = getQuestDisplayInfo(qs, 'main_chapter1', false);
    expect(result!.statusText).toBe('目标在其它区域');
  });
});

describe('getNextTrackedQuestId', () => {
  it('should cycle through active quests', () => {
    const qs = new QuestSystem(mockQuests);
    qs.acceptQuest('main_chapter1');
    qs.acceptQuest('side_herb_gathering');

    const active = qs.getActiveQuests();
    const next1 = getNextTrackedQuestId(active, qs, null);
    expect(next1).toBe('main_chapter1');

    const next2 = getNextTrackedQuestId(active, qs, 'main_chapter1');
    expect(next2).toBe('side_herb_gathering');

    const next3 = getNextTrackedQuestId(active, qs, 'side_herb_gathering');
    expect(next3).toBe('main_chapter1');
  });

  it('should return null when no active quests', () => {
    const qs = new QuestSystem(mockQuests);
    const result = getNextTrackedQuestId(qs.getActiveQuests(), qs, null);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/ui/quest-tracker-hud.test.ts
```
Expected: FAIL — `getQuestDisplayInfo` / `getNextTrackedQuestId` not defined

- [ ] **Step 3: Implement pure logic functions**

在 `src/ui/quest-tracker-hud.ts` 顶部添加：
```typescript
import type { QuestSystem } from '../systems/quest-system';
import type { ActiveQuest } from '../types/quest';

export interface QuestDisplayInfo {
  name: string;
  description: string;
  statusText: string;
}

export function getQuestDisplayInfo(
  questSystem: QuestSystem,
  trackedQuestId: string | null,
  targetInCurrentMap: boolean = true
): QuestDisplayInfo | null {
  if (!trackedQuestId) return null;

  const questData = questSystem.getQuestData(trackedQuestId);
  const activeQuest = questSystem.getActiveQuests().find(q => q.questId === trackedQuestId);
  if (!questData || !activeQuest) return null;

  const stage = questData.stages[activeQuest.currentStageIndex];
  const description = stage?.description ?? '';

  let statusText = '';
  if (!targetInCurrentMap) {
    statusText = '目标在其它区域';
  }

  return {
    name: questData.name,
    description,
    statusText,
  };
}

export function getNextTrackedQuestId(
  activeQuests: ActiveQuest[],
  questSystem: QuestSystem,
  currentTrackedId: string | null
): string | null {
  if (activeQuests.length === 0) return null;

  // Prefer main quests first, then any active quest
  const sorted = [...activeQuests].sort((a, b) => {
    const qa = questSystem.getQuestData(a.questId);
    const qb = questSystem.getQuestData(b.questId);
    if (qa?.type === 'main' && qb?.type !== 'main') return -1;
    if (qa?.type !== 'main' && qb?.type === 'main') return 1;
    return 0;
  });

  if (!currentTrackedId) return sorted[0].questId;

  const currentIndex = sorted.findIndex(q => q.questId === currentTrackedId);
  if (currentIndex === -1) return sorted[0].questId;

  const nextIndex = (currentIndex + 1) % sorted.length;
  return sorted[nextIndex].questId;
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/ui/quest-tracker-hud.test.ts
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/quest-tracker-hud.ts tests/ui/quest-tracker-hud.test.ts
git commit -m "feat(ui): add QuestTrackerHUD pure logic with tests"
```

---

## Task 4: QuestTrackerHUD Phaser Rendering

**Files:**
- Modify: `src/ui/quest-tracker-hud.ts`

在逻辑函数下方添加 Phaser 包装类，负责创建和管理 GameObjects。

- [ ] **Step 1: Add QuestTrackerHUD class**

在 `src/ui/quest-tracker-hud.ts` 底部追加：
```typescript
import { Scene } from 'phaser';
import { uiTextStyle } from './text-style';
import { GAME_WIDTH } from '../config';

export class QuestTrackerHUD {
  private scene: Scene;
  private questSystem: QuestSystem;
  private trackedQuestId: string | null = null;
  private container!: Phaser.GameObjects.Container;
  private bg!: Phaser.GameObjects.Rectangle;
  private nameText!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private lastSwitchTime = 0;

  constructor(scene: Scene, questSystem: QuestSystem) {
    this.scene = scene;
    this.questSystem = questSystem;
    this.createElements();
  }

  private createElements(): void {
    this.container = this.scene.add.container(GAME_WIDTH - 8, 8);
    this.container.setScrollFactor(0);
    this.container.setDepth(90);

    this.bg = this.scene.add.rectangle(0, 0, 180, 48, 0x000000, 0.75);
    this.bg.setOrigin(1, 0);
    this.bg.setStrokeStyle(1, 0x4a90d9);
    this.container.add(this.bg);

    this.nameText = this.scene.add.text(-172, 4, '', uiTextStyle({
      fontSize: '10px',
      color: '#4a90d9',
    }));
    this.container.add(this.nameText);

    this.descText = this.scene.add.text(-172, 18, '', uiTextStyle({
      fontSize: '8px',
      color: '#cccccc',
    }));
    this.container.add(this.descText);

    this.statusText = this.scene.add.text(-172, 32, '', uiTextStyle({
      fontSize: '7px',
      color: '#888888',
    }));
    this.container.add(this.statusText);
  }

  update(targetInCurrentMap: boolean = true): void {
    const info = getQuestDisplayInfo(this.questSystem, this.trackedQuestId, targetInCurrentMap);
    if (!info) {
      this.nameText.setText('暂无追踪任务');
      this.descText.setText('');
      this.statusText.setText('');
      this.bg.setStrokeStyle(1, 0x666666);
      return;
    }

    this.nameText.setText(info.name);
    this.descText.setText(info.description);
    this.statusText.setText(info.statusText);
    this.bg.setStrokeStyle(1, 0x4a90d9);
  }

  cycleTrackedQuest(): void {
    const now = Date.now();
    if (now - this.lastSwitchTime < 200) return;
    this.lastSwitchTime = now;

    this.trackedQuestId = getNextTrackedQuestId(
      this.questSystem.getActiveQuests(),
      this.questSystem,
      this.trackedQuestId
    );

    // Flash border to indicate switch
    this.bg.setStrokeStyle(2, 0xffffff);
    this.scene.time.delayedCall(150, () => {
      this.bg.setStrokeStyle(1, 0x4a90d9);
    });
  }

  getTrackedQuestId(): string | null {
    return this.trackedQuestId;
  }

  setTrackedQuestId(id: string | null): void {
    this.trackedQuestId = id;
  }

  destroy(): void {
    this.container.destroy();
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```
Expected: 无报错

- [ ] **Step 3: Commit**

```bash
git add src/ui/quest-tracker-hud.ts
git commit -m "feat(ui): add QuestTrackerHUD Phaser rendering"
```

---

## Task 5: DirectionArrow Calculations (TDD)

**Files:**
- Create: `src/ui/direction-arrow.ts`
- Create: `tests/ui/direction-arrow.test.ts`

- [ ] **Step 1: Write failing tests**

创建 `tests/ui/direction-arrow.test.ts`：
```typescript
import { describe, it, expect } from 'vitest';
import { calculateArrowPosition } from '../../src/ui/direction-arrow';

describe('calculateArrowPosition', () => {
  it('should return invisible when target is inside viewport', () => {
    const result = calculateArrowPosition(
      0, 0, 320, 180,   // camera at 0,0, size 320x180
      100, 50,           // target inside
      80, 40             // player
    );
    expect(result.visible).toBe(false);
  });

  it('should point to right edge when target is off-screen to the right', () => {
    const result = calculateArrowPosition(
      0, 0, 320, 180,
      500, 90,           // target far right
      80, 40
    );
    expect(result.visible).toBe(true);
    expect(result.x).toBe(320);
    expect(result.y).toBe(90);
    expect(result.rotation).toBe(0);
    expect(result.color).toBe('#888888'); // far = gray
  });

  it('should point to top edge when target is off-screen above', () => {
    const result = calculateArrowPosition(
      0, 0, 320, 180,
      100, -100,         // target above
      80, 40
    );
    expect(result.visible).toBe(true);
    expect(result.x).toBe(100);
    expect(result.y).toBe(0);
    expect(result.rotation).toBe(-Math.PI / 2);
  });

  it('should use main color when target is close', () => {
    const result = calculateArrowPosition(
      0, 0, 320, 180,
      400, 90,           // target moderately far right
      80, 40
    );
    expect(result.visible).toBe(true);
    expect(result.color).toBe('#4a90d9'); // closer = main color
  });

  it('should return invisible when target coordinates are null', () => {
    const result = calculateArrowPosition(
      0, 0, 320, 180,
      null as any, null as any,
      80, 40
    );
    expect(result.visible).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/ui/direction-arrow.test.ts
```
Expected: FAIL — `calculateArrowPosition` not defined

- [ ] **Step 3: Implement calculateArrowPosition**

创建 `src/ui/direction-arrow.ts`，先放纯函数：
```typescript
export interface ArrowPosition {
  x: number;
  y: number;
  rotation: number;
  visible: boolean;
  color: string;
}

export function calculateArrowPosition(
  cameraX: number,
  cameraY: number,
  cameraWidth: number,
  cameraHeight: number,
  targetX: number | null,
  targetY: number | null,
  playerX: number,
  playerY: number
): ArrowPosition {
  if (targetX === null || targetY === null) {
    return { x: 0, y: 0, rotation: 0, visible: false, color: '#888888' };
  }

  const halfW = cameraWidth / 2;
  const halfH = cameraHeight / 2;
  const centerX = cameraX + halfW;
  const centerY = cameraY + halfH;

  // Check if target is inside viewport
  if (
    targetX >= cameraX &&
    targetX <= cameraX + cameraWidth &&
    targetY >= cameraY &&
    targetY <= cameraY + cameraHeight
  ) {
    return { x: 0, y: 0, rotation: 0, visible: false, color: '#888888' };
  }

  // Calculate direction from screen center to target
  const dx = targetX - centerX;
  const dy = targetY - centerY;
  const angle = Math.atan2(dy, dx);

  // Find intersection with screen rectangle
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  let ix: number, iy: number;

  if (absDx * halfH > absDy * halfW) {
    // Intersects left or right edge
    ix = dx > 0 ? cameraX + cameraWidth : cameraX;
    iy = centerY + dy * (halfW / absDx);
  } else {
    // Intersects top or bottom edge
    ix = centerX + dx * (halfH / absDy);
    iy = dy > 0 ? cameraY + cameraHeight : cameraY;
  }

  // Clamp to screen bounds
  ix = Math.max(cameraX, Math.min(cameraX + cameraWidth, ix));
  iy = Math.max(cameraY, Math.min(cameraY + cameraHeight, iy));

  // Distance-based color
  const dist = Phaser.Math.Distance.Between(playerX, playerY, targetX, targetY);
  const color = dist > 200 ? '#888888' : '#4a90d9';

  return {
    x: ix,
    y: iy,
    rotation: angle,
    visible: true,
    color,
  };
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/ui/direction-arrow.test.ts
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/direction-arrow.ts tests/ui/direction-arrow.test.ts
git commit -m "feat(ui): add DirectionArrow calculations with tests"
```

---

## Task 6: DirectionArrow Phaser Rendering

**Files:**
- Modify: `src/ui/direction-arrow.ts`

- [ ] **Step 1: Add DirectionArrow class**

在 `src/ui/direction-arrow.ts` 底部追加：
```typescript
import { Scene } from 'phaser';

export class DirectionArrow {
  private scene: Scene;
  private arrow!: Phaser.GameObjects.Triangle;

  constructor(scene: Scene) {
    this.scene = scene;
    this.createArrow();
  }

  private createArrow(): void {
    // Create an isosceles triangle pointing right (0° rotation)
    this.arrow = this.scene.add.triangle(0, 0, 0, 6, 12, 0, 0, -6, 0x4a90d9);
    this.arrow.setOrigin(0.5);
    this.arrow.setDepth(100);
    this.arrow.setVisible(false);
  }

  update(
    cameraX: number,
    cameraY: number,
    cameraWidth: number,
    cameraHeight: number,
    targetX: number | null,
    targetY: number | null,
    playerX: number,
    playerY: number
  ): void {
    const pos = calculateArrowPosition(
      cameraX, cameraY, cameraWidth, cameraHeight,
      targetX, targetY, playerX, playerY
    );

    if (!pos.visible) {
      this.arrow.setVisible(false);
      return;
    }

    this.arrow.setPosition(pos.x, pos.y);
    this.arrow.setRotation(pos.rotation);
    this.arrow.setFillStyle(pos.color === '#4a90d9' ? 0x4a90d9 : 0x888888);
    this.arrow.setVisible(true);
  }

  destroy(): void {
    this.arrow.destroy();
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```
Expected: 无报错

- [ ] **Step 3: Commit**

```bash
git add src/ui/direction-arrow.ts
git commit -m "feat(ui): add DirectionArrow Phaser rendering"
```

---

## Task 7: Integrate HUDs into OverworldScene

**Files:**
- Modify: `src/scenes/overworld-scene.ts`

将 QuestTrackerHUD 和 DirectionArrow 接入大地图场景，处理目标坐标解析和 Tab 键切换。

- [ ] **Step 1: Add imports and properties**

在 `overworld-scene.ts` 顶部（现有 import 下方）添加：
```typescript
import { QuestTrackerHUD } from '../ui/quest-tracker-hud';
import { DirectionArrow } from '../ui/direction-arrow';
```

在类属性声明区（`private teleportZones` 附近）添加：
```typescript
private questTrackerHUD!: QuestTrackerHUD;
private directionArrow!: DirectionArrow;
private tabKey!: Phaser.Input.Keyboard.Key;
```

- [ ] **Step 2: Change camera zoom**

将第453行：
```typescript
this.cameras.main.setZoom(3); // was 2
```
改为：
```typescript
this.cameras.main.setZoom(2);
```

- [ ] **Step 3: Instantiate HUDs and Tab key**

在 `create()` 方法中（`setupHUD()` 调用之后或附近）添加：
```typescript
this.questTrackerHUD = new QuestTrackerHUD(this, this.questSystem);
this.directionArrow = new DirectionArrow(this);
this.tabKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
```

- [ ] **Step 4: Add target resolution method**

在 `OverworldScene` 类中添加私有方法：
```typescript
private resolveQuestTargetPosition(targetId: string | null): { x: number; y: number } | null {
  if (!targetId) return null;

  // Try NPCs first
  for (const npc of this.npcs) {
    if (npc.getId() === targetId) {
      return { x: npc.x, y: npc.y };
    }
  }

  // Try map objects (teleports / reach targets)
  for (const obj of this.mapObjects) {
    if (obj.id === targetId) {
      return { x: obj.x + obj.w / 2, y: obj.y + obj.h / 2 };
    }
  }

  return null;
}
```

- [ ] **Step 5: Add HUD update to game loop**

在 `update()` 方法中（现有 update 逻辑之后）添加：
```typescript
// Update quest tracker HUD
const trackedQuestId = this.questTrackerHUD.getTrackedQuestId();
let targetPos: { x: number; y: number } | null = null;
let targetInCurrentMap = true;

if (trackedQuestId) {
  const questData = this.questSystem.getQuestData(trackedQuestId);
  const activeQuest = this.questSystem.getActiveQuests().find(q => q.questId === trackedQuestId);
  if (questData && activeQuest) {
    const stage = questData.stages[activeQuest.currentStageIndex];
    const objective = stage?.objectives.find(o => {
      const progress = activeQuest.objectiveProgress[o.id] ?? 0;
      return progress < o.requiredCount;
    }) ?? stage?.objectives[0];

    if (objective) {
      targetPos = this.resolveQuestTargetPosition(objective.targetId);
      if (!targetPos) {
        targetInCurrentMap = false;
      }
    }
  }
}

this.questTrackerHUD.update(targetInCurrentMap);

// Update direction arrow
if (targetPos) {
  const cam = this.cameras.main;
  this.directionArrow.update(
    cam.worldView.x, cam.worldView.y,
    cam.worldView.width, cam.worldView.height,
    targetPos.x, targetPos.y,
    this.player.x, this.player.y
  );
} else {
  this.directionArrow.update(0, 0, 0, 0, null, null, 0, 0);
}

// Handle Tab key for quest cycling
if (Phaser.Input.Keyboard.JustDown(this.tabKey)) {
  this.questTrackerHUD.cycleTrackedQuest();
}
```

- [ ] **Step 6: Add cleanup in shutdown**

在 `shutdown()` 方法中（`this.teleportHints = []` 之后）添加：
```typescript
this.questTrackerHUD.destroy();
this.directionArrow.destroy();
```

- [ ] **Step 7: Run typecheck**

```bash
npm run typecheck
```
Expected: 无报错

- [ ] **Step 8: Commit**

```bash
git add src/scenes/overworld-scene.ts
git commit -m "feat(overworld): integrate QuestTrackerHUD and DirectionArrow"
```

---

## Task 8: Contextual Interaction Hints

**Files:**
- Modify: `src/entities/npc.ts`
- Modify: `src/scenes/overworld-scene.ts`

- [ ] **Step 1: Update NPC interact prompt**

将 `src/entities/npc.ts` 第71行：
```typescript
const prompt = this.scene.add.text(this.x, this.y - 20, 'E', uiTextStyle({
```
改为：
```typescript
const prompt = this.scene.add.text(this.x, this.y - 20, '按 E 对话', uiTextStyle({
```

- [ ] **Step 2: Remove permanent bottom hint and add fade**

将 `overworld-scene.ts` 中 `setupHUD()` 方法（第463-474行）替换为：
```typescript
private setupHUD(): void {
  const halfW = this.cameras.main.width / 2;
  const halfH = this.cameras.main.height / 2;

  const hintShown = localStorage.getItem('sitc_tutorial_hints_shown');
  if (hintShown) return;

  const hintText = this.add.text(4 - halfW, 4 - halfH, 'WASD/方向键移动  E 交互  B 战斗', uiTextStyle({
    fontSize: '7px',
    color: '#ffffff',
    backgroundColor: '#00000088',
    padding: { x: 2, y: 1 },
  }));
  hintText.setScrollFactor(0);
  hintText.setDepth(10);
  hintText.setName('tutorial-hint');

  this.time.delayedCall(5000, () => {
    this.tweens.add({
      targets: hintText,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        hintText.destroy();
      },
    });
  });

  localStorage.setItem('sitc_tutorial_hints_shown', 'true');
}
```

- [ ] **Step 3: Add teleport contextual prompts**

在 `overworld-scene.ts` 的 `loadMap()` 方法中，在现有的 teleport destination hints 创建代码（第547-570行）之后，添加一个新的 teleport prompt 管理数组和更新逻辑。

在类属性区添加：
```typescript
private teleportPrompts = new Map<string, Phaser.GameObjects.Text>();
```

在 `loadMap()` 的传送点创建循环之后添加：
```typescript
// Create contextual interaction prompts for teleports
this.teleportPrompts.clear();
for (const obj of this.mapObjects) {
  if (obj.type === 'teleport' && obj.id) {
    const zoneKey = obj.id || `teleport-${obj.x}-${obj.y}-${obj.w}-${obj.h}`;
    const zoneState = this.teleportZones.get(zoneKey);
    const cx = obj.x + obj.w / 2;
    const cy = obj.y + obj.h / 2;

    let promptText = '';
    if (zoneState?.status === 'locked') {
      promptText = '需完成任务后解锁';
    } else if (zoneState?.status === 'conditional') {
      promptText = '条件未满足';
    } else {
      const targetName = this.MAP_NAMES[obj.target] ?? obj.target;
      promptText = `按 E 传送至 ${targetName}`;
    }

    const prompt = this.add.text(cx, cy - 28, promptText, uiTextStyle({
      fontSize: '9px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }));
    prompt.setOrigin(0.5);
    prompt.setDepth(50);
    prompt.setAlpha(0);
    prompt.setName(`teleport-prompt-${zoneKey}`);
    this.teleportPrompts.set(zoneKey, prompt);
  }
}
```

- [ ] **Step 4: Update teleport prompts visibility in update loop**

在 `updateTeleportHints()` 方法之后（或内部）添加 teleport prompt 的显隐更新。创建新方法：
```typescript
private updateTeleportPrompts(): void {
  const px = this.player.x;
  const py = this.player.y;
  const FADE_DISTANCE = 64;

  for (const [zoneKey, prompt] of this.teleportPrompts) {
    // Find corresponding map object to get center
    let centerX = 0;
    let centerY = 0;
    for (const obj of this.mapObjects) {
      if (obj.type === 'teleport') {
        const key = obj.id || `teleport-${obj.x}-${obj.y}-${obj.w}-${obj.h}`;
        if (key === zoneKey) {
          centerX = obj.x + obj.w / 2;
          centerY = obj.y + obj.h / 2;
          break;
        }
      }
    }

    const distance = Phaser.Math.Distance.Between(px, py, centerX, centerY);
    const targetAlpha = distance < FADE_DISTANCE ? 1 : 0;
    const deltaAlpha = 0.15;

    if (prompt.alpha < targetAlpha) {
      prompt.setAlpha(Math.min(targetAlpha, prompt.alpha + deltaAlpha));
    } else if (prompt.alpha > targetAlpha) {
      prompt.setAlpha(Math.max(targetAlpha, prompt.alpha - deltaAlpha));
    }
  }
}
```

在 `update()` 方法中调用 `this.updateTeleportPrompts()`（在 `updateTeleportHints()` 之后）。

- [ ] **Step 5: Clean up teleport prompts on map unload**

在 `loadMap()` 开头（第478行 `this.children.list.filter` 之前）添加：
```typescript
// Clean up teleport prompts
for (const prompt of this.teleportPrompts.values()) {
  prompt.destroy();
}
this.teleportPrompts.clear();
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```
Expected: 无报错

- [ ] **Step 7: Commit**

```bash
git add src/entities/npc.ts src/scenes/overworld-scene.ts
git commit -m "feat(overworld): contextual interaction hints and tutorial hint fade"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```
Expected: 所有现有测试通过 + 新增的 quest-tracker-hud 和 direction-arrow 测试通过

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```
Expected: 无类型错误

- [ ] **Step 3: Run lint**

```bash
npm run lint
```
Expected: 无 lint 错误

- [ ] **Step 4: Start dev server and visually verify**

```bash
npm run dev
```

在浏览器中打开游戏，验证：
1. 大地图视野比原来更宽（zoom 2 效果）
2. 暂停菜单、设置面板、背包、快捷栏均居中且尺寸正确
3. 屏幕右上角显示任务追踪面板（默认显示第一个主线任务）
4. 按 Tab 键可切换追踪的任务，边框会闪烁
5. 目标不在视野内时，屏幕边缘出现方向箭头
6. 靠近NPC时显示「按 E 对话」
7. 靠近传送点时显示对应的上下文提示（可用/锁定/条件不足）
8. 首次进入游戏底部提示 5 秒后自动消失
9. 战斗场景布局正常，敌我双方位置合理

- [ ] **Step 5: Commit if all checks pass**

```bash
git add -A
git commit -m "feat(ui): complete UI guidance optimization"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] 分辨率适配：zoom 3→2，所有硬编码修复 → Task 1, 2, 7
- [x] QuestTrackerHUD 右上角面板 → Task 3, 4, 7
- [x] DirectionArrow 屏幕边缘箭头 → Task 5, 6, 7
- [x] Tab 键切换追踪任务 → Task 7
- [x] 目标坐标解析（NPC / mapObjects） → Task 7
- [x] 移除常驻底部提示，改为5秒淡出 → Task 8
- [x] NPC 上下文提示「按 E 对话」 → Task 8
- [x] 传送点上下文提示 → Task 8
- [x] 战斗场景坐标适配 → Task 2

**2. Placeholder scan:**
- [x] 无 "TBD" / "TODO" / "implement later"
- [x] 所有步骤包含完整代码
- [x] 所有测试包含完整断言
- [x] 无 "similar to Task N" 引用

**3. Type consistency:**
- [x] `QuestTrackerHUD.update(targetInCurrentMap)` 签名在 Task 3 逻辑函数和 Task 4 类方法中一致
- [x] `calculateArrowPosition` 参数名和类型在 Task 5 和 Task 6 中一致
- [x] `resolveQuestTargetPosition` 返回类型 `{ x: number; y: number } | null` 在 Task 7 中一致
