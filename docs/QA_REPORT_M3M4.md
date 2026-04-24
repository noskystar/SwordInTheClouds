# QA 报告：Milestone 3 & 4 系统性测试

**测试日期**: 2026-04-24  
**测试范围**: 战斗系统(ATB)、角色成长、物品/装备/合成、存档、昼夜循环、任务、世界探索、对话、结局系统  
**测试方式**: 代码审查 + 单元测试 + 构建验证

---

## 执行摘要

- **审查文件数**: ~30 个源文件
- **发现问题数**: 9 个已修复，2 个已记录（无害）
- **单元测试**: 77 个测试全部通过
- **TypeScript 类型检查**: 通过
- **生产构建**: 通过

---

## 已修复问题（按严重程度排序）

### Critical

#### ISSUE-003 — 逃跑失败后战斗卡住
**文件**: `src/systems/battle-system.ts`  
**现象**: 玩家选择逃跑失败时，`handleFlee()` 将 `turnState` 设为 `'ended'`，但后续 `executeTurnAction` 继续执行 `endEntityTurn()` 导致状态混乱，战斗界面冻结。  
**修复**: 在 `'flee'` action 分支增加状态检查，若 `turnState === 'ended'` 则直接返回。

#### ISSUE-022 — NPC 交互提示一旦显示就不消失
**文件**: `src/scenes/overworld-scene.ts`  
**现象**: 使用 `physics.add.overlap` 设置 `canInteract = true`，但从未在离开重叠区域时设为 `false`，导致提示永久显示。  
**修复**: 移除 `physics.add.overlap`，完全依赖已有的 `checkNPCProximity()` 距离检测逻辑。

#### ISSUE-015 — 对话系统事件监听器内存泄漏
**文件**: `src/scenes/overworld-scene.ts`  
**现象**: `startDialogue()` 中通过内联箭头函数注册 `dialogueSystem.on('start_quest', ...)` 等事件，但 `endDialogue()` 中 `off()` 使用的是新创建的箭头函数引用，无法正确移除监听。重复对话会导致同一事件被多次触发。  
**修复**: 将回调提取为具名的类箭头方法（`onStartQuest`、`onAdvanceQuest` 等），`endDialogue()` 中使用相同引用 `off()`。

### High

#### ISSUE-004 — 同一物品可重复装备到多个槽位
**文件**: `src/systems/equipment-system.ts`  
**现象**: 装备一件已在其他槽位装备的物品时，旧槽位不会清空，导致同一物品同时存在于多个槽位，属性叠加。  
**修复**: 在 `equip()` 开头增加遍历检查，若物品已装备则先清除旧槽位。

#### ISSUE-028 — 对话结束后可能误触发战斗
**文件**: `src/scenes/overworld-scene.ts`  
**现象**: `bKeyWasDown` 仅在 `checkBattleTrigger()` 内部更新。若玩家在对话期间按住 B 键，`update()` 提前返回导致 `bKeyWasDown` 未被更新。对话结束后的第一帧会误判为"B 键刚按下"，立即触发战斗。  
**修复**: 在 `update()` 的三个分支（对话面板可见、对话打开、正常游戏）中均更新 `bKeyWasDown`。

### Medium

#### ISSUE-007 — `loadMap` 对坐标 0 的误判
**文件**: `src/scenes/overworld-scene.ts`  
**现象**: 使用 `if (!playerX || !playerY)` 判断坐标是否存在，导致坐标为 `0` 时被误判为缺失，玩家被传送到错误位置。  
**修复**: 改为 `if (playerX === undefined || playerY === undefined)`。

#### ISSUE-025 — `stun` 跳过回合时错误消耗 buff duration
**文件**: `src/systems/battle-system.ts`  
**现象**: 被 `stun` 的实体在 `executeTurnAction` 的 `stun` 分支中调用了 `tickBuffsAtTurnStart(entity)`，导致 buff 在跳过的回合也被消耗，stun 的实际 debuff 收益被放大。  
**修复**: 从 `stun` 分支移除 `tickBuffsAtTurnStart()` 调用，被 stun 的实体完全跳过回合，不消耗任何 buff 持续时间。

