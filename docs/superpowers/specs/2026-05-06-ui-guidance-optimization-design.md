# UI 引导优化设计文档

## 背景与问题

《云深不知剑》当前大地图缺乏有效的目标引导，玩家进入游戏后不知道主线目标在哪、该往哪走。同时，游戏画布实际分辨率为 `640×360`，但大量UI代码仍硬编码 `320×180`，导致面板错位、视野过窄（摄像机 zoom:3 使可视区域仅约 `213×120`）。

## 设计目标

1. 修复分辨率适配，释放640×360的完整画布空间
2. 大地图提供清晰的主线目标方向和距离感知
3. 交互提示从"常驻说教"改为"上下文按需出现"

---

## 第一节：分辨率适配与摄像机调整

### 改动清单

| 文件 | 当前硬编码 | 改为 |
|---|---|---|
| `src/config.ts` | `GAME_WIDTH = 640, GAME_HEIGHT = 360`（已经是正确值） | 保持不变，供UI组件统一引用 |
| `src/scenes/overworld-scene.ts` | `cameras.main.setZoom(3)` | `cameras.main.setZoom(2)` |
| `src/ui/quick-bar.ts` | `(320 - totalWidth) / 2`, `y = 180 - ...` | `(GAME_WIDTH - totalWidth) / 2`, `y = GAME_HEIGHT - ...` |
| `src/ui/settings-panel.ts` | `(320 - PANEL_WIDTH) / 2`, `(180 - PANEL_HEIGHT) / 2` | `(GAME_WIDTH - PANEL_WIDTH) / 2`, `(GAME_HEIGHT - PANEL_HEIGHT) / 2` |
| `src/ui/pause-menu.ts` | `rectangle(160, 90, 320, 180, ...)` | `rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH, GAME_HEIGHT, ...)` |
| `src/ui/inventory-panel.ts` | 同上 | 同上 |
| `src/scenes/battle-scene.ts` | 所有坐标基于 160/90 中心点 | 全部 ×2 适配 640×360 |

### 验收标准

- `npm run dev` 启动后，所有UI面板（暂停菜单、设置、背包、快捷栏）在窗口任意尺寸下均居中且占满正确比例
- 大地图视野从约 `213×120` 提升到 `320×180`，能一眼看到更多地图区域
- 像素渲染保持锐利，`pixelArt: true` 和 `roundPixels: true` 不受影响

---

## 第二节：目标引导HUD系统

### 2.1 QuestTrackerHUD（任务追踪面板）

**文件**：`src/ui/quest-tracker-hud.ts`（新增）

**职责**：在屏幕右上角常驻显示当前追踪任务的信息。

**布局**：
- 位置：屏幕右上角，距右边缘 8px，距上边缘 8px
- 尺寸：宽度 180px，高度根据内容自适应（最多3行文字）
- 背景：半透明矩形 `0x000000` alpha 0.75，1px 描边 `0x4a90d9`

**内容**：
- 第1行（任务名）：如「初入师门」，颜色 `#4a90d9`，字体 10px
- 第2行（阶段描述）：如「前往剑池与长老对话」，颜色 `#cccccc`，字体 8px
- 第3行（状态提示，可选）：如「目标在其它区域」或「距离较近」，颜色 `#888888`，字体 7px

**数据源与更新**：
- 通过 `QuestSystem` 获取 `getActiveQuests()`
- 默认自动追踪列表中的**第一个主线任务**（`type === 'main'`）
- 若无主线任务，追踪第一个 active 任务
- 任务进度变化、阶段推进时实时刷新

**交互**：
- 按 `Tab` 键在 active 任务列表中循环切换追踪目标
- 切换时面板内容立即更新，并短暂高亮边框提示已切换

**边界情况**：
- 无 active 任务时：面板显示「暂无追踪任务」，方向箭头隐藏
- 当前追踪任务完成时：自动切换到下一个 active 任务；若没有了，显示「所有任务已完成」

### 2.2 DirectionArrow（方向箭头）

**文件**：`src/ui/direction-arrow.ts`（新增）

