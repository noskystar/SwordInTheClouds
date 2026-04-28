# 第一章主线骨架剧情设计方案

## 背景与问题

当前游戏第一章的剧情流程过于简短：玩家在山门与守门弟子对话、进入大殿见长老、去弟子居所接支线、到后山打木灵妖、遇见萧寒后对话直接结束。chapter1.json 仅约 30 个对话节点，与 NARRATIVE.md 中设计的 10 个关键事件差距巨大。对话结束后 `chapter1_complete` flag 被设置，但游戏没有后续推进机制，玩家只能在地图中闲逛或反复触发 demo 战斗，陷入"循环"。

核心问题：
- 缺少云深子、红绡、墨言、白芷、雪团等核心角色登场
- 缺少拜师仪式、因果线演示、关键选择点、Boss 试炼战、神秘来信等关键事件
- 所有剧情集中在 `elder` 一个 NPC 上触发，没有按场景分布
- 切换地图后 NPC 不会被重新创建，导致场景间角色错乱
- 没有场景自动触发剧情机制，剧情推进全靠玩家主动找 NPC

## 目标

让第一章的"主线骨架"完整走通，包含 NARRATIVE.md 第一章全部 10 个关键事件和 3 个关键选择点，确保剧情不再断链。角色全部登场，玩家从开场到章节结束有清晰的剧情推进路径。

**明确不在本次范围内的内容**：
- 完整的因果线颜色动态判定系统（只做首次展示红色因果线的单次演示）
- 所有支线任务全流程（只保留失踪事件线索作为剧情铺垫）
- 好感度数值的完整影响链（只记录选择结果 flag，不实现后续章节的好感度反馈）
- 丹堂、藏经阁、剑冢等未实装地图的内容

## 方案选择

在头脑风暴阶段评估了三种方案：

- **方案 A（推荐并采用）**：扩展 `chapter1.json` + 场景自动触发器。复用现有对话系统和效果机制，改动最小，剧情连贯性最强。
- **方案 B**：分场景对话文件 + 剧情状态机。长期维护性好，但需要新建状态机系统，改动量大。
- **方案 C**：纯 NPC 手动触发。最自由但玩家容易迷路，与"骨架走通"目标冲突。

采用方案 A。

## 设计细节

### 1. 关键事件映射与对话节点设计

#### 事件 → 场景映射

| 顺序 | 事件 | 场景 | 说明 |
|------|------|------|------|
| 1 | 转生苏醒 | 山门(gate) | 开场自动触发，云深子收徒，获得天剑令牌 |
| 2 | 认识萧寒 | 大殿(main_hall) | 拜师仪式后，冷淡接待 |
| 3 | 认识红绡 | 大殿(main_hall) | 热情接待，首次展示因果线（红色） |
| 4 | 认识墨言 | 弟子居所 | "多看少说"点拨 |
| 5 | 认识白芷 | 弟子居所 | 缠着玩家，内心OS暗示"眼线"身份 |
| 6 | 雪团初遇 | 后山(back_mountain) | 白狐开口，暗示知道玩家转生身份 |
| 7 | 外门弟子失踪 | 弟子居所 | NPC"李师兄"对话触发周铁柱失踪线索 |
| 8 | 丹堂异味 | 后山(替代场景) | 丹堂地图未实装，改为后山深处发现可疑丹药残渣 |
| 9 | 大师兄禁术 | 后山深处 | 撞见萧寒修炼噬灵剑诀，出现关键选择点 |
| 10 | Boss试炼 | 后山最深处 | vs 萧寒剑意分身，教学战 |

#### 新增对话节点分组（约 70 个新节点）

```
【山门·开篇】
reincarnation → yunshen_greeting → accept_disciple → get_token

【大殿·拜师】
main_hall_entry → ceremony → meet_xiaohan_cold → meet_hongxiao_warm
                    ↓
            【因果线演示】hongxiao_causality_visible

【居所·师兄师姐】
housing_entry → meet_moyan_hint → meet_baizhi_clingy
                    ↓
            【眼线暗示】baizhi_thought

【后山·灵兽】
mountain_entry → meet_xuetuan_talk → xuetuan_identity_hint

【失踪事件】
disciple_missing → li_worried → investigate_clue

【禁术事件】
xiaohan_practicing → player_choice（A.威胁举报 B.装作不知 C.表示理解）

【Boss战】
boss_trigger → start_battle(ch1_boss_xiaohan_clone)

【战后】
post_boss_win / post_boss_lose → xiaohan_reaction

【结尾】
return_housing → mysterious_letter → get_torn_map → chapter1_end
```