#### ISSUE-019 — 结局场景 SPACE 键可多次触发
**文件**: `src/scenes/ending-scene.ts`  
**现象**: 使用 `.on('down', ...)` 注册 SPACE 键，连续按键会导致多次 `fadeOut` 和 `start('TitleScene')` 调用。  
**修复**: 改为 `.once('down', ...)`，确保只触发一次。

#### ISSUE-005 — 对话选项越界索引缺乏显式防护
**文件**: `src/systems/dialogue-system.ts`  
**现象**: `selectOption(optionIndex)` 未对 `optionIndex` 做边界检查，传入负数或越界值时可能访问 `undefined`。  
**修复**: 增加显式检查 `if (optionIndex < 0 || optionIndex >= visibleOptions.length) return;`。

---

## 记录但未修复的问题（无害或已覆盖）

#### ISSUE-001 — `eKeyWasDown` 单帧内多次更新
**文件**: `src/scenes/overworld-scene.ts`  
**说明**: `eKeyWasDown` 在 `checkInteractions()` / `checkDialogueClose()` 和 `update()` 末尾各更新一次，单帧内重复赋值。由于 Phaser 键盘状态在同帧内不变，此冗余不会导致功能异常，属于代码整洁度问题。

#### ISSUE-023 — 合成退款时部分输出清理的边界情况
**文件**: `src/systems/crafting-system.ts`  
**说明**: 背包满导致输出无法放入时，系统会尝试移除已部分添加的输出并退回材料。若 `addResult.added === 0`，`removeItem(..., 0)` 的行为取决于 `InventorySystem` 实现。当前测试已覆盖该退款路径，功能正常。可选择在 `removeItem()` 中加 `quantity <= 0` 的早返回作为防御性编程。

---

## 测试覆盖

| 测试文件 | 测试数 | 覆盖范围 |
|---------|--------|---------|
| `tests/battle-system.test.ts` | 36 | ATB 槽填充、伤害计算、五行相克、防御、剑意积累、终极技、buff/debuff、stun、逃跑、战斗结束、敌人 AI、奖励 |
| `tests/inventory-system.test.ts` | 15 | 添加/移除/移动/使用物品、堆叠、分类过滤 |
| `tests/crafting-system.test.ts` | 7 | 合成成功/失败、材料退款回归测试、可用配方、事件触发 |
| `tests/quest-system.test.ts` | 10 | 接受/推进/完成任务、阶段进度、状态持久化 |
| `tests/dialogue-system.test.ts` | 8 | 节点导航、条件分支、效果执行、越界回归测试、复合条件 |
| `tests/example.test.ts` | 1 | 示例测试 |
| **总计** | **77** | |

---

## 验证结果

```
npm run typecheck   ✅ 通过
npm run test        ✅ 77/77 通过
npm run build       ✅ 通过
```

---

## 提交记录

```
07d431b fix(qa): ISSUE-028 — bKeyWasDown 在对话期间未更新...
182c69d fix(qa): ISSUE-004 — 同一物品可重复装备到多个槽位
bb93e51 fix(qa): ISSUE-005 — 对话选项越界索引缺乏显式防护
4bf1a01 fix(qa): ISSUE-019 — 结局场景 SPACE 键可多次触发
698c58c fix(qa): ISSUE-007 — loadMap 对坐标 0 的误判
63f2e06 fix(qa): ISSUE-015 — 对话系统事件监听器内存泄漏
edc20ce fix(qa): ISSUE-022 — NPC 交互提示一旦显示就不消失
479f3d0 fix(qa): ISSUE-025 — stun 跳过回合时错误消耗 buff duration
73fd578 fix(qa): ISSUE-003 — 逃跑失败后战斗卡住
```

---

## 建议后续行动

1. **性能**: 生产包 `index-BMZwNHCy.js` 为 1.56 MB（gzip 后 366 KB），建议对场景系统使用动态 `import()` 进行代码分割。
2. **测试**: 当前缺少 `EquipmentSystem`、`DayNightSystem`、`WorldSystem`、`SaveSystem` 的单元测试，可在 Milestone 5 中补充。
3. **ISSUE-001/023**: 如后续重构相关模块，可顺带清理这两个代码整洁度问题。
