# UI 体验优化设计文档

## 概述

修复四个影响游戏体验的 UI/渲染问题：

1. **对话框覆盖半个屏幕** — 当前 `PANEL_HEIGHT_RATIO = 0.40`，在 640×360 分辨率下占 144px，遮挡大量画面。
2. **人物显示模糊** — `NPC.setDisplaySize(16, 16)` 强制缩放任意纹理，非整数倍缩放破坏像素锐利度。
3. **传送门无状态提示** — 走进即传，无法区分可用/锁定/条件传送门。
4. **传送黑屏/卡死** — `transitionToScene` 直接切场景，目标地图未实装时 Phaser 初始化崩溃。

---

## 模块一：对话框重设计（DialoguePanel）

### 目标

改为底部居中固定条幅，类似经典 JRPG 对话框。高度固定比例 + 上限封顶，文字自适应字号确保不溢出。

### 设计参数

| 属性 | 值 | 说明 |
|------|-----|------|
| 面板高度 | `Math.min(height * 0.24, 100)` | 比例 0.24，上限 100px |
| 面板宽度 | `Math.min(width * 0.84, 540)` | 比例 0.84，上限 540px |
| 水平位置 | `(width - panelW) / 2` | 屏幕居中 |
| 垂直位置 | `height - panelH - margin` | 底部留边 |
| 内边距 | 8px | 文字与边框留白 |
| 圆角 | 4px | 或优先使用 `ui_dialogue_box` 纹理 |
| 描边 | 1px `#4a4a6a` | 与现有色调一致 |
| 说话人名称 | 10–12px，黄色 `#ffff00` | 左上角 |
| 正文 | 自适应 8–12px | 根据文本长度和可用宽度动态选最佳字号 |
| 选项 | 底部区域 | 最多 4 个，超出时缩小间距 |
| 继续提示 | 右下角 | "▶ 空格/E"，灰色 `#888888` |

### 关键改动

1. **删除动态膨胀**：移除 `PANEL_HEIGHT_RATIO = 0.40` 和 `maxH = height * 0.55`。面板高度固定为上述公式，不再随内容增长。
2. **保留自适应字号逻辑**：复用 `computeAndApplyLayout` 中的 for 循环尝试逻辑（从最大字号向下试，直到文本 fit 或降到 7px），但可用文本高度上限改为固定面板高度减去 padding、名称区、选项区。
3. **保持坐标映射**：所有 UI 元素继续使用 `toWorldX/toWorldY` 映射到摄像机世界坐标，`scrollFactor = 0`，确保 zoom 变化时 UI 位置正确。
4. **接口零变更**：`showDialogue(node, options)`、`handleInput()`、`destroy()` 签名不变，OverworldScene 调用方无需修改。

---

## 模块二：人物渲染统一（NPC / Player）

### 目标

去掉 `setDisplaySize` 强制缩放，改为按纹理原生尺寸整数倍显示，保证像素完美。

### 当前问题根因

```typescript
// src/entities/npc.ts:28
this.setDisplaySize(16, 16);
```

`setDisplaySize(w, h)` 直接指定最终像素尺寸。当原图不是 16×16 时，缩放比例为非整数（如 0.67、1.33），`pixelArt: true` 只能防纹理过滤，无法防几何缩放模糊。

### 改动方案

替换为基于纹理尺寸的整数倍缩放：

```typescript
const texture = this.scene.textures.get(config.texture);
const frame = texture.get(config.texture);
if (frame) {
  const srcH = frame.height;
  const targetH = 24; // 与玩家统一显示高度
  const rawScale = targetH / srcH;
  // 取最接近的 0.5 倍数，保证整数倍或半整数倍
  const scale = Math.max(0.5, Math.round(rawScale * 2) / 2);
  this.setScale(scale);
}
```

### 影响分析

| 资源 | 原图尺寸 | 缩放后 | 结果 |
|------|----------|--------|------|
| `player_sprite` | 16×24 | `setScale(1)` | 16×24，清晰 |
| NPC idle 精灵 | 16×24 | `setScale(1)` | 16×24，清晰 |
| NPC idle 精灵 | 32×48 | `setScale(0.5)` | 16×24，清晰 |

NPC 行走精灵表（512×512）当前不被 NPC 类使用，不受影响。

### Physics Body

Body size 保持 `12×12`，offset `2×8`，与显示尺寸解耦，无需调整。

---

## 模块三：传送门状态机 + 场景切换守卫

### 3.1 地图 JSON 格式扩展

