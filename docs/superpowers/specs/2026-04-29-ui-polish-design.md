# UI 系统性调整设计文档

## 背景

《云深不知剑》当前 UI 存在四个影响玩家体验的明显问题：

1. 首页（标题画面）除标题外的文字（菜单、副标题）发糊，边缘不清晰。
2. 游戏内主角 sprite 显小，行走动画只有 4 帧/8fps，缺乏步态感，看起来不像在走路。
3. 传送点没有目的地提示，玩家走进隐形区域才知道是传送点。
4. 简单对话（NPC 日常台词）按 E 键偶尔无法关闭对话框。

本文档定义一套纯代码层面的调整方案，不引入新的美术资源或工具链。

---

## 设计目标

- 标题场景所有文字边缘锐利、可读。
- 主角在屏幕上占比更大，行走动画更流畅、更有步态感。
- 传送点有醒目的视觉标识 + 目的地名称提示。
- 简单对话 E 键关闭 100% 可靠，无竞争条件。

---

## 方案概要

采用保守但有效的参数调整策略：
- 小字降低 Phaser Text resolution，避免浏览器过度锐化；同时适度增大字号。
- 提高行走动画帧率，叠加正弦波 Y 轴起伏模拟步态，提升相机 zoom。
- 传送点从绿色方块升级为发光传送阵 + 靠近时显示目的地浮动标签。
- 对话关闭逻辑从"事件回调 + 轮询"双轨改为纯轮询单轨，消除状态竞争。

---

## 模块一：字体清晰度修复

### 问题分析

`uiTextStyle()` 对所有文字统一施加 `resolution: 4`。对于 10px 的小字号中文，Phaser 会让浏览器以 4 倍内部分辨率渲染后再缩回，导致浏览器 sub-pixel 抗锯齿算法过度工作，字边缘发虚、笔画粘连。

### 改动点

#### 1.1 `src/ui/text-style.ts` — 动态 resolution

将固定 `resolution: 4` 改为按字号分级：

| 字号范围 | resolution | 理由 |
|----------|-----------|------|
| >= 16px  | 4         | 大字在高 DPR 屏上需要高分辨率保持锐利 |
| 12-15px  | 2         | 中小字用 2 倍足够，避免过度锐化 |
| < 12px   | 1         | 极小字让浏览器原样渲染，减少算法干扰 |

实现方式：在 `uiTextStyle()` 内部读取传入的 `fontSize`，自动计算并注入对应的 `resolution`。如果调用者显式传了 `resolution`，则尊重调用者覆盖。

#### 1.2 `src/scenes/title-scene.ts` — 字号与描边调整

| 元素 | 当前 | 调整后 |
|------|------|--------|
| 标题 `云深不知剑` | 28px | 保持 28px，加 `stroke: '#000000', strokeThickness: 1` 增加轮廓清晰度 |
| 副标题 | 10px | 12px |
| 菜单项 | 10px | 14px |
| 菜单行间距 | 16px | 20px |

菜单选中态的背景色块 (`#1a3a5a`) 随字号增大同步调整 padding，保持视觉平衡。

### 验收标准

- 标题场景在 `npm run dev` 启动后，菜单文字边缘无发糊、无笔画粘连。
- 在 1920×1080 和 1366×768 两种常见分辨率下文字都清晰可读。

---

## 模块二：Player 行走动画与尺寸

### 问题分析

- 相机 zoom=2，16×24 的 sprite 在屏幕上只有 32×48 物理像素，显小。
- 行走动画 4 帧 @ 8fps，帧间隔 125ms，对于 80px/s 的移动速度来说偏慢，看起来像在滑行。
- 没有上下方向动画，也没有步行时的身体起伏。

### 改动点

#### 2.1 `src/entities/player.ts` — 动画与步态

**帧率提升**：
- `player-walk` 的 `frameRate` 从 `8` 提升到 `12`。

**步态起伏**：
- 新增私有属性 `baseY: number`，在每次 `setPosition` 或 `body.reset` 时同步记录。
- 在 `preUpdate` 中，当 `isMoving = true` 时：
  ```ts
  const bob = Math.sin(this.scene.time.now / 60) * 0.8;
  this.y = this.baseY + bob;
  ```
  当 `isMoving = false` 时，`this.y = this.baseY`，确保站立时回到地面。