#### 关键选择点

| 选择点 | 选项 | 效果 |
|--------|------|------|
| 撞见萧寒修炼 | A. 威胁举报 | 萧寒好感-20，道德+5，设置 flag `xiaohan_hostile=true` + `xiaohan_choice_made=true`，后续萧寒线锁死 |
| | B. 装作不知 | 安全，设置 flag `xiaohan_ignored=true` + `xiaohan_choice_made=true`，错过深入了解 |
| | C. 表示理解 | 萧寒好感+10，设置 flag `xiaohan_trust=true` + `xiaohan_choice_made=true`，直接触发 `start_battle(ch1_boss_xiaohan_clone)` |
| 发现丹药残渣 | A. 报告师父 | 道德+5，设置 flag `reported_dantang=true` |
| | B. 暗中调查 | 设置 flag `investigating_hongxiao=true`，解锁红绡支线前置 |
| Boss战结果 | 胜利 | 设置 flag `boss_won=true`，萧寒刮目相看，奖励 `basic_sword_manual` |
| | 失败 | 设置 flag `boss_lost=true`，被击晕，获得少量经验 |

#### 未实装内容的处理妥协

- **丹堂地图未做**："丹堂异味"事件平移到后山深处，通过发现可疑丹药残渣 + 白芷对话暗示红绡的秘密。
- **"夜间跟踪"时间机制**：简化为"进入后山特定区域触发"，利用现有 encounter 区域机制或新增 story trigger 区域。
- **静心阁(meditation_room)**：保留现有 `meditation_first` 节点，作为心法阅读事件嵌入主线流程。

---

### 2. 场景自动触发器机制

#### 触发器数据结构

在 `OverworldScene` 中新增配置：

```typescript
interface StoryTrigger {
  id: string;                    // 触发器唯一ID
  sceneId: string;               // 所在场景
  requiredFlags: Record<string, boolean>;  // 必须满足的flag
  blockedFlags?: string[];       // 禁止存在的flag（防重复触发）
  dialogueNodeId: string;        // chapter1.json 中对应的起始节点
}
```

#### 第一章触发器列表

| ID | 场景 | 触发条件 | 对话节点 |
|----|------|----------|----------|
| `c1_gate_opening` | gate | 无（游戏开场） | `reincarnation` |
| `c1_hall_ceremony` | main_hall | `has_token=true` | `main_hall_entry` |
| `c1_housing_seniors` | disciples_housing | `met_hongxiao=true` | `housing_entry` |
| `c1_meditation_first` | meditation_room | `knows_rules=true` | `meditation_first` |
| `c1_mountain_xuetuan` | back_mountain | `met_moyan=true` | `mountain_entry` |
| `c1_housing_ending` | disciples_housing | `boss_done=true` | `return_housing` |

#### 触发流程

场景加载完成（`loadMap` 后） → 调用 `checkStoryTriggers()` → 遍历触发器 → 条件匹配且未被阻塞 → 自动调用 `startDialogue(chapter1Dialogue, targetNodeId)` → 对话中设置 `triggered_<id>` flag 防止重复触发。

#### 防断链兜底

如果玩家通过传送点跳过了某些场景，触发器的 `blockedFlags` 机制确保不会乱序触发。每个触发器设置独立的 `triggered_*` flag，保证只触发一次。

---

### 3. NPC 场景分布与对话绑定

#### 修复：按地图动态创建 NPC

当前 `createNPCs()` 只在 `create()` 调用一次，且 NPC 不会被地图切换清除。修复方式：
- `loadMap()` 中清除当前场景所有 NPC
- 根据新地图 ID 创建对应 NPC 列表

#### 第一章各场景 NPC 分布

