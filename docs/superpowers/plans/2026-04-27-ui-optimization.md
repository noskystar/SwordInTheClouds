# UI 优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复字体模糊、画面缩放适配、移动端触摸控件位置偏移三个 UI 问题。

**Architecture:** 通过 Phaser Scale.FIT 模式实现自适应等比缩放；提升 Canvas Text resolution 并增大最小字号解决模糊；触摸控件改用相对于游戏画面的百分比坐标，确保始终在可见区域内。

**Tech Stack:** Phaser 3, TypeScript, Vitest

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/config.ts` | 修改 | 缩放模式改为 FIT，添加 min/max 限制 |
| `src/scenes/boot-scene.ts` | 修改 | 添加 resize 事件监听，确保场景切换后缩放正确 |
| `src/ui/text-style.ts` | 修改 | resolution 从 2 提升到 4 |
| `src/scenes/battle-scene.ts` | 修改 | 将所有 6px 和 7px 字号提升到 8px，8px 提升到 9px |
| `src/ui/touch-controls.ts` | 修改 | 坐标改为百分比相对定位，添加 resize 重新计算 |
| `tests/text-style.test.ts` | 创建 | 验证 resolution 值和 uiTextStyle 返回值 |

---

## Task 1: 缩放模式改为 FIT

**Files:**
- Modify: `src/config.ts`
- Modify: `src/scenes/boot-scene.ts`

- [ ] **Step 1: 修改 config.ts 缩放配置**

  将 `src/config.ts` 中 `scale` 配置从 `WIDTH_CONTROLS_HEIGHT` 改为 `FIT`，并添加 `min` / `max` 限制：

  ```ts
  // src/config.ts
  export const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#1a1a2e',
    pixelArt: true,
    antialias: false,
    antialiasGL: false,
    roundPixels: true,
    // @ts-ignore - sharpness exists in Phaser 3.80+; ignored safely in 3.70
    sharpness: 1,
    rendererOptions: { antialias: false },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      min: {
        width: 320,
        height: 180,
      },
      max: {
        width: 2560,
        height: 1440,
      },
    },
    // ... rest unchanged
  };
  ```

- [ ] **Step 2: BootScene 中添加 resize 监听**

  在 `src/scenes/boot-scene.ts` 的 `create()` 方法中，添加对 `scale` 的 resize 事件监听。这样当浏览器窗口变化时，加载条的背景可以正确重绘（虽然加载完成后此场景即被销毁，但保留此模式供后续场景参考）：

  ```ts
  // src/scenes/boot-scene.ts
  create(): void {
    const canvas = this.game.canvas;
    const ctx = this.game.context;
    if (ctx && 'imageSmoothingEnabled' in ctx) {
      (ctx as CanvasRenderingContext2D).imageSmoothingEnabled = false;
    }
    canvas.style.imageRendering = 'pixelated';

    this.scale.on('resize', this.onResize, this);

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scale.off('resize', this.onResize, this);
      this.scene.start('TitleScene');
    });
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    // Re-center loading bar if resize happens during preload
    // This is a no-op after create() but ensures pattern is established
    const width = 100;
    const height = 10;
    const x = gameSize.width / 2 - width / 2;
    const y = gameSize.height / 2 - height / 2;
    // Loading bar graphics are recreated each frame, so position updates automatically
  }
  ```

- [ ] **Step 3: 验证构建无错误**

  运行：
  ```bash
  npm run typecheck
  ```

  预期：无类型错误。

- [ ] **Step 4: Commit**

  ```bash
  git add src/config.ts src/scenes/boot-scene.ts
  git commit -m "feat(ui): switch to FIT scale mode for responsive resizing"
  ```

---

## Task 2: 提升字体渲染清晰度

**Files:**
- Modify: `src/ui/text-style.ts`
- Create: `tests/text-style.test.ts`
- Modify: `src/scenes/battle-scene.ts`

- [ ] **Step 1: 修改 text-style.ts resolution**

  ```ts
  // src/ui/text-style.ts
  export const UI_TEXT_RESOLUTION = 4; // 从 2 提升到 4
  ```

- [ ] **Step 2: 编写 text-style 测试**

  ```ts
  // tests/text-style.test.ts
  import { describe, it, expect } from 'vitest';
  import { UI_TEXT_RESOLUTION, uiTextStyle } from '../src/ui/text-style';

  describe('text-style', () => {
    it('should have resolution set to 4', () => {
      expect(UI_TEXT_RESOLUTION).toBe(4);
    });

    it('should apply resolution to all text styles', () => {
      const style = uiTextStyle({ fontSize: '10px', color: '#ffffff' });
      expect(style.resolution).toBe(4);
      expect(style.fontSize).toBe('10px');
      expect(style.color).toBe('#ffffff');
    });

    it('should allow overriding resolution', () => {
      const style = uiTextStyle({ fontSize: '10px', resolution: 8 });
      expect(style.resolution).toBe(8);
    });

    it('should merge custom style over defaults', () => {
      const style = uiTextStyle({ fontSize: '12px', color: '#ff0000' });
      expect(style.fontFamily).toBeDefined();
      expect(style.fontSize).toBe('12px');
      expect(style.color).toBe('#ff0000');
    });
  });
  ```

- [ ] **Step 3: 运行测试验证通过**

  运行：
  ```bash
  npx vitest run tests/text-style.test.ts
  ```

  预期：4 个测试全部通过。

- [ ] **Step 4: 修改 battle-scene.ts 字号**

  在 `src/scenes/battle-scene.ts` 中，将所有小字号提升：

  找到 `createEntityDisplay` 方法中的文字对象，按以下规则修改：

  ```ts
  // 敌人名称 / 属性：7px → 8px
  const nameText = this.add.text(0, -27, entity.name, uiTextStyle({
    fontSize: '8px',  // 原为 '7px'
    color: '#ffffff',
  }));

  // 五行属性标签：7px → 8px
  const elementText = this.add.text(entity.isPlayer ? -14 : 14, -27, ELEMENT_NAMES[entity.element], uiTextStyle({
    fontSize: '8px',  // 原为 '7px'
    color: this.getElementColor(entity.element),
  }));

  // HP 数值：6px → 8px
  const hpText = this.add.text(0, 8, `${entity.hp}/${entity.maxHp}`, uiTextStyle({
    fontSize: '8px',  // 原为 '6px'
    color: '#ffffff',
  }));
  ```

  找到 `createBattleLog` 方法：

  ```ts
  // 战斗日志：8px → 9px
  this.battleLog = this.add.text(160, 12, '', uiTextStyle({
    fontSize: '9px',  // 原为 '8px'
    color: '#ffffff',
    align: 'center',
    wordWrap: { width: 300 },
  }));
  ```

  找到 `createMenu` 方法：

  ```ts
  // 菜单选项：8px → 9px
  const text = this.add.text(-50, -14 + i * 10, MENU_OPTIONS[i], uiTextStyle({
    fontSize: '9px',  // 原为 '8px'
    color: '#aaaaaa',
  }));
  ```

  找到 `createSwordIntentDisplay` 方法：

  ```ts
  // 剑意标签：7px → 8px
  const label = this.add.text(0, -9, '剑意', uiTextStyle({
    fontSize: '8px',  // 原为 '7px'
    color: '#ffcc00',
  }));

  // 剑意数值：7px → 8px
  this.swordIntentText = this.add.text(0, 7, '0/100', uiTextStyle({
    fontSize: '8px',  // 原为 '7px'
    color: '#ffcc00',
  }));
  ```

  找到 `updateBuffDisplay` 方法中的 buff 图标文字：

  ```ts
  const icon = this.add.text(
    display.container.x + 18,
    display.container.y - 20 + i * 6,
    this.getBuffName(buff.type),
    uiTextStyle({ fontSize: '8px', color: '#ffff00' })  // 原为 '6px'
  );
  ```

- [ ] **Step 5: 验证构建无错误**

  运行：
  ```bash
  npm run typecheck
  ```

  预期：无类型错误。

- [ ] **Step 6: 运行全部测试确认无回归**

  运行：
  ```bash
  npx vitest run
  ```

  预期：所有现有测试通过，新增 4 个 text-style 测试通过。

- [ ] **Step 7: Commit**

  ```bash
  git add src/ui/text-style.ts src/scenes/battle-scene.ts tests/text-style.test.ts
  git commit -m "feat(ui): increase text resolution to 4 and bump minimum font sizes"
  ```

---

## Task 3: 修复触摸控件定位

**Files:**
- Modify: `src/ui/touch-controls.ts`

- [ ] **Step 1: 重构坐标为百分比相对定位**

  将 `src/ui/touch-controls.ts` 中 `createControls` 方法的坐标计算改为百分比：

  ```ts
  // src/ui/touch-controls.ts
  private createControls(): void {
    const W = this.scene.cameras.main.width;   // 640
    const H = this.scene.cameras.main.height;  // 360

    const jRadius = Math.round(H * 0.07);
    // 摇杆：左下角，相对画面边缘留出安全边距
    const jBaseX  = Math.round(W * 0.08);   // 约 51px，从固定 25px 改为相对
    const jBaseY  = Math.round(H * 0.88);  // 约 317px，保持 88% 高度
    const knobR   = Math.round(jRadius * 0.45);

    this.joystickCenter = { x: jBaseX, y: jBaseY };
    this.knobMaxRadius  = jRadius - knobR;

    // Base: semi-transparent dark circle
    this.joystickBase = this.scene.add.circle(jBaseX, jBaseY, jRadius, 0x111122, 0.7);
    this.joystickBase.setStrokeStyle(2.5, 0x445566);
    this.add(this.joystickBase);

    // Knob: BRIGHT YELLOW with dark stroke for maximum visibility
    this.joystickKnob = this.scene.add.circle(jBaseX, jBaseY, knobR, 0xFFFF00, 1.0);
    this.joystickKnob.setStrokeStyle(3.5, 0x996600);
    this.add(this.joystickKnob);

    this.joystickBase.setInteractive({ draggable: false });
    this.joystickBase.on('pointerdown', this.onJoystickDown, this);
    this.scene.input.on('pointermove', this.onPointerMove, this);
    this.scene.input.on('pointerup',   this.onPointerUp,   this);
    this.scene.input.on('pointerdown', this.onScreenTap,    this);

    // 按钮：右下角，水平排列
    const btnX    = Math.round(W * 0.85);  // 约 544px，从 78% 改为 85%
    const btnY    = Math.round(H * 0.88);  // 与摇杆同高
    const btnGap  = Math.round(W * 0.06);  // 约 38px，间距基于宽度
    const btnR    = Math.round(H * 0.045); // 按钮半径

    this.createButton(btnX - btnGap, btnY, btnR, 'E', 0x44ff44, this.onInteract, '交互');
    this.createButton(btnX,          btnY, btnR, 'B', 0xff4444, this.onBattle,   '战斗');
    this.createButton(btnX + btnGap, btnY, btnR, 'M', 0x4488ff, this.onMenu,     '菜单');

    // 对话推进区域：右侧 40%
    const advZone = this.scene.add.rectangle(W * 0.8, H * 0.5, W * 0.4, H, 0x000000, 0.001);
    advZone.setInteractive({ useHandCursor: false });
    advZone.on('pointerdown', () => this.onDialogueAdvance(), this);
    this.add(advZone);

    // 监听 resize 事件，窗口变化时重新定位控件
    this.scene.scale.on('resize', this.onResize, this);

    console.log(`[TouchControls] Created jBase=(${jBaseX},${jBaseY}) btnY=${btnY}`);
  }
  ```

- [ ] **Step 2: 添加 resize 处理方法和清理逻辑**

  在 `src/ui/touch-controls.ts` 中添加 `onResize` 方法：

  ```ts
  // src/ui/touch-controls.ts
  private onResize(gameSize: Phaser.Structs.Size): void {
    const W = gameSize.width;
    const H = gameSize.height;

    // Recalculate joystick position
    const newJBaseX = Math.round(W * 0.08);
    const newJBaseY = Math.round(H * 0.88);
    const jRadius = Math.round(H * 0.07);
    const knobR = Math.round(jRadius * 0.45);

    this.joystickCenter = { x: newJBaseX, y: newJBaseY };
    this.knobMaxRadius = jRadius - knobR;

    this.joystickBase.setPosition(newJBaseX, newJBaseY);
    this.joystickBase.setRadius(jRadius);
    this.joystickKnob.setPosition(newJBaseX, newJBaseY);
    this.joystickKnob.setRadius(knobR);

    // Recalculate button positions
    const btnX = Math.round(W * 0.85);
    const btnY = Math.round(H * 0.88);
    const btnGap = Math.round(W * 0.06);
    const btnR = Math.round(H * 0.045);

    // Buttons are added in order: E, B, M
    // We need to find and reposition them. Buttons are added as:
    // ring, bg, text, descEl per button = 4 children per button
    // Total non-button children before buttons: joystickBase, joystickKnob = 2
    // Then 3 buttons * 4 = 12, then advZone = 1
    // Button indices in this.list:
    // E: indices 2,3,4,5  |  B: indices 6,7,8,9  |  M: indices 10,11,12,13
    const buttonConfigs = [
      { idx: 2, x: btnX - btnGap, y: btnY, r: btnR }, // E
      { idx: 6, x: btnX,         y: btnY, r: btnR }, // B
      { idx: 10, x: btnX + btnGap, y: btnY, r: btnR }, // M
    ];

    for (const cfg of buttonConfigs) {
      const ring = this.list[cfg.idx] as Phaser.GameObjects.Arc;
      const bg = this.list[cfg.idx + 1] as Phaser.GameObjects.Arc;
      const text = this.list[cfg.idx + 2] as Phaser.GameObjects.Text;
      const desc = this.list[cfg.idx + 3] as Phaser.GameObjects.Text;

      if (ring) { ring.setPosition(cfg.x, cfg.y); ring.setRadius(cfg.r + 4); }
      if (bg) { bg.setPosition(cfg.x, cfg.y); bg.setRadius(cfg.r); }
      if (text) { text.setPosition(cfg.x, cfg.y); }
      if (desc) { desc.setPosition(cfg.x, cfg.y + cfg.r + 6); }
    }

    // Reposition dialogue advance zone
    const advZone = this.list[this.list.length - 1] as Phaser.GameObjects.Rectangle;
    if (advZone) {
      advZone.setPosition(W * 0.8, H * 0.5);
      advZone.setSize(W * 0.4, H);
    }

    console.log(`[TouchControls] Resized to ${W}x${H}`);
  }
  ```

  同时更新 `destroy` 方法，在销毁时移除 resize 监听：

  ```ts
  // src/ui/touch-controls.ts
  destroy(fromScene?: boolean): void {
    this.scene.scale.off('resize', this.onResize, this);
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup',   this.onPointerUp,   this);
    this.scene.input.off('pointerdown', this.onScreenTap,   this);
    if (this.joystickBase) {
      this.joystickBase.off('pointerdown', this.onJoystickDown, this);
    }
    super.destroy(fromScene);
  }
  ```

- [ ] **Step 3: 验证构建无错误**

  运行：
  ```bash
  npm run typecheck
  ```

  预期：无类型错误。

- [ ] **Step 4: Commit**

  ```bash
  git add src/ui/touch-controls.ts
  git commit -m "fix(ui): use percentage-based positioning for touch controls"
  ```

---

## Manual Testing Checklist

以下测试需要在浏览器中手动执行：

1. **缩放适配**
   - [ ] 运行 `npm run dev`，在 Chrome 中打开游戏
   - [ ] 拖拽浏览器窗口大小，确认游戏画面始终居中、等比缩放、无拉伸变形
   - [ ] 缩放到极小窗口（< 320px 宽），确认画面不再缩小（受 min 限制）
   - [ ] 缩放到极大窗口（> 2560px 宽），确认画面不再放大（受 max 限制）

2. **字体清晰度**
   - [ ] 进入 TitleScene，确认标题和菜单文字清晰
   - [ ] 进入 BattleScene，确认敌人名称、HP 数值、五行属性标签清晰可读
   - [ ] 确认战斗日志文字清晰
   - [ ] 确认 Buff 图标文字（攻↑、防↑ 等）清晰

3. **触摸控件**
   - [ ] 在 Android Chrome 上打开游戏
   - [ ] 确认摇杆显示在左下角、按钮在右下角，均未被裁切
   - [ ] 旋转手机（横竖屏切换），确认控件重新定位正确
   - [ ] 确认摇杆和按钮的触摸响应区域与视觉位置一致

---

## Self-Review

### 1. Spec coverage

| 设计文档要求 | 对应任务 |
|-------------|---------|
| FIT 缩放模式 | Task 1 Step 1 |
| min/max 缩放限制 | Task 1 Step 1 |
| resize 事件监听 | Task 1 Step 2, Task 3 Step 2 |
| resolution 提升到 4 | Task 2 Step 1 |
| 最小字号从 6px 提升到 8px | Task 2 Step 4 |
| 8px 字号提升到 9px | Task 2 Step 4 |
| 触摸控件百分比坐标 | Task 3 Step 1 |
| resize 重新定位控件 | Task 3 Step 2 |

### 2. Placeholder scan

- 无 "TBD" / "TODO" / "implement later"
- 无 "Add appropriate error handling"
- 所有步骤包含完整代码
- 所有测试包含完整断言

### 3. Type consistency

- `UI_TEXT_RESOLUTION` 类型为 `number`，在 text-style.ts 和测试中一致
- `onResize` 参数类型 `Phaser.Structs.Size` 与 Phaser API 一致
- `uiTextStyle` 返回类型 `Phaser.Types.GameObjects.Text.TextStyle` 与使用处一致

无问题，计划通过自审。