- 振幅 0.8px（游戏世界坐标），周期约 377ms，视觉上是一个轻快的步频。

**站立复原**：
- 从移动切换到idle时，如果 `bob` 偏移不为 0，在 100ms 内线性插值回到 `baseY`，避免突兀跳动。

#### 2.2 `src/scenes/overworld-scene.ts` — 相机 zoom

- `setupCamera()` 中 `this.cameras.main.setZoom(2)` 改为 `setZoom(3)`。

#### 2.3 深度排序验证

- zoom 提升不改变 sprite 的 `depth` 逻辑，但需要在调整后在实际地图（如 `gate`、`main_hall`）中走一圈，确认玩家经过树木/障碍物时遮挡关系仍然正确。
- 若出现 `depth` 错乱（如玩家从树上方走过时应该被树遮挡但实际露出来了），微调树的 `depth` 或玩家的 `depth` 偏移量。

### 验收标准

- 主角在屏幕上显示面积比调整前大 50%（48×72 物理像素）。
- 行走时能看到轻微上下浮动，停止后回到原位。
- 在 gate、main_hall、back_mountain 三张地图中行走，遮挡关系无异常。

---

## 模块三：传送点视觉提示

### 问题分析

当前传送区域在 `MapLoader` 中只渲染为一个绿色半透明矩形（`0x00ff00, 0.3`），或者依赖 `teleport_marker` 纹理。玩家只有走进区域被传送后才知道这是传送点。

### 改动点

#### 3.1 `src/scenes/map-loader.ts` — 传送阵图形

当对象类型为 `teleport` 时，不再画绿色方块，改为绘制"传送阵"：

1. **底层椭圆**：宽 20px、高 12px，填充色 `#4a90d9`，透明度 0.4，居中于对象区域。
2. **上层菱形**：宽 8px、高 8px，旋转 45°，填充色 `#88ccff`，透明度 0.8，居中于椭圆上方。
3. **浮动动画**：菱形叠加正弦波 Y 轴偏移，周期 1.5s，振幅 2px，营造呼吸感。

这些图形元素的名字统一设为 `'teleport-visual'`，方便后续清理。

#### 3.2 `src/scenes/overworld-scene.ts` — 目的地浮动标签

新增一个 `teleportHints: Phaser.GameObjects.Text[]` 数组，在 `loadMap()` 时根据 `mapObjects` 中类型为 `teleport` 的对象生成对应的提示文本。

**提示文本行为**：
- 初始状态：`alpha = 0`（不可见）。
- 每帧在 `update()` 中调用私有方法 `updateTeleportHints()`，检测玩家与每个传送点中心的距离。
- 距离 < 64px 时：`alpha` 在 150ms 内淡入到 1。
- 距离 >= 64px 时：`alpha` 在 150ms 内淡出到 0。
- 文本内容：`→ ${目的地名称}`，使用 `uiTextStyle` 14px，`#88ccff` 颜色，带 `stroke: '#000000', strokeThickness: 2, strokeAlpha: 0.6` 确保在任何背景上可读。
- 文本位置：传送阵中心上方 16px，使用世界坐标，自然随场景滚动。
- 文本 `depth` 设为 10，确保显示在地面和传送阵之上。

**目的地名称映射表**（写在 `OverworldScene` 中）：
```ts
private readonly MAP_NAMES: Record<string, string> = {
  gate: '天剑宗山门',
  main_hall: '天剑殿',
  disciples_housing: '弟子居所',
  meditation_room: '静心阁',
  back_mountain: '后山',
  yunlai_town: '云来镇',
  library: '万卷楼',
};
```

**清理逻辑**：`loadMap()` 开头销毁上一轮地图的 teleport hints。

### 验收标准

- 每张地图的传送点都有一个蓝色发光传送阵标识。
- 玩家靠近传送点（约 2-3 个身位）时，传送阵上方显示 `→ 目的地名称`。
- 玩家离开后提示消失。
- 场景切换（如从 gate 传送到 main_hall）后，旧场景的提示被正确清理，新场景的提示正确生成。

---

## 模块四：简单对话 E 键关闭 Bug 修复

### 问题分析

当前 `OverworldScene` 对 E 键的处理有两条并行路径：

1. **事件驱动**：`create()` 中 `this.eKey.on('down', () => this.advanceDialogueFromKey())`
2. **轮询驱动**：`update()` 中 `if (this.isDialogueOpen) { this.checkDialogueClose(); ... }`