| 场景 | NPC ID | 名称 | 主线对话节点 | 日常对话 |
|------|--------|------|-------------|----------|
| **山门(gate)** | `yunshen` | 云深子 | `reincarnation`（开场自动触发，非交互） | "去吧，天剑宗的未来在你手中。" |
| | `gate_guard` | 守门弟子 | — | "令牌在身，方可通行。" |
| **大殿(main_hall)** | `xiaohan` | 萧寒 | `meet_xiaohan_cold` | "修炼不可懈怠。" |
| | `hongxiao` | 红绡 | `meet_hongxiao_warm` | "师妹要不要尝尝我新炼的丹药？" |
| **弟子居所(disciples_housing)** | `moyan` | 墨言 | `meet_moyan_hint` | "……（他低头看着阵法书）" |
| | `baizhi` | 白芷 | `meet_baizhi_clingy` | "师姐带你去逛后山吧~" |
| | `chen_meimei` | 陈师妹 | — | "听说周铁柱好几天没出现了……" |
| | `li_shixiong` | 李师兄 | `disciple_missing` | "外门弟子的事，少打听为妙。" |
| **后山(back_mountain)** | `xuetuan` | 雪团 | `mountain_entry`（自动触发后接雪团对话） | "凡人看不见我，你能看见，很有趣。" |
| | `xiaohan_deep` | 萧寒(深处) | `xiaohan_practicing` | —（触发后改变状态） |

#### NPC 对话分发逻辑

```typescript
private onNPCInteract(npcId: string): void {
  const nodeId = this.resolveNPCDialogueNode(npcId);
  if (nodeId) {
    this.startDialogue(chapter1Dialogue, nodeId);
  } else {
    this.showDialogue(npcName, dailyDialogue);
  }
}
```

`resolveNPCDialogueNode()` 根据当前 flag 状态硬编码映射：
- `xiaohan` → 若 `met_hongxiao=true && !met_xiaohan` → 返回 `meet_xiaohan_cold`
- `hongxiao` → 若 `main_hall_entered=true && !met_hongxiao` → 返回 `meet_hongxiao_warm`
- `moyan` → 若 `met_hongxiao=true && !met_moyan` → 返回 `meet_moyan_hint`
- `baizhi` → 若 `met_moyan=true && !met_baizhi` → 返回 `meet_baizhi_clingy`
- `xuetuan` → 若 `met_baizhi=true && !met_xuetuan` → 返回 `meet_xuetuan_talk`
- `li_shixiong` → 若 `met_xuetuan=true && !checked_missing_disciple` → 返回 `disciple_missing`
- `xiaohan_deep` → 若 `investigating_hongxiao=true && !xiaohan_choice_made` → 返回 `xiaohan_practicing`

主线节点完成后自动设置对应 `met_*` flag，后续交互显示日常对话。

---

### 4. 战斗插入与章节结尾

#### Boss 战配置

新增战斗组 `ch1_boss_xiaohan_clone`（`src/data/battle-groups.json`）：

| 属性 | 值 |
|------|-----|
| 敌人 | 萧寒剑意分身 ×1 |
| HP | 150（玩家约 100） |
| 攻击 | 25 |
| 防御 | 12 |
| 速度 | 80 |
| 属性 | 金 |
| 技能 | 剑影斩（单体）、剑意凝聚（蓄力） |
| 机制 | 教学战，积累剑意槽满可释放大招 |

对话节点 `boss_trigger` 使用 `start_battle` effect 启动战斗。战斗结束后通过 `BattleScene → OverworldScene` 的返回数据区分胜负。

#### 战后分支

`OverworldScene.create()` 接收返回数据，设置对应 flag：
- 胜利 → `boss_won=true`，`boss_done=true`，自动触发 `post_boss_win` 节点
- 失败 → `boss_lost=true`，`boss_done=true`，自动触发 `post_boss_lose` 节点

两个分支最终汇合到 `return_housing` → `mysterious_letter`。

#### 章节结尾流程

```
mysterious_letter（旁白：回到居所，发现桌上多了一封信）
  → 信中暗示云深子不是表面那样，天剑宗历史远比想象复杂
  → 附一张残缺地图
  → 获得物品：torn_map ×1
  → 设置 flag：chapter1_complete=true
  → chapter1_end（旁白：第一章 初入宗门 — 完）
  → 显示章节完成提示面板（可选）
```

#### 防循环处理

`chapter1_complete=true` 后，所有第一章自动触发器因 `blockedFlags` 包含 `chapter1_complete` 而被阻塞，玩家不会再重复触发第一章剧情。后续可自由探索已解锁场景。

**后续过渡**：`chapter1_complete` flag 作为第二章解锁条件，WorldSystem 解锁新区域（如云来镇、灵丹殿等）。

---

## 数据变更清单