在 `type: "teleport"` 的地图对象中增加字段：

```typescript
interface TeleportCondition {
  type: 'none' | 'item' | 'story_flag' | 'map_available';
  itemId?: string;
  flag?: string;
  hint: string;
}

interface MapTeleportObject {
  type: 'teleport';
  target: string;
  targetX: number;
  targetY: number;
  locked?: boolean;
  condition?: TeleportCondition;
}
```

示例：

```json
{
  "type": "teleport",
  "target": "yunlai_town",
  "targetX": 120,
  "targetY": 80,
  "condition": {
    "type": "item",
    "itemId": "sword_token",
    "hint": "无天剑令牌，护山大阵不认"
  }
}
```

### 3.2 运行时状态判定

每个传送区域在场景创建时解析一次状态：

```typescript
type TeleportStatus = 'available' | 'locked' | 'conditional';

interface TeleportZoneState {
  obj: MapObject;
  status: TeleportStatus;
  hint?: string;
}
```

判定优先级（自上而下）：

1. `locked === true` → `locked`，提示 **"禁制未解，不可擅入"**
2. 目标地图不在 `loadedMapIds` 中 → `locked`，提示 **"此方天地尚未开启"**
3. `condition` 存在且不满足 → `conditional`，提示 `condition.hint`
4. 否则 → `available`

### 3.3 视觉反馈

使用 `setTint()` 给 portal sprite 着色，无需额外图片资源。

| 状态 | 着色 | 动画 | 悬浮提示 |
|------|------|------|----------|
| `available` | 无着色（原色，青蓝色灵气光晕） | 正常旋转 | 目标地名 |
| `locked` | `0x888888`（灰色，灵气枯竭） | 停止旋转，透明度 0.5 | **"此方天地尚未开启"** |
| `conditional` | `0xffaa44`（橙色，灵气波动） | 缓慢旋转 | `condition.hint`，如 **"无天剑令牌，护山大阵不认"** |

### 3.4 场景切换守卫

```typescript
private transitionToScene(sceneKey: string, x: number, y: number, targetMapId?: string): void {
  const mapId = targetMapId ?? this.currentMapId;
  if (sceneKey === 'OverworldScene' && !this.isMapLoaded(mapId)) {
    this.showFloatingHint('前路隐于迷雾之中，似有大能设下的禁制');
    return;
  }
  this.cameras.main.fadeOut(300, 0, 0, 0);
  this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    this.scene.start(sceneKey, { mapId, playerX: x, playerY: y });
  });
}
```

`isMapLoaded(mapId: string): boolean` 检查 `loadedMapIds` Set，该集合在场景初始化时收集所有已成功加载的 tilemap key。

### 3.5 走进传送区的行为

```typescript
if (obj.type === 'teleport') {
  const zone = this.teleportZones.get(obj.id);
  if (zone.status === 'available') {
    this.autoSave();
    this.currentMapId = obj.target;
    this.transitionToScene('OverworldScene', obj.targetX, obj.targetY, obj.target);
  } else {
    this.showFloatingHint(zone.hint || '灵气阻隔，难以逾越');
  }
  return;
}
```

`showFloatingHint(text: string)`：在玩家头顶生成向上飘移的文字，2 秒后淡出销毁。

---

## 接口变更汇总

| 接口 | 变更 | 影响面 |
|------|------|--------|
| `DialoguePanel.showDialogue` | 无 | 零影响 |
| `DialoguePanel.handleInput` | 无 | 零影响 |
| `NPC.constructor` | 内部缩放逻辑替换 | 零影响（外部调用不变） |
| `OverworldScene` 传送逻辑 | 增加状态判定 + 守卫 | 地图 JSON 需要补充 `condition` 字段 |
| 地图 JSON teleport 对象 | 新增可选 `locked`、`condition` | 现有未配置的条件传送门默认为 `available` |

---

## 测试要点

1. **对话框**：长文本（>100字）在 640×360 下是否完整显示、不溢出面板边界。
2. **对话框**：选项数量 1–4 个时，布局是否正常，光标位置是否正确。
3. **NPC**：所有现有 NPC 在修改后显示是否清晰，无模糊。
4. **传送门**：走进 `locked` 传送区不触发切换，显示正确提示。
5. **传送门**：条件不满足时显示对应 `hint`，满足后正常传送。
6. **守卫**：传送到未实装地图时，拒绝切换并显示提示，不黑屏/卡死。
7. **回归**：确认玩家行走动画、摄像机跟随、NPC 对话交互不受影响。