**职责**：当追踪目标不在当前摄像机视野内时，在屏幕边缘显示指向目标的箭头。

**样式**：
- 图形：等腰三角形，底边 10px，高 12px，像素风格
- 颜色：距离 > 200px 时为 `#888888`（灰色），距离 ≤ 200px 时为 `#4a90d9`（主色），并添加轻微脉动动画
- 深度： Depth 100，确保在几乎所有元素之上

**位置计算**：
- 每帧在 `update()` 中计算追踪目标与摄像机视野的关系
- 若目标在视野内（`camera.worldView.contains(targetX, targetY)`）：箭头隐藏
- 若目标在视野外：计算从屏幕中心到目标的方向角，将箭头放置在屏幕边缘的最近交点
- 箭头朝向始终指向目标方向

**生命周期**：
- 由 `OverworldScene` 持有并管理
- 在 `update()` 中每帧调用 `directionArrow.update(trackedTargetX, trackedTargetY)`
- 目标进入视野、无追踪目标、目标坐标无法解析时，箭头设置 `visible = false`

### 2.3 目标坐标解析机制

Quest 的 `targetId`（如 `"elder"`、`"meditation_room"`）需要解析为世界坐标，供方向箭头使用。

**解析策略**：

| 目标类型 | 解析方式 |
|---|---|
| `talk` / `kill` | 在当前场景的 `this.npcs` 数组中查找 `npc.getId() === targetId`，返回 `npc.x, npc.y` |
| `reach` | 在当前场景的 `this.mapObjects` 中查找 `obj.id === targetId` 且 `obj.type === 'teleport'`，返回区域中心点 `(obj.x + obj.w/2, obj.y + obj.h/2)` |
| 未找到 | 返回 `null`，方向箭头隐藏，追踪面板显示「目标位置未知」 |
| 目标不在当前地图 | 返回 `null`，方向箭头隐藏，追踪面板显示「目标在其它区域」 |

**接口**：`OverworldScene` 新增私有方法 `resolveQuestTargetPosition(targetId: string): { x: number; y: number } | null`

### 2.4 与现有系统集成

- `OverworldScene` 在 `create()` 中实例化 `QuestTrackerHUD` 和 `DirectionArrow`
- `OverworldScene.update()` 中：
  1. 调用 `questTrackerHUD.update()` 刷新文本
  2. 解析当前追踪目标坐标
  3. 调用 `directionArrow.update(targetX, targetY)` 更新箭头位置和可见性
- `Tab` 键输入处理：在现有的键盘输入处理中加入 `Tab` 分支，触发 `questTrackerHUD.cycleTrackedQuest()`

---

## 第三节：上下文交互提示优化

### 3.1 移除常驻底部操作提示

**文件**：`src/scenes/overworld-scene.ts`

**当前行为**：`setupHUD()` 在屏幕左下角永久显示 `WASD/方向键移动 E 交互 B 战斗`。

**改为**：
- 该文字仅在玩家**首次进入大地图**（或首次启动游戏）时显示，持续 5 秒后自动淡出
- 使用 `localStorage` 的 `sitc_tutorial_hints_shown` 键标记是否已展示过
- 淡出后从场景移除，不再占用渲染资源

### 3.2 可交互对象上下文提示

**当前问题**：
- NPC 靠近时只显示一个 `"!"` 标记（`npc.ts` 的 `createInteractPrompt`）
- 传送点靠近时只显示目的地名称（`→ 万卷楼`）
- 玩家不知道按什么键来交互

**改为**：

| 对象类型 | 提示内容 | 触发条件 |
|---|---|---|
| NPC | `按 E 对话` | 玩家与 NPC 距离 ≤ 32px |
| 传送点（可用） | `按 E 传送至 [目的地]` | 玩家在传送区域内 |
| 传送点（锁定） | `需完成 [解锁任务名] 后解锁` | 玩家在传送区域内且状态为 `locked` |
| 传送点（条件限制） | `条件未满足` | 玩家在传送区域内且状态为 `conditional` |

