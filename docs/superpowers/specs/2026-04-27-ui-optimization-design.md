# UI 优化设计文档

## 背景

当前游戏 UI 存在三个问题：
1. **字体模糊**：首页和战斗画面的文字在浏览器中显示模糊，特别是小字号（6px-7px）内容
2. **画面不随浏览器缩放**：游戏画面不会随浏览器窗口大小变化而自适应
3. **移动端触摸控件位置偏移**：Android Chrome 上摇杆和按钮显示位置偏移，部分被裁切

## 方案选择

采用**最小改动方案**（方案 A）：
- FIT 缩放模式 + 窗口自适应
- 提升文字渲染分辨率 + 调整最小字号
- 触摸控件改为相对坐标定位

---

## 设计一：缩放适配系统

### 修改文件

- `src/config.ts`
- `src/scenes/boot-scene.ts`（新增 resize 监听）

### 详细设计

将 Phaser 缩放模式从 `WIDTH_CONTROLS_HEIGHT` 改为 `FIT`，使游戏始终保持 16:9 比例：

```ts
// src/config.ts
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  min: { width: 320, height: 180 },
  max: { width: 2560, height: 1440 },
},
```

在 `BootScene` 中监听 `resize` 事件：

```ts
this.scale.on('resize', this.onResize, this);
```

### 效果

- 窗口变大：游戏等比放大，不足部分黑边填充
- 窗口变小：游戏等比缩小，不足部分黑边填充
- 始终保持 16:9 比例，无拉伸变形

---

## 设计二：字体清晰度优化

### 修改文件

- `src/ui/text-style.ts`
- `src/scenes/battle-scene.ts`

### 详细设计

**1. 提升渲染分辨率**

```ts
// src/ui/text-style.ts
export const UI_TEXT_RESOLUTION = 4; // 从 2 提升到 4
```

Canvas Text 以 4 倍分辨率渲染后再缩放回游戏画面，边缘更锐利。

**2. 调整最小字号**

| 内容 | 当前字号 | 调整后 | 位置 |
|------|---------|--------|------|
| 敌人名称 / 属性 | 7px | 8px | battle-scene.ts |
| HP/MP 数值 | 6px | 8px | battle-scene.ts |
| Buff 图标文字 | 6px | 8px | battle-scene.ts |
| 战斗日志 | 8px | 9px | battle-scene.ts |
| 菜单选项 | 8px | 9px | battle-scene.ts |
| 剑意标签 / 数值 | 7px | 8px | battle-scene.ts |

title-scene.ts 中 10px 以上文字保持不变。

### 效果

- 6px 中文字从极限模糊变为 8px 清晰可读
- resolution=4 使文字边缘渲染更锐利
- 配合 FIT 缩放，在各种窗口尺寸下保持可读性

---

## 设计三：触摸控件定位修复

### 修改文件

- `src/ui/touch-controls.ts`

### 详细设计

**核心思路**：触摸控件使用 `setScrollFactor(0)` 固定到屏幕，但坐标计算改为相对于游戏可见画面的百分比，而非固定像素值。

**坐标调整**：

```ts
// 摇杆基座：画面左下角，留出边距
const jBaseX = Math.round(W * 0.08);   // 从固定 25px 改为相对 8% 宽度
const jBaseY = Math.round(H * 0.88);  // 保持 88% 高度

// 按钮组：画面右下角，水平排列
const btnX   = Math.round(W * 0.85);  // 从 78% 改为 85%，更靠右避免被裁切
const btnY   = Math.round(H * 0.88);  // 与摇杆同高
const btnGap = Math.round(W * 0.06);  // 间距基于宽度，横竖屏更一致
```

**额外改进**：
- 监听 `resize` 事件，窗口变化时重新计算控件位置
- 最小边距 8px，确保控件不会贴到画面边缘
- 按钮标签字号根据实际渲染尺寸自动调整

### 效果

- 横屏/竖屏/各种分辨率下，控件始终在游戏可见区域内
- 不会被裁切或偏移到画面外
- 窗口大小变化时自动重新定位

---

## 依赖与风险

### 无新增依赖

所有修改基于现有 Phaser 3 API，不引入新库。

### 风险

| 风险 | 缓解措施 |
|------|---------|
| resolution=4 增加内存占用 | 文字对象数量有限，影响可忽略 |
| 字号增大导致 UI 布局微变 | 战斗场景预留了足够空间，8px→9px 变化在 2px 以内 |
| FIT 模式下黑边区域的颜色 | 与背景色 `#1a1a2e` 一致，视觉上不突兀 |

---

## 测试要点

1. **缩放适配**：在 PC Chrome 中拖拽窗口大小，确认画面始终居中、等比缩放、无变形
2. **字体清晰**：战斗场景中确认敌人名称、HP 数值、日志文字清晰可读
3. **触摸控件**：在 Android Chrome 中确认摇杆和按钮位置正确、不被裁切
4. **resize 响应**：旋转手机屏幕（横竖屏切换），确认控件重新定位正确