### 新增/修改的 JSON 文件

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/data/dialogues/chapter1.json` | 大幅扩展 | 从 ~30 节点扩展到 ~100 节点，覆盖全部 10 个关键事件 |
| `src/data/battle-groups.json` | 新增条目 | 新增 `ch1_boss_xiaohan_clone` 战斗组 |
| `src/data/enemies.json` | 新增条目 | 新增敌人 `xiaohan_sword_clone`（萧寒剑意分身） |
| `src/data/characters.json` | 确认 | 确保云深子、萧寒、红绡、墨言、白芷、雪团角色数据存在 |
| `src/data/maps/gate.json` | 修改 | 增加云深子、守门弟子站立点 |
| `src/data/maps/main_hall.json` | 修改 | 增加萧寒、红绡站立点 |
| `src/data/maps/disciples_housing.json` | 修改 | 增加墨言、白芷、陈师妹、李师兄站立点 |
| `src/data/maps/back_mountain.json` | 修改 | 增加雪团、萧寒(深处)站立点 |

### 新增/修改的 TypeScript 文件

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/scenes/overworld-scene.ts` | 修改 | 新增 storyTriggers 配置、checkStoryTriggers()、按地图创建 NPC、接收战斗返回数据 |
| `src/systems/dialogue-system.ts` | 修改 | 支持从指定节点开始对话（而非仅 startNodeId） |
| `src/entities/npc.ts` | 确认 | 确保支持动态创建和销毁 |

---

## 代码变更清单

### OverworldScene

1. **新增属性**：
   - `private storyTriggers: StoryTrigger[]`
   - `private storyFlags: Map<string, boolean>`（或使用现有 saveSystem 存储 flag）

2. **修改 `loadMap()`**：
   - 清除当前场景 NPC：`this.npcs.forEach(npc => npc.destroy()); this.npcs = [];`
   - 加载完成后调用 `this.createNPCsForMap(mapId)`
   - 调用 `this.checkStoryTriggers()`

3. **新增方法**：
   - `createNPCsForMap(mapId: string)`：根据地图 ID 创建对应 NPC
   - `checkStoryTriggers()`：遍历触发器，条件匹配则自动启动对话
   - `resolveNPCDialogueNode(npcId: string): string | null`：根据 flag 返回 NPC 对应节点
   - `onBattleReturn(data)`：接收战斗结果，设置 flag，触发战后对话

4. **修改 `startDialogue()`**：
   - 支持传入起始节点 ID：`startDialogue(data: DialogueData, startNodeId?: string)`

### DialogueSystem

1. **修改 `loadDialogue()`**：
   - 支持可选的起始节点：`loadDialogue(data: DialogueData, startNodeId?: string)`
   - 若传入 `startNodeId`，从该节点开始而非 `data.startNodeId`

---

## 风险与妥协

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| `chapter1.json` 过大（~100 节点） | 维护困难 | 这是第一章完整主线的固有复杂度；后续章节可独立文件 |
| 丹堂地图未实装 | "丹堂异味"事件需要平移 | 改为后山发现丹药残渣，不影响剧情逻辑 |
| NPC 动态创建引入新 bug | 切换场景时 NPC 状态异常 | 在 `loadMap()` 中彻底清理旧 NPC，新场景重新创建 |
| 自动触发器与玩家操作冲突 | 玩家正在移动时突然弹出对话 | 触发器在场景加载完成后、玩家获得控制前执行 |
| 战斗结果影响后续对话 | 需要区分胜负分支 | 通过 battle return data + flag 实现，逻辑清晰 |

---

## 验收标准

- [ ] 游戏开场自动触发"转生苏醒"剧情，云深子收徒
- [ ] 进入大殿自动触发拜师仪式，依次认识萧寒和红绡
- [ ] 进入弟子居所自动触发认识墨言和白芷
- [ ] 进入后山自动触发雪团初遇
- [ ] 与李师兄对话触发外门弟子失踪线索
- [ ] 在后山深处触发大师兄禁术事件，出现选择点
- [ ] 选择后触发 Boss 战（萧寒剑意分身）
- [ ] 战斗胜利/失败进入不同战后对话，最终汇合
- [ ] 回到居所触发神秘来信，获得残缺地图，章节结束
- [ ] 章节结束后不再重复触发第一章剧情
- [ ] 所有关键角色都有登场和至少一句日常对话