两者都试图关闭简单对话，且各自维护自己的 `eKeyWasDown` 状态副本。在某些帧顺序下（例如事件回调先于 `update()` 执行），`advanceDialogueFromKey()` 关闭了对话并将 `isDialogueOpen` 设为 `false`，但 `update()` 随后进入 `checkDialogueClose()` 时，`eKeyWasDown` 还是上一帧的旧值，导致 `justPressed` 计算错误；或者 conversely，事件和轮询同时触发导致 `closeDialogue()` 被调用两次，虽然幂等但状态混乱。

### 改动点

#### 4.1 `src/scenes/overworld-scene.ts` — 统一为单一路径

**步骤 1**：删除事件回调。
在 `create()` 中删掉这一行：
```ts
this.eKey.on('down', () => this.advanceDialogueFromKey());
```

**步骤 2**：删除 `advanceDialogueFromKey()` 方法。
事件回调删掉后，该方法不再有任何调用点。`update()` 中复杂对话的输入已由 `this.dialoguePanel.handleInput()` 直接处理。直接删除整个方法，避免死代码。

**步骤 3**：给 `closeDialogue()` 加 guard。
```ts
private closeDialogue(): void {
  if (!this.isDialogueOpen) return;
  // ... 原有逻辑
}
```

**步骤 4**：确认 `update()` 轮询逻辑正确。
当前 `update()` 中的简单对话分支：
```ts
if (this.isDialogueOpen) {
  this.checkDialogueClose();
  this.eKeyWasDown = this.eKey.isDown;
  this.bKeyWasDown = this.bKey.isDown;
  return;
}
```
这个逻辑是正确的——每帧检测 E 键是否从松开变为按下，如果是就关闭对话，然后更新状态。单一路径后没有竞争条件。

#### 4.2 边界情况处理

- **触摸交互**：`touchControls.onInteract` 中已有对简单对话的关闭逻辑：
  ```ts
  if (this.isDialogueOpen && !this.dialoguePanel?.isVisible()) {
    this.closeDialogue();
    return;
  }
  ```
  这条路径保留，与键盘轮询不冲突（触摸和键盘不会同时触发）。

- **复杂对话期间按 E**：复杂对话由 `dialoguePanel.handleInput()` 内部管理 E 键状态，与简单对话完全隔离，不受影响。

### 验收标准

- 打开任意 NPC 的简单对话（日常台词），按 E 键一次立即关闭。
- 连续快速按 E 键不会导致崩溃或重复关闭异常。
- 触摸设备的交互按钮也能正常关闭简单对话。
- 复杂对话（分支对话）的 E 键/空格继续、选项选择不受影响。

---

## 文件改动清单

| 文件 | 改动类型 | 涉及模块 |
|------|----------|----------|
| `src/ui/text-style.ts` | 修改 | 模块一 |
| `src/scenes/title-scene.ts` | 修改 | 模块一 |
| `src/entities/player.ts` | 修改 | 模块二 |
| `src/scenes/overworld-scene.ts` | 修改 | 模块二、三、四 |
| `src/scenes/map-loader.ts` | 修改 | 模块三 |

---

## 不涉及的范畴（YAGNI）

- 不引入 BitmapFont 或任何新的字体工具链。
- 不重画 player sprite 或 NPC sprite。
- 不添加 8 方向行走动画（仍只用左右翻转 + 上下复用）。
- 不修改对话数据格式或对话系统核心逻辑。
- 不改动战斗系统、背包系统、任务系统。

---

## 风险与回退

| 风险 | 缓解措施 |
|------|----------|
| zoom 3 导致某些地图边缘露出空白 | 验证每张地图的 `worldWidth/Height` 在 zoom 3 下仍然大于相机视口；若不足，临时扩大地图边界或保持 zoom 2 |
| 步态起伏与某些地形（如桥梁、台阶）穿插 | 步态振幅仅 0.8px，视觉上几乎不会穿帮；若有问题可降为 0.5px |
| 传送阵图形与现有 `teleport_marker` 纹理重叠 | `createVisualObjects` 中先检查是否已有纹理，若有则跳过程序绘制，仅显示标签 |

---

*设计文档版本：v1.0*  
*日期：2026-04-29*