**实现细节**：
- 提示文字使用对象的世界坐标（NPC 头顶或传送点上方 20px），随对象和摄像机自然移动，不使用 `setScrollFactor(0)`
- 字体：10px，颜色 `#ffffff`，描边 `0x000000` strokeThickness 2
- 深度：Depth 50
- 玩家离开交互范围后，提示在 0.3 秒内淡出并销毁

**文件改动**：
- `src/entities/npc.ts`：`createInteractPrompt()` 中的 `"!"` 改为 `"按 E 对话"`
- `src/scenes/overworld-scene.ts`：在 `update()` 的 proximity 检测逻辑中，为传送点添加/移除上下文提示文本

### 3.3 首次引导弹窗（可选）

**范围**：本次设计**暂不包括**首次引导弹窗的实现，但为未来预留扩展点：
- `OverworldScene` 中维护一个 `tutorialFlags: Record<string, boolean>` 对象
- 关键节点（首次获得任务、首次靠近NPC、首次打开菜单）检查 flag，若未触发则显示简短提示
- 提示使用与 `showFloatingHint` 相同的浮动文字风格，但停留时间更长（3秒）

---

## 数据流与依赖

```
QuestSystem
  ├── getActiveQuests() ──┐
  └── getQuestData() ─────┤
                          ▼
                    QuestTrackerHUD (右上角面板)
                          │
                          │ 提供 trackedQuestId + targetId
                          ▼
                    OverworldScene.resolveQuestTargetPosition()
                          │
                          │ 返回 targetX, targetY (或 null)
                          ▼
                    DirectionArrow (屏幕边缘箭头)
```

**单向依赖原则**：
- `QuestTrackerHUD` 依赖 `QuestSystem`（只读）
- `DirectionArrow` 依赖 `OverworldScene` 的坐标解析方法
- `OverworldScene` 持有并驱动两个 HUD 组件
- 两个 HUD 组件之间无直接耦合

---

## 错误处理

| 场景 | 处理 |
|---|---|
| 无 active 任务 | QuestTrackerHUD 显示「暂无追踪任务」，DirectionArrow 隐藏 |
| targetId 在当前场景找不到对应对象 | 面板显示「目标位置未知」，箭头隐藏，不抛异常 |
| targetId 对应对象已被销毁 | 同「找不到」，面板显示「目标位置未知」 |
| QuestSystem 数据格式异常 | 解析时做防御性检查，缺失字段显示占位符文本 |
| 同时按下 Tab 多次 | 防抖处理：两次切换间隔至少 200ms |

---

## 测试要点

1. **分辨率适配**：窗口缩放时，所有UI面板保持居中，无错位或截断
2. **视野验证**：zoom 改为 2 后，同一位置能看到比原来多约 50% 的地图区域
3. **QuestTrackerHUD**：
   - 有多个 active 任务时，按 Tab 能正确循环切换
   - 完成任务后自动切换到下一个任务
   - 无任务时显示正确占位文本
4. **DirectionArrow**：
   - 目标在视野外时，箭头出现在正确屏幕边缘并指向正确方向
   - 目标进入视野后，箭头在 1 帧内隐藏
   - 目标在当前地图找不到时，箭头不显示
5. **上下文提示**：
   - 靠近NPC时正确显示「按 E 对话」，离开后正确消失
   - 靠近锁定传送点时显示正确的解锁条件任务名
6. **性能**：`update()` 中坐标计算开销极小，目标解析每帧只做一次（可缓存，目标不变时跳过）

---

## 验收标准汇总

- [ ] 所有UI在 640×360 下正确居中布局
- [ ] 大地图摄像机 zoom = 2，视野比原来扩大 ~50%
- [ ] 屏幕右上角常驻显示当前追踪任务名称和阶段描述
- [ ] 按 Tab 可切换追踪的任务
- [ ] 目标不在视野内时，屏幕边缘显示指向目标的箭头
- [ ] 首次进入大地图的操作提示 5 秒后自动消失，不再常驻
- [ ] NPC 靠近时显示「按 E 对话」而非「!」
- [ ] 传送点根据状态显示对应的上下文提示
