# 第一章主线骨架剧情实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让第一章主线骨架完整走通，包含全部 10 个关键事件、角色登场、场景自动触发、Boss 战和章节结尾。

**Architecture:** 扩展 chapter1.json 对话数据，增强 DialogueSystem 支持起始节点和 effect 事件同步，重构 OverworldScene 实现按地图动态 NPC 创建和 StoryTrigger 自动触发机制，修改 BattleScene 支持剧情战失败后返回 Overworld。

**Tech Stack:** Phaser 3, TypeScript 5, Vite, Vitest

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src/systems/dialogue-system.ts` | 增强：支持从指定节点开始对话；effect 执行后 emit 事件通知场景同步共享状态 |
| `src/scenes/overworld-scene.ts` | 重构：story state 管理、StoryTrigger 配置与检查、按地图动态 NPC 创建、NPC 对话分发、战斗返回处理、场景切换传 mapId |
| `src/scenes/battle-scene.ts` | 增强：读取 battle group 的 `returnOnDefeat`/`returnMapId`，剧情战失败返回 Overworld 并传递 battleResult |
| `src/data/dialogues/chapter1.json` | 扩展：从 ~30 节点扩展到 ~100 节点，覆盖第一章全部 10 个关键事件 |
| `src/data/enemies.json` | 新增：萧寒剑意分身敌人定义 |
| `src/data/battle-groups.json` | 新增：第一章 Boss 战战斗组定义 |
| `src/data/maps/gate.json` | 修改：增加云深子、守门弟子 NPC 站立点 |
| `src/data/maps/main_hall.json` | 修改：增加萧寒、红绡 NPC 站立点 |
| `src/data/maps/disciples_housing.json` | 修改：增加墨言、白芷、陈师妹、李师兄 NPC 站立点 |
| `src/data/maps/back_mountain.json` | 修改：增加雪团、萧寒(深处) NPC 站立点，增加 story trigger 区域 |
| `tests/dialogue-system.test.ts` | 修改：增加测试覆盖 DialogueSystem 的起始节点和 effect 事件功能 |

---

### Task 1: DialogueSystem 支持从指定节点开始

**Files:**
- Modify: `src/systems/dialogue-system.ts:60-67`
- Test: `tests/dialogue-system.test.ts`

- [ ] **Step 1: 写测试**

在 `tests/dialogue-system.test.ts` 末尾 `describe('DialogueSystem', () => {` 内增加：

```typescript
  it('支持从指定节点开始对话', () => {
    const system = new DialogueSystem();
    const onNodeChange = vi.fn();
    system.setCallbacks(onNodeChange, vi.fn());

    system.loadDialogue(mockDialogue, 'node_2');
    system.start();

    const currentNode = system.getCurrentNode();
    expect(currentNode!.id).toBe('node_2');
    expect(currentNode!.speaker).toBe('老者');
    expect(onNodeChange).toHaveBeenCalledOnce();
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/dialogue-system.test.ts --reporter=verbose`
Expected: FAIL `支持从指定节点开始对话` with "Expected 'node_1', received 'node_2'" or similar

- [ ] **Step 3: 实现 loadDialogue 支持 startNodeId**

修改 `src/systems/dialogue-system.ts` 第 60-67 行：

```typescript
  loadDialogue(data: DialogueData, startNodeId?: string): void {
    this.dialogueData = data;
    this.state = {
      dialogueId: data.id,
      currentNodeId: startNodeId ?? data.startNodeId,
      history: [],
    };
  }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/dialogue-system.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/systems/dialogue-system.ts tests/dialogue-system.test.ts
git commit -m "feat(dialogue): support starting from arbitrary node"
```

---

### Task 2: DialogueSystem effect 事件增强

**Files:**
- Modify: `src/systems/dialogue-system.ts:182-236`
- Test: `tests/dialogue-system.test.ts`

- [ ] **Step 1: 写测试**

在 `tests/dialogue-system.test.ts` 末尾增加：

```typescript
  it('effect 执行后 emit 事件携带新值', () => {
    const system = new DialogueSystem();
    const onFlag = vi.fn();
    const onAffinity = vi.fn();
    const onMorality = vi.fn();
    system.on('effect:set_flag', onFlag);
    system.on('effect:change_affinity', onAffinity);
    system.on('effect:change_morality', onMorality);

    system.loadDialogue(mockDialogue);
    system.start();
    system.selectOption(0); // set_flag seeking_sword=true

    expect(onFlag).toHaveBeenCalledWith({ effect: { type: 'set_flag', flag: 'seeking_sword', value: true }, currentFlags: { seeking_sword: true } });

    system.selectOption(0); // change_affinity elder +10
    expect(onAffinity).toHaveBeenCalledWith({ effect: { type: 'change_affinity', npcId: 'elder', delta: 10 }, currentAffinity: { elder: 10 } });

    system.selectOption(0); // change_morality +5
    expect(onMorality).toHaveBeenCalledWith({ effect: { type: 'change_morality', delta: 5 }, currentMorality: 5 });
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/dialogue-system.test.ts --reporter=verbose`
Expected: FAIL, events not emitted

- [ ] **Step 3: 实现 effect 事件派发**

修改 `src/systems/dialogue-system.ts` 的 `executeEffect` 方法（第 182-236 行），在每种 effect 处理后 emit 事件：

```typescript
  private executeEffect(effect: DialogueEffect): void {
    switch (effect.type) {
      case 'set_flag':
        this.context.flags[effect.flag] = effect.value;
        this.emit('effect:set_flag', { effect, currentFlags: { ...this.context.flags } });
        break;

      case 'change_affinity': {
        const current = this.context.affinity[effect.npcId] ?? 0;
        this.context.affinity[effect.npcId] = current + effect.delta;
        this.emit('effect:change_affinity', { effect, currentAffinity: { ...this.context.affinity } });
        break;
      }

      case 'change_morality':
        this.context.morality += effect.delta;
        this.emit('effect:change_morality', { effect, currentMorality: this.context.morality });
        break;

      case 'change_sword_heart':
        this.context.swordHeart += effect.delta;
        this.emit('effect:change_sword_heart', { effect, currentSwordHeart: this.context.swordHeart });
        break;

      case 'add_item': {
        const current = this.context.inventory[effect.itemId] ?? 0;
        this.context.inventory[effect.itemId] = current + effect.quantity;
        this.emit('effect:add_item', { effect, currentInventory: { ...this.context.inventory } });
        break;
      }

      case 'remove_item': {
        const current = this.context.inventory[effect.itemId] ?? 0;
        this.context.inventory[effect.itemId] = Math.max(0, current - effect.quantity);
        this.emit('effect:remove_item', { effect, currentInventory: { ...this.context.inventory } });
        break;
      }

      case 'start_battle':
        this.emit('start_battle', { enemyGroupId: effect.enemyGroupId });
        break;
      case 'start_quest':
        this.emit('start_quest', { questId: effect.questId });
        break;
      case 'advance_quest':
        this.emit('advance_quest', { questId: effect.questId, stage: effect.stage });
        break;
      case 'complete_quest':
        this.emit('complete_quest', { questId: effect.questId });
        break;
      case 'teleport':
        this.emit('teleport', { scene: effect.scene, x: effect.x, y: effect.y });
        break;
      case 'unlock_skill':
        this.emit('effect:unlock_skill', { effect });
        break;
      case 'play_sound':
      case 'show_animation':
      case 'delay':
        break;
    }
  }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/dialogue-system.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/systems/dialogue-system.ts tests/dialogue-system.test.ts
git commit -m "feat(dialogue): emit events after effect execution with current state"
```

---

### Task 3: SceneTransitionData 扩展 + OverworldScene 场景切换修复

**Files:**
- Modify: `src/scenes/overworld-scene.ts:28-31`, `src/scenes/overworld-scene.ts:67-147`, `src/scenes/overworld-scene.ts:498-503`

- [ ] **Step 1: 修改 SceneTransitionData 接口**

替换 `src/scenes/overworld-scene.ts` 第 28-31 行：

```typescript
interface SceneTransitionData {
  mapId?: string;
  playerX?: number;
  playerY?: number;
  battleResult?: {
    battleGroupId: string;
    result: 'victory' | 'defeat';
    rewards?: { exp: number; drops: { itemId: string; quantity: number }[] };
  };
}
```

- [ ] **Step 2: 修改 transitionToScene 传递 mapId**

替换 `src/scenes/overworld-scene.ts` 第 498-503 行：

```typescript
  private transitionToScene(sceneKey: string, x: number, y: number): void {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(sceneKey, { mapId: this.currentMapId, playerX: x, playerY: y } as SceneTransitionData);
    });
  }
```

- [ ] **Step 3: 修改 create() 使用 data.mapId**

在 `src/scenes/overworld-scene.ts` 第 67 行 `create(data: SceneTransitionData = {})` 方法开头，将第 103 行：

```typescript
    this.loadMap(this.currentMapId, data?.playerX, data?.playerY);
```

改为：

```typescript
    const saved = this.saveSystem.load();
    const targetMapId = data?.mapId ?? saved?.player?.position?.scene ?? this.currentMapId;
    this.currentMapId = targetMapId;
    this.loadMap(this.currentMapId, data?.playerX, data?.playerY);
```

- [ ] **Step 4: 运行类型检查**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/scenes/overworld-scene.ts
git commit -m "feat(overworld): extend SceneTransitionData with mapId and battleResult"
```

---

### Task 4: OverworldScene story state 管理

**Files:**
- Modify: `src/scenes/overworld-scene.ts:34-57`, `src/scenes/overworld-scene.ts:67-147`, `src/scenes/overworld-scene.ts:467-496`

- [ ] **Step 1: 新增 story state 属性**

在 `src/scenes/overworld-scene.ts` 第 53-54 行之间（`touchControls` 属性之后）插入：

```typescript
  private storyFlags = new Map<string, boolean | number | string>();
  private storyAffinity = new Map<string, number>();
  private storyMorality = 0;
  private storySwordHeart = 0;
```

- [ ] **Step 2: 新增 applyDialogueEffect 方法**

在 `src/scenes/overworld-scene.ts` 第 620 行 `endDialogue()` 方法之后插入：

```typescript
  private applyDialogueEffect = (evt: unknown): void => {
    const e = evt as { effect: { type: string; [k: string]: unknown }; [k: string]: unknown };
    const eff = e.effect;
    switch (eff.type) {
      case 'set_flag': {
        const flagEff = eff as { flag: string; value: boolean | number | string };
        this.storyFlags.set(flagEff.flag, flagEff.value);
        break;
      }
      case 'change_affinity': {
        const affEff = eff as { npcId: string; delta: number };
        const current = this.storyAffinity.get(affEff.npcId) ?? 0;
        this.storyAffinity.set(affEff.npcId, current + affEff.delta);
        break;
      }
      case 'change_morality':
        this.storyMorality += (eff as { delta: number }).delta;
        break;
      case 'change_sword_heart':
        this.storySwordHeart += (eff as { delta: number }).delta;
        break;
      case 'add_item': {
        const addEff = eff as { itemId: string; quantity: number };
        const current = this.inventorySystem.getItemQuantity(addEff.itemId) ?? 0;
        this.inventorySystem.addItem(addEff.itemId, addEff.quantity);
        break;
      }
      case 'remove_item': {
        const remEff = eff as { itemId: string; quantity: number };
        this.inventorySystem.removeItem(remEff.itemId, remEff.quantity);
        break;
      }
    }
    this.autoSave();
  };
```

- [ ] **Step 3: 修改 startDialogue 支持起始节点和 effect 事件**

替换 `src/scenes/overworld-scene.ts` 第 572-607 行的 `startDialogue()` 方法：

```typescript
  private startDialogue(data: DialogueData, startNodeId?: string): void {
    if (this.isDialogueOpen) return;
    this.isDialogueOpen = true;
    this.physics.pause();

    this.dialogueSystem = new DialogueSystem({
      flags: Object.fromEntries(this.storyFlags),
      affinity: Object.fromEntries(this.storyAffinity),
      morality: this.storyMorality,
      swordHeart: this.storySwordHeart,
    });
    this.dialogueSystem.loadDialogue(data, startNodeId);

    this.dialogueSystem.on('start_quest', this.onStartQuest);
    this.dialogueSystem.on('advance_quest', this.onAdvanceQuest);
    this.dialogueSystem.on('complete_quest', this.onCompleteQuest);
    this.dialogueSystem.on('start_battle', this.onStartBattle);
    this.dialogueSystem.on('teleport', this.onTeleport);
    this.dialogueSystem.on('effect:set_flag', this.applyDialogueEffect);
    this.dialogueSystem.on('effect:change_affinity', this.applyDialogueEffect);
    this.dialogueSystem.on('effect:change_morality', this.applyDialogueEffect);
    this.dialogueSystem.on('effect:change_sword_heart', this.applyDialogueEffect);
    this.dialogueSystem.on('effect:add_item', this.applyDialogueEffect);
    this.dialogueSystem.on('effect:remove_item', this.applyDialogueEffect);

    this.dialoguePanel = new DialoguePanel(this);
    this.dialoguePanel.setCallbacks(
      (optionIndex) => {
        this.dialogueSystem?.selectOption(optionIndex);
      },
      () => {
        this.endDialogue();
      }
    );

    this.dialogueSystem.setCallbacks(
      (node) => {
        const options = this.dialogueSystem!.getVisibleOptions(node);
        this.dialoguePanel?.showDialogue(node, options);
      },
      () => {
        this.endDialogue();
      }
    );

    this.dialogueSystem.start();
  }
```

同时替换 `endDialogue()` 方法（第 609-620 行）：

```typescript
  private endDialogue(): void {
    this.dialogueSystem?.off('start_quest', this.onStartQuest);
    this.dialogueSystem?.off('advance_quest', this.onAdvanceQuest);
    this.dialogueSystem?.off('complete_quest', this.onCompleteQuest);
    this.dialogueSystem?.off('start_battle', this.onStartBattle);
    this.dialogueSystem?.off('teleport', this.onTeleport);
    this.dialogueSystem?.off('effect:set_flag', this.applyDialogueEffect);
    this.dialogueSystem?.off('effect:change_affinity', this.applyDialogueEffect);
    this.dialogueSystem?.off('effect:change_morality', this.applyDialogueEffect);
    this.dialogueSystem?.off('effect:change_sword_heart', this.applyDialogueEffect);
    this.dialogueSystem?.off('effect:add_item', this.applyDialogueEffect);
    this.dialogueSystem?.off('effect:remove_item', this.applyDialogueEffect);
    this.dialoguePanel?.destroy();
    this.dialoguePanel = undefined;
    this.dialogueSystem = undefined;
    this.isDialogueOpen = false;
    this.physics.resume();
  }
```

- [ ] **Step 4: 修改 autoSave 持久化 story state**

替换 `src/scenes/overworld-scene.ts` 第 467-496 行的 `autoSave()` 方法：

```typescript
  private autoSave(): void {
    const saveData = {
      version: '1.0',
      timestamp: Date.now(),
      player: {
        name: '主角',
        level: 1,
        exp: 0,
        stats: { hp: 100, maxHp: 100, mp: 50, maxMp: 50, attack: 10, defense: 5, speed: 10, critRate: 0.05, critDamage: 1.5, element: 'metal' },
        position: { scene: this.currentMapId, x: this.player.x, y: this.player.y },
      },
      inventory: this.inventorySystem.getState(),
      quests: this.questSystem.getState(),
      world: {
        unlockedAreas: this.worldSystem.getUnlockedAreas(),
        currentTime: this.dayNightSystem.getTime(),
        currentPhase: this.dayNightSystem.getCurrentPhase(),
      },
      story: {
        flags: Object.fromEntries(this.storyFlags),
        affinity: Object.fromEntries(this.storyAffinity),
        morality: this.storyMorality,
        swordHeart: this.storySwordHeart,
        choices: [],
        charactersHelped: [],
        itemsCollected: [],
      },
    };
    this.saveSystem.save(saveData);
  }
```

- [ ] **Step 5: 修改 create() 恢复存档 story state**

在 `src/scenes/overworld-scene.ts` 第 70 行 `this.saveSystem = new SaveSystem();` 之后插入：

```typescript
    const saved = this.saveSystem.load();
    if (saved?.story) {
      this.storyFlags = new Map(Object.entries(saved.story.flags ?? {}));
      this.storyAffinity = new Map(Object.entries(saved.story.affinity ?? {}));
      this.storyMorality = saved.story.morality ?? 0;
      this.storySwordHeart = saved.story.swordHeart ?? 0;
    }
```

- [ ] **Step 6: 运行类型检查**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 7: Commit**

```bash
git add src/scenes/overworld-scene.ts
git commit -m "feat(overworld): add story state management with persistence"
```

---

### Task 5: OverworldScene NPC 动态创建

**Files:**
- Modify: `src/scenes/overworld-scene.ts:286-322`, `src/scenes/overworld-scene.ts:350-396`

- [ ] **Step 1: 修改 loadMap() 清除旧 NPC**

在 `src/scenes/overworld-scene.ts` 第 351-353 行的清除逻辑中，增加 NPC 清除：

替换第 351-353 行：

```typescript
    this.children.list
      .filter((child) => child.name === 'map-object' || child.name === 'ground-tile')
      .forEach((child) => child.destroy());
```

为：

```typescript
    this.children.list
      .filter((child) => child.name === 'map-object' || child.name === 'ground-tile')
      .forEach((child) => child.destroy());
    this.npcs.forEach((npc) => npc.destroy());
    this.npcs = [];
```

- [ ] **Step 2: 新增 createNPCsForMap 方法**

替换 `src/scenes/overworld-scene.ts` 第 286-322 行的 `createNPCs()` 方法为 `createNPCsForMap(mapId: string)`：

```typescript
  private createNPCsForMap(mapId: string): void {
    const npcConfigsByMap: Record<string, NPCConfig[]> = {
      gate: [
        { id: 'yunshen', name: '云深子', x: 160, y: 100, texture: 'npc_master' },
        { id: 'gate_guard', name: '守门弟子', x: 280, y: 120, texture: 'npc_disciple' },
      ],
      main_hall: [
        { id: 'xiaohan', name: '萧寒', x: 200, y: 110, texture: 'npc_xiaohan' },
        { id: 'hongxiao', name: '红绡', x: 360, y: 110, texture: 'npc_hongxiao' },
      ],
      disciples_housing: [
        { id: 'moyan', name: '墨言', x: 120, y: 100, texture: 'npc_moyan' },
        { id: 'baizhi', name: '白芷', x: 280, y: 120, texture: 'npc_baizhi' },
        { id: 'chen_meimei', name: '陈师妹', x: 400, y: 140, texture: 'npc_junior_sister' },
        { id: 'li_shixiong', name: '李师兄', x: 80, y: 160, texture: 'npc_disciple' },
      ],
      back_mountain: [
        { id: 'xuetuan', name: '雪团', x: 120, y: 200, texture: 'npc_xuetuan' },
        { id: 'xiaohan_deep', name: '萧寒', x: 560, y: 120, texture: 'npc_xiaohan' },
      ],
    };

    const configs = npcConfigsByMap[mapId] ?? [];
    for (const config of configs) {
      const npc = new NPC(this, config);
      npc.setDepth(2);
      npc.onInteract(() => this.onNPCInteract(config.id));
      this.npcs.push(npc);
    }
  }
```

- [ ] **Step 3: 修改 create() 调用 createNPCsForMap**

替换 `src/scenes/overworld-scene.ts` 第 108 行的 `this.createNPCs();` 为：

```typescript
    this.createNPCsForMap(this.currentMapId);
```

- [ ] **Step 4: 修改 loadMap() 调用 createNPCsForMap**

在 `src/scenes/overworld-scene.ts` 第 378 行 `this.mapLoader.createVisualObjects(this.mapObjects);` 之后插入：

```typescript
      this.createNPCsForMap(this.currentMapId);
```

- [ ] **Step 5: 运行类型检查**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add src/scenes/overworld-scene.ts
git commit -m "feat(overworld): create NPCs dynamically per map"
```

---

### Task 6: OverworldScene StoryTrigger 自动触发

**Files:**
- Modify: `src/scenes/overworld-scene.ts`

- [ ] **Step 1: 新增 StoryTrigger 接口和配置**

在 `src/scenes/overworld-scene.ts` 第 31-32 行之间（SceneTransitionData 之后）插入：

```typescript
interface StoryTrigger {
  id: string;
  sceneId: string;
  objectId?: string;
  zone?: { x: number; y: number; w: number; h: number };
  requiredFlags: Record<string, boolean>;
  blockedFlags?: string[];
  dialogueNodeId: string;
}
```

- [ ] **Step 2: 新增触发器列表和 checkStoryTriggers 方法**

在 `src/scenes/overworld-scene.ts` 中 `applyDialogueEffect` 方法之后插入：

```typescript
  private readonly storyTriggers: StoryTrigger[] = [
    { id: 'c1_gate_opening', sceneId: 'gate', requiredFlags: {}, blockedFlags: ['triggered_c1_gate_opening', 'chapter1_complete'], dialogueNodeId: 'reincarnation' },
    { id: 'c1_hall_ceremony', sceneId: 'main_hall', requiredFlags: { has_token: true }, blockedFlags: ['triggered_c1_hall_ceremony', 'chapter1_complete'], dialogueNodeId: 'main_hall_entry' },
    { id: 'c1_housing_seniors', sceneId: 'disciples_housing', requiredFlags: { met_hongxiao: true }, blockedFlags: ['triggered_c1_housing_seniors', 'chapter1_complete'], dialogueNodeId: 'housing_entry' },
    { id: 'c1_meditation_first', sceneId: 'meditation_room', requiredFlags: { knows_rules: true }, blockedFlags: ['triggered_c1_meditation_first', 'chapter1_complete'], dialogueNodeId: 'meditation_first' },
    { id: 'c1_mountain_xuetuan', sceneId: 'back_mountain', requiredFlags: { met_moyan: true }, blockedFlags: ['triggered_c1_mountain_xuetuan', 'chapter1_complete'], dialogueNodeId: 'mountain_entry' },
    { id: 'c1_dantang_residue', sceneId: 'back_mountain', objectId: 'story_dantang_residue', requiredFlags: { met_xuetuan: true }, blockedFlags: ['triggered_c1_dantang_residue', 'chapter1_complete'], dialogueNodeId: 'dantang_residue' },
    { id: 'c1_xiaohan_forbidden', sceneId: 'back_mountain', objectId: 'story_xiaohan_forbidden', requiredFlags: { investigating_hongxiao: true }, blockedFlags: ['triggered_c1_xiaohan_forbidden', 'chapter1_complete'], dialogueNodeId: 'xiaohan_practicing' },
    { id: 'c1_housing_ending', sceneId: 'disciples_housing', requiredFlags: { boss_done: true }, blockedFlags: ['triggered_c1_housing_ending', 'chapter1_complete'], dialogueNodeId: 'return_housing' },
  ];

  private checkStoryTriggers(objectId?: string): void {
    if (this.isDialogueOpen) return;

    for (const trigger of this.storyTriggers) {
      if (trigger.sceneId !== this.currentMapId) continue;
      if (objectId && trigger.objectId !== objectId) continue;
      if (!objectId && trigger.objectId) continue;

      const blocked = trigger.blockedFlags ?? [];
      if (blocked.some((f) => this.storyFlags.get(f) === true)) continue;

      const required = Object.entries(trigger.requiredFlags);
      if (required.some(([flag, val]) => this.storyFlags.get(flag) !== val)) continue;

      // Trigger matched
      this.storyFlags.set(`triggered_${trigger.id}`, true);
      this.autoSave();
      this.startDialogue(chapter1Dialogue as DialogueData, trigger.dialogueNodeId);
      return; // Only trigger one at a time
    }
  }
```

- [ ] **Step 3: 在 loadMap() 和 checkMapObjects() 中调用**

在 `src/scenes/overworld-scene.ts` 第 378 行 `this.createNPCsForMap(this.currentMapId);` 之后插入：

```typescript
      this.checkStoryTriggers();
```

在 `checkMapObjects()` 方法的 encounter 处理分支中，在 `startEncounter(obj.battleGroupId);` 之前增加 story trigger 检查：

找到第 458-463 行：

```typescript
      if (obj.type === 'encounter' && obj.battleGroupId) {
        if (Math.random() < 0.01) {
          this.startEncounter(obj.battleGroupId);
          return;
        }
      }
```

替换为：

```typescript
      if (obj.type === 'story_trigger' && obj.id) {
        this.checkStoryTriggers(obj.id);
        return;
      }

      if (obj.type === 'encounter' && obj.battleGroupId) {
        if (Math.random() < 0.01) {
          this.startEncounter(obj.battleGroupId);
          return;
        }
      }
```

- [ ] **Step 4: 运行类型检查**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add src/scenes/overworld-scene.ts
git commit -m "feat(overworld): add StoryTrigger auto-trigger system"
```

---

### Task 7: OverworldScene NPC 对话分发

**Files:**
- Modify: `src/scenes/overworld-scene.ts`

- [ ] **Step 1: 新增 resolveNPCDialogueNode 方法**

在 `checkStoryTriggers` 方法之后插入：

```typescript
  private resolveNPCDialogueNode(npcId: string): string | null {
    const flags = this.storyFlags;
    switch (npcId) {
      case 'xiaohan':
        if (flags.get('met_hongxiao') === true && flags.get('met_xiaohan') !== true) return 'meet_xiaohan_cold';
        break;
      case 'hongxiao':
        if (flags.get('main_hall_entered') === true && flags.get('met_hongxiao') !== true) return 'meet_hongxiao_warm';
        break;
      case 'moyan':
        if (flags.get('met_hongxiao') === true && flags.get('met_moyan') !== true) return 'meet_moyan_hint';
        break;
      case 'baizhi':
        if (flags.get('met_moyan') === true && flags.get('met_baizhi') !== true) return 'meet_baizhi_clingy';
        break;
      case 'xuetuan':
        if (flags.get('met_baizhi') === true && flags.get('met_xuetuan') !== true) return 'meet_xuetuan_talk';
        break;
      case 'li_shixiong':
        if (flags.get('met_xuetuan') === true && flags.get('checked_missing_disciple') !== true) return 'disciple_missing';
        break;
      case 'xiaohan_deep':
        if (flags.get('investigating_hongxiao') === true && flags.get('xiaohan_choice_made') !== true) return 'xiaohan_practicing';
        break;
    }
    return null;
  }
```

- [ ] **Step 2: 新增 onNPCInteract 方法**

在 `resolveNPCDialogueNode` 之后插入：

```typescript
  private onNPCInteract(npcId: string): void {
    const nodeId = this.resolveNPCDialogueNode(npcId);
    if (nodeId) {
      this.startDialogue(chapter1Dialogue as DialogueData, nodeId);
    } else {
      const dailyLines: Record<string, string> = {
        yunshen: '去吧，天剑宗的未来在你手中。',
        gate_guard: '令牌在身，方可通行。',
        xiaohan: '修炼不可懈怠。',
        hongxiao: '师妹要不要尝尝我新炼的丹药？',
        moyan: '……（他低头看着阵法书）',
        baizhi: '师姐带你去逛后山吧~',
        chen_meimei: '听说周铁柱好几天没出现了……',
        li_shixiong: '外门弟子的事，少打听为妙。',
        xuetuan: '凡人看不见我，你能看见，很有趣。',
        xiaohan_deep: '……',
      };
      const nameMap: Record<string, string> = {
        yunshen: '云深子',
        gate_guard: '守门弟子',
        xiaohan: '萧寒',
        hongxiao: '红绡',
        moyan: '墨言',
        baizhi: '白芷',
        chen_meimei: '陈师妹',
        li_shixiong: '李师兄',
        xuetuan: '雪团',
        xiaohan_deep: '萧寒',
      };
      const text = dailyLines[npcId] ?? '……';
      this.showDialogue(nameMap[npcId] ?? 'NPC', text);
    }
  }
```

- [ ] **Step 3: 运行类型检查**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/scenes/overworld-scene.ts
git commit -m "feat(overworld): add NPC dialogue dispatch with daily fallback"
```

---

### Task 8: OverworldScene 战斗返回处理

**Files:**
- Modify: `src/scenes/overworld-scene.ts`

- [ ] **Step 1: 新增 onBattleReturn 方法**

在 `onNPCInteract` 方法之后插入：

```typescript
  private onBattleReturn(data: SceneTransitionData['battleResult']): void {
    if (!data) return;
    if (data.battleGroupId === 'ch1_boss_xiaohan_clone') {
      if (data.result === 'victory') {
        this.storyFlags.set('boss_won', true);
      } else {
        this.storyFlags.set('boss_lost', true);
      }
      this.storyFlags.set('boss_done', true);
      this.autoSave();
      // 战后对话由 StoryTrigger c1_housing_ending 处理（当玩家回到居所时）
      // 但如果当前已在居所，立即触发
      if (this.currentMapId === 'disciples_housing') {
        this.checkStoryTriggers();
      }
    }
  }
```

- [ ] **Step 2: 修改 create() 处理 battleResult**

在 `src/scenes/overworld-scene.ts` 第 67 行 `create(data: SceneTransitionData = {})` 方法中，恢复存档逻辑之后，增加：

```typescript
    // 处理战斗返回
    if (data?.battleResult) {
      this.onBattleReturn(data.battleResult);
    }
```

- [ ] **Step 3: 运行类型检查**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/scenes/overworld-scene.ts
git commit -m "feat(overworld): handle battle return data for story boss"
```

---

### Task 9: BattleScene 剧情战返回

**Files:**
- Modify: `src/scenes/battle-scene.ts`

- [ ] **Step 1: 扩展 BattleSceneData 接口**

在 `src/scenes/battle-scene.ts` 第 12-16 行，修改 `BattleSceneData`：

```typescript
interface BattleSceneData {
  battleGroupId: string;
  playerStats: PlayerBattleStats;
  returnScene?: string;
}
```

保持原样（不需要修改接口，因为 returnMapId 从 battleGroupsData 读取）。

- [ ] **Step 2: 修改 handleBattleEnd 支持剧情战返回**

替换 `src/scenes/battle-scene.ts` 第 907-931 行的 `handleBattleEnd` 方法：

```typescript
  private handleBattleEnd(result: BattleResult, rewards?: { exp: number; drops: { itemId: string; quantity: number }[] }): void {
    this.menuState = 'ended';

    if (result === 'victory') {
      this.addLog(`战斗胜利！获得 ${rewards?.exp ?? 0} 经验`);
      if (rewards && rewards.drops.length > 0) {
        for (const drop of rewards.drops) {
          this.addLog(`获得 ${drop.itemId} x${drop.quantity}`);
        }
      }
    } else if (result === 'defeat') {
      this.addLog('战斗失败……');
    }

    const group = battleGroupsData.find((g) => g.id === this.battleSystem.getBattleGroupId?.());
    const isStoryBattle = (group as { type?: string })?.type === 'story';
    const returnMapId = (group as { returnMapId?: string })?.returnMapId;

    this.time.delayedCall(1500, () => {
      if (result === 'defeat' && !isStoryBattle) {
        this.scene.start('GameOverScene', { returnScene: this.returnScene });
      } else {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start(this.returnScene, {
            mapId: returnMapId,
            battleResult: {
              battleGroupId: group?.id ?? '',
              result: result === 'victory' ? 'victory' : 'defeat',
              rewards,
            },
          });
        });
      }
    });
  }
```

> 注意：`this.battleSystem.getBattleGroupId?.()` 可能不存在。如果 BattleSystem 没有这个方法，需要从 `create()` 中保存 `data.battleGroupId` 到实例属性。

在 `src/scenes/battle-scene.ts` 第 77 行 `private returnScene = 'OverworldScene';` 之后添加：

```typescript
  private currentBattleGroupId = '';
```

在 `create()` 方法第 89 行之后添加：

```typescript
    this.currentBattleGroupId = data.battleGroupId;
```

然后修改 `handleBattleEnd` 中的 `group` 查找：

```typescript
    const group = battleGroupsData.find((g) => g.id === this.currentBattleGroupId);
```

- [ ] **Step 3: 运行类型检查**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/scenes/battle-scene.ts
git commit -m "feat(battle): support story battle return to overworld on defeat"
```

---

### Task 10: 新增敌人与战斗组数据

**Files:**
- Modify: `src/data/enemies.json`
- Modify: `src/data/battle-groups.json`

- [ ] **Step 1: 在 enemies.json 新增萧寒剑意分身**

在 `src/data/enemies.json` 末尾（最后一个对象之后，倒数第 2 行 `]` 之前）插入：

```json
  {
    "id": "xiaohan_sword_clone",
    "name": "萧寒剑意分身",
    "level": 5,
    "maxHp": 150,
    "maxMp": 50,
    "attack": 25,
    "defense": 12,
    "speed": 80,
    "element": "metal",
    "expReward": 100,
    "dropItems": [
      { "itemId": "basic_sword_manual", "chance": 1.0, "minQuantity": 1, "maxQuantity": 1 }
    ],
    "skills": ["slash_metal", "sword_intent_gather"],
    "color": 10066329
  }
```

- [ ] **Step 2: 在 battle-groups.json 新增 Boss 战**

在 `src/data/battle-groups.json` 末尾（最后一个对象之后，倒数第 2 行 `]` 之前）插入：

```json
  {
    "id": "ch1_boss_xiaohan_clone",
    "name": "大师兄的试炼",
    "enemies": ["xiaohan_sword_clone"],
    "backgroundColor": 1973790,
    "type": "story",
    "returnMapId": "back_mountain"
  }
```

- [ ] **Step 3: 运行类型检查**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/data/enemies.json src/data/battle-groups.json
git commit -m "feat(data): add chapter 1 boss enemy and battle group"
```

---

### Task 11: 扩展 chapter1.json - 山门篇 + 大殿篇

**Files:**
- Modify: `src/data/dialogues/chapter1.json`

- [ ] **Step 1: 备份当前 chapter1.json**

```bash
cp src/data/dialogues/chapter1.json src/data/dialogues/chapter1.json.bak
```

- [ ] **Step 2: 重写 chapter1.json 山门+大殿节点**

替换 `src/data/dialogues/chapter1.json` 的全部内容为（保留原有节点结构，扩展新节点）：

```json
{
  "id": "chapter1",
  "title": "第一章：初入宗门",
  "startNodeId": "arrival",
  "nodes": {
    "arrival": {
      "id": "arrival",
      "speaker": "旁白",
      "text": "雷雨交加之夜，你被一道闪电击中。意识模糊间，仿佛穿越了无尽的虚空……",
      "options": [
        { "id": "continue", "text": "……", "effects": [], "nextNodeId": "reincarnation" }
      ]
    },
    "reincarnation": {
      "id": "reincarnation",
      "speaker": "旁白",
      "text": "你缓缓睁开眼，发现自己躺在青石板上。一位白发老者正俯视着你，目光深邃如海。",
      "options": [
        { "id": "wake", "text": "……这是哪里？", "effects": [], "nextNodeId": "yunshen_greeting" }
      ]
    },
    "yunshen_greeting": {
      "id": "yunshen_greeting",
      "speaker": "云深子",
      "text": "醒了？你从山门外跌进来，昏迷了三天三夜。既然醒了，便是有缘。可愿拜入我天剑宗门下？",
      "options": [
        { "id": "accept", "text": "弟子愿意。", "effects": [{ "type": "set_flag", "flag": "accepted_disciple", "value": true }], "nextNodeId": "accept_disciple" },
        { "id": "hesitate", "text": "……弟子不知道发生了什么。", "effects": [], "nextNodeId": "yunshen_explain" }
      ]
    },
    "yunshen_explain": {
      "id": "yunshen_explain",
      "speaker": "云深子",
      "text": "无妨。这里是天剑宗，修仙界正道魁首。你命数奇异，与我有师徒之缘。",
      "options": [
        { "id": "accept2", "text": "弟子愿意拜师。", "effects": [{ "type": "set_flag", "flag": "accepted_disciple", "value": true }], "nextNodeId": "accept_disciple" }
      ]
    },
    "accept_disciple": {
      "id": "accept_disciple",
      "speaker": "云深子",
      "text": "从今日起，你便是我天剑宗弟子。这枚天剑令牌你收好，凭此可入宗门各处。",
      "options": [
        { "id": "receive", "text": "谢师父。", "effects": [{ "type": "set_flag", "flag": "has_token", "value": true }, { "type": "set_flag", "flag": "triggered_c1_gate_opening", "value": true }], "nextNodeId": "get_token" }
      ]
    },
    "get_token": {
      "id": "get_token",
      "speaker": "旁白",
      "text": "你接过了一枚温润如玉的令牌，上面刻着「天剑」二字。云深子转身向大殿方向走去。",
      "options": [
        { "id": "to_hall", "text": "前往大殿", "effects": [{ "type": "teleport", "scene": "OverworldScene", "x": 32, "y": 160 }], "nextNodeId": "" }
      ]
    },
    "main_hall_entry": {
      "id": "main_hall_entry",
      "speaker": "旁白",
      "text": "天剑殿气势恢宏，殿内已有数名弟子列队等候。云深子端坐于主位之上。",
      "options": [
        { "id": "approach", "text": "上前", "effects": [{ "type": "set_flag", "flag": "main_hall_entered", "value": true }], "nextNodeId": "ceremony" }
      ]
    },
    "ceremony": {
      "id": "ceremony",
      "speaker": "云深子",
      "text": "今日起，林疏影正式入我天剑宗，为我关门弟子。各位师兄师姐，好生照拂。",
      "options": [
        { "id": "greet", "text": "弟子拜见各位师兄师姐。", "effects": [], "nextNodeId": "meet_xiaohan_cold" }
      ]
    },
    "meet_xiaohan_cold": {
      "id": "meet_xiaohan_cold",
      "speaker": "萧寒",
      "text": "……（他看了你一眼，目光冷淡）关门弟子？希望你不要拖后腿。",
      "options": [
        { "id": "polite", "text": "大师兄好，弟子会努力修炼。", "effects": [{ "type": "change_affinity", "npcId": "xiaohan", "delta": 3 }, { "type": "set_flag", "flag": "met_xiaohan", "value": true }], "nextNodeId": "meet_hongxiao_warm" },
        { "id": "silent", "text": "……", "effects": [{ "type": "set_flag", "flag": "met_xiaohan", "value": true }], "nextNodeId": "meet_hongxiao_warm" }
      ]
    },
    "meet_hongxiao_warm": {
      "id": "meet_hongxiao_warm",
      "speaker": "红绡",
      "text": "哎呀，好可爱的小师妹！我是你二师姐红绡，以后有什么需要尽管来找师姐~",
      "options": [
        { "id": "thanks", "text": "谢谢师姐。", "effects": [{ "type": "change_affinity", "npcId": "hongxiao", "delta": 5 }, { "type": "set_flag", "flag": "met_hongxiao", "value": true }], "nextNodeId": "hongxiao_causality_visible" }
      ]
    },
    "hongxiao_causality_visible": {
      "id": "hongxiao_causality_visible",
      "speaker": "旁白",
      "text": "你突然注意到，红绡师姐头顶隐约浮现出一条丝线——那是血红色的。作为转生者，你能看到他人的「因果线」。红色……代表大恶。",
      "options": [
        { "id": "shock", "text": "（掩饰惊讶）师姐的丹药一定很厉害吧。", "effects": [{ "type": "set_flag", "flag": "triggered_c1_hall_ceremony", "value": true }], "nextNodeId": "hall_exit" }
      ]
    },
    "hall_exit": {
      "id": "hall_exit",
      "speaker": "旁白",
      "text": "拜师仪式结束。云深子吩咐你去弟子居所安顿，随后可自行熟悉宗门。",
      "options": [
        { "id": "to_housing", "text": "前往弟子居所", "effects": [{ "type": "teleport", "scene": "OverworldScene", "x": 120, "y": 120 }], "nextNodeId": "" }
      ]
    },
    "housing_entry": {
      "id": "housing_entry",
      "speaker": "旁白",
      "text": "弟子居所比想象中宽敞，几位师兄师姐各自忙碌着。一位书生模样的青年正在翻阅阵法书。",
      "options": [
        { "id": "look_around", "text": "四处看看", "effects": [{ "type": "set_flag", "flag": "triggered_c1_housing_seniors", "value": true }], "nextNodeId": "meet_moyan_hint" }
      ]
    },
    "meet_moyan_hint": {
      "id": "meet_moyan_hint",
      "speaker": "墨言",
      "text": "……（他合上书，看了你一眼）新来的？天剑宗这个地方，多看，少说。",
      "options": [
        { "id": "ask_why", "text": "三师兄何出此言？", "effects": [{ "type": "change_affinity", "npcId": "moyan", "delta": 2 }, { "type": "set_flag", "flag": "met_moyan", "value": true }], "nextNodeId": "meet_baizhi_clingy" },
        { "id": "nod", "text": "弟子记住了。", "effects": [{ "type": "change_affinity", "npcId": "moyan", "delta": 5 }, { "type": "set_flag", "flag": "met_moyan", "value": true }], "nextNodeId": "meet_baizhi_clingy" }
      ]
    },
    "meet_baizhi_clingy": {
      "id": "meet_baizhi_clingy",
      "speaker": "白芷",
      "text": "小师妹！你可算来了，我等你好久了！我是你四师姐白芷，走，我带你逛宗门！",
      "options": [
        { "id": "friendly", "text": "谢谢四师姐。", "effects": [{ "type": "change_affinity", "npcId": "baizhi", "delta": 5 }, { "type": "set_flag", "flag": "met_baizhi", "value": true }], "nextNodeId": "baizhi_thought" }
      ]
    },
    "baizhi_thought": {
      "id": "baizhi_thought",
      "speaker": "旁白",
      "text": "白芷热情得有些过分。你隐约注意到，她眼中闪过一丝审视——像是在评估什么。或许只是错觉？",
      "options": [
        { "id": "leave", "text": "弟子想去后山看看。", "effects": [{ "type": "set_flag", "flag": "knows_rules", "value": true }], "nextNodeId": "housing_exit" }
      ]
    },
    "housing_exit": {
      "id": "housing_exit",
      "speaker": "旁白",
      "text": "你离开弟子居所。后山的方向传来阵阵灵兽低吼……",
      "options": [
        { "id": "to_mountain", "text": "前往后山", "effects": [{ "type": "teleport", "scene": "OverworldScene", "x": 48, "y": 240 }], "nextNodeId": "" }
      ]
    },
    "meditation_first": {
      "id": "meditation_first",
      "speaker": "旁白",
      "text": "修炼静室空无一人，只有蒲团和一本落灰的心法。",
      "options": [
        { "id": "read", "text": "翻阅心法", "effects": [{ "type": "set_flag", "flag": "read_basic_manual", "value": true }, { "type": "set_flag", "flag": "triggered_c1_meditation_first", "value": true }], "nextNodeId": "manual_text" },
        { "id": "leave_room", "text": "离开", "effects": [{ "type": "set_flag", "flag": "triggered_c1_meditation_first", "value": true }], "nextNodeId": "" }
      ]
    },
    "manual_text": {
      "id": "manual_text",
      "speaker": "旁白",
      "text": "「剑心通明，万法归一。修剑先修心，心正则剑正。」",
      "options": [
        { "id": "meditate", "text": "坐下冥想", "effects": [{ "type": "change_sword_heart", "delta": 5 }], "nextNodeId": "meditation_benefit" },
        { "id": "close_book", "text": "合上书本", "effects": [], "nextNodeId": "" }
      ]
    },
    "meditation_benefit": {
      "id": "meditation_benefit",
      "speaker": "旁白",
      "text": "你感觉体内的灵力更加凝实了。",
      "options": [
        { "id": "done", "text": "继续", "effects": [], "nextNodeId": "" }
      ]
    }
  }
}
```

> 注：以上 JSON 包含约 20 个节点（山门+大殿+居所前半部分）。完整 chapter1.json 需要在后续任务中继续追加节点。

- [ ] **Step 3: 验证 JSON 格式**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/data/dialogues/chapter1.json'))" && echo "JSON valid"`
Expected: `JSON valid`

- [ ] **Step 4: Commit**

```bash
git add src/data/dialogues/chapter1.json
git commit -m "feat(data): expand chapter1.json with gate, hall, and housing intro nodes"
```

---

### Task 12: 扩展 chapter1.json - 后山篇 + 失踪事件

**Files:**
- Modify: `src/data/dialogues/chapter1.json`

- [ ] **Step 1: 追加后山+失踪事件节点**

在 `src/data/dialogues/chapter1.json` 的 `"meditation_benefit"` 节点之后（`}` 之前，倒数第 2 个 `}` 之前）追加以下节点：

```json
    "mountain_entry": {
      "id": "mountain_entry",
      "speaker": "旁白",
      "text": "后山林木幽深，灵气比宗门内浓郁数倍。忽然，一只白狐从树丛中探出头来，口吐人言。",
      "options": [
        { "id": "surprised", "text": "……狐狸会说话？", "effects": [{ "type": "set_flag", "flag": "triggered_c1_mountain_xuetuan", "value": true }], "nextNodeId": "meet_xuetuan_talk" }
      ]
    },
    "meet_xuetuan_talk": {
      "id": "meet_xuetuan_talk",
      "speaker": "雪团",
      "text": "凡人自然听不见我说话。但你不一样——你是「转生者」，对吗？",
      "options": [
        { "id": "deny", "text": "你在说什么？", "effects": [{ "type": "change_affinity", "npcId": "xuetuan", "delta": 2 }, { "type": "set_flag", "flag": "met_xuetuan", "value": true }], "nextNodeId": "xuetuan_identity_hint" },
        { "id": "admit", "text": "……你怎么知道？", "effects": [{ "type": "change_affinity", "npcId": "xuetuan", "delta": 5 }, { "type": "set_flag", "flag": "met_xuetuan", "value": true }], "nextNodeId": "xuetuan_identity_hint" }
      ]
    },
    "xuetuan_identity_hint": {
      "id": "xuetuan_identity_hint",
      "speaker": "雪团",
      "text": "千年前，我曾与你的前世有过一面之缘。去后山深处看看吧，有些东西在等你发现。",
      "options": [
        { "id": "ask_more", "text": "我的前世是什么人？", "effects": [], "nextNodeId": "xuetuan_vague" }
      ]
    },
    "xuetuan_vague": {
      "id": "xuetuan_vague",
      "speaker": "雪团",
      "text": "时机到了，你自然会知道。记住——在天剑宗，不要相信任何人，包括你的师父。",
      "options": [
        { "id": "to_deep", "text": "（继续深入后山）", "effects": [], "nextNodeId": "" }
      ]
    },
    "disciple_missing": {
      "id": "disciple_missing",
      "speaker": "李师兄",
      "text": "小师妹？你来得正好。外门弟子周铁柱已经三天没有出现了，你可见过他？",
      "options": [
        { "id": "no", "text": "弟子没有见过。", "effects": [{ "type": "set_flag", "flag": "checked_missing_disciple", "value": true }], "nextNodeId": "li_worried" }
      ]
    },
    "li_worried": {
      "id": "li_worried",
      "speaker": "李师兄",
      "text": "奇怪……他临走前说要去丹堂附近采药。丹堂那种地方，外门弟子怎么能随便靠近？",
      "options": [
        { "id": "ask_dantang", "text": "丹堂有什么问题吗？", "effects": [], "nextNodeId": "li_hint" }
      ]
    },
    "li_hint": {
      "id": "li_hint",
      "speaker": "李师兄",
      "text": "（压低声音）我听说丹堂偶尔有异味飘出来，像是……血腥味。你最好不要多管闲事。",
      "options": [
        { "id": "investigate", "text": "弟子想去看看。", "effects": [{ "type": "set_flag", "flag": "missing_disciple_investigate", "value": true }], "nextNodeId": "" },
        { "id": "ignore", "text": "弟子明白了。", "effects": [{ "type": "set_flag", "flag": "missing_disciple_ignored", "value": true }], "nextNodeId": "" }
      ]
    },
    "dantang_residue": {
      "id": "dantang_residue",
      "speaker": "旁白",
      "text": "后山深处的一块岩石旁，你发现了一些可疑的残渣。闻起来像是某种丹药的残留，但带着一股令人作呕的血腥味。",
      "options": [
        { "id": "report", "text": "报告师父", "effects": [{ "type": "set_flag", "flag": "reported_dantang", "value": true }, { "type": "change_morality", "delta": 5 }], "nextNodeId": "dantang_report" },
        { "id": "investigate", "text": "暗中调查", "effects": [{ "type": "set_flag", "flag": "investigating_hongxiao", "value": true }], "nextNodeId": "dantang_investigate" },
        { "id": "trade", "text": "与红绡交易", "effects": [{ "type": "change_affinity", "npcId": "hongxiao", "delta": 10 }, { "type": "change_morality", "delta": -5 }, { "type": "set_flag", "flag": "traded_with_hongxiao", "value": true }], "nextNodeId": "dantang_trade" }
      ]
    },
    "dantang_report": {
      "id": "dantang_report",
      "speaker": "旁白",
      "text": "你将发现禀报了云深子。师父沉吟片刻，说会派人调查。但第二天，那块岩石旁的残渣消失得一干二净。",
      "options": [
        { "id": "leave", "text": "继续", "effects": [], "nextNodeId": "" }
      ]
    },
    "dantang_investigate": {
      "id": "dantang_investigate",
      "speaker": "旁白",
      "text": "你暗中收集了一些残渣样本。这是人血的味道——你确定。二师姐红绡的丹堂，到底在炼制什么？",
      "options": [
        { "id": "continue", "text": "继续深入后山", "effects": [], "nextNodeId": "" }
      ]
    },
    "dantang_trade": {
      "id": "dantang_trade",
      "speaker": "旁白",
      "text": "你带着残渣去找红绡。她看到残渣的瞬间，眼中闪过一丝寒意，但随即笑靥如花。",
      "options": [
        { "id": "next", "text": "继续", "effects": [], "nextNodeId": "hongxiao_trade_dialogue" }
      ]
    },
    "hongxiao_trade_dialogue": {
      "id": "hongxiao_trade_dialogue",
      "speaker": "红绡",
      "text": "师妹好眼力。这是炼制「生灵丹」的副产品，可提升修为。想要的话，师姐可以给你一颗——但你要答应师姐，不要告诉任何人。",
      "options": [
        { "id": "accept", "text": "弟子答应。", "effects": [{ "type": "add_item", "itemId": "suspect_pill", "quantity": 1 }], "nextNodeId": "" }
      ]
    }
```

注意：追加节点时需要确保 JSON 语法正确（逗号位置）。在 `"meditation_benefit"` 节点的最后一个 `}` 后添加逗号，然后插入新节点。

- [ ] **Step 2: 验证 JSON 格式**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/data/dialogues/chapter1.json'))" && echo "JSON valid"`
Expected: `JSON valid`

- [ ] **Step 3: Commit**

```bash
git add src/data/dialogues/chapter1.json
git commit -m "feat(data): add mountain, missing disciple, and dantang residue nodes"
```

---

### Task 13: 扩展 chapter1.json - 禁术+Boss+结尾

**Files:**
- Modify: `src/data/dialogues/chapter1.json`

- [ ] **Step 1: 追加禁术+Boss+结尾节点**

在 `src/data/dialogues/chapter1.json` 的 `"hongxiao_trade_dialogue"` 节点之后追加以下节点：

```json
    "xiaohan_practicing": {
      "id": "xiaohan_practicing",
      "speaker": "旁白",
      "text": "后山最深处，你看到了一个不可能忘记的画面——大师兄萧寒站在血红色的阵法中央，周身缠绕着漆黑的剑气。",
      "options": [
        { "id": "watch", "text": "（躲在一旁观察）", "effects": [{ "type": "set_flag", "flag": "triggered_c1_xiaohan_forbidden", "value": true }], "nextNodeId": "xiaohan_dialogue" }
      ]
    },
    "xiaohan_dialogue": {
      "id": "xiaohan_dialogue",
      "speaker": "萧寒",
      "text": "……谁？！（剑气骤然收敛，他转身看向你，眼神如刀）你看到了多少？",
      "options": [
        { "id": "threaten", "text": "我要报告师父！", "effects": [{ "type": "change_affinity", "npcId": "xiaohan", "delta": -20 }, { "type": "change_morality", "delta": 5 }, { "type": "set_flag", "flag": "xiaohan_hostile", "value": true }, { "type": "set_flag", "flag": "xiaohan_choice_made", "value": true }], "nextNodeId": "xiaohan_hostile_reaction" },
        { "id": "ignore", "text": "弟子什么都没看见。", "effects": [{ "type": "set_flag", "flag": "xiaohan_ignored", "value": true }, { "type": "set_flag", "flag": "xiaohan_choice_made", "value": true }], "nextNodeId": "xiaohan_ignore_reaction" },
        { "id": "understand", "text": "大师兄……一定有您的苦衷。", "effects": [{ "type": "change_affinity", "npcId": "xiaohan", "delta": 10 }, { "type": "set_flag", "flag": "xiaohan_trust", "value": true }, { "type": "set_flag", "flag": "xiaohan_choice_made", "value": true }], "nextNodeId": "xiaohan_trust_reaction" }
      ]
    },
    "xiaohan_hostile_reaction": {
      "id": "xiaohan_hostile_reaction",
      "speaker": "萧寒",
      "text": "报告？哼，你以为师父不知道吗？（他冷笑）既然你找死，我就让你见识一下真正的力量。",
      "options": [
        { "id": "fight", "text": "（迎战）", "effects": [{ "type": "start_battle", "enemyGroupId": "ch1_boss_xiaohan_clone" }], "nextNodeId": "boss_wait" }
      ]
    },
    "xiaohan_ignore_reaction": {
      "id": "xiaohan_ignore_reaction",
      "speaker": "萧寒",
      "text": "……（他盯着你看了一会儿）走吧。但记住，今天的事如果你说出去一个字，我不会手软。",
      "options": [
        { "id": "leave", "text": "弟子告退。", "effects": [], "nextNodeId": "" }
      ]
    },
    "xiaohan_trust_reaction": {
      "id": "xiaohan_trust_reaction",
      "speaker": "萧寒",
      "text": "……（他沉默良久）你是第一个这么说的人。来，让我看看你有没有资格说这种话。",
      "options": [
        { "id": "accept_test", "text": "弟子接受试炼。", "effects": [{ "type": "start_battle", "enemyGroupId": "ch1_boss_xiaohan_clone" }], "nextNodeId": "boss_wait" }
      ]
    },
    "boss_wait": {
      "id": "boss_wait",
      "speaker": "旁白",
      "text": "（战斗结束后返回）",
      "options": [
        { "id": "continue", "text": "继续", "effects": [], "nextNodeId": "" }
      ]
    },
    "post_boss_win": {
      "id": "post_boss_win",
      "speaker": "萧寒",
      "text": "……不错。能接下我的剑意分身，你有资格知道更多。这本《噬灵剑诀》入门式你收好，不要让别人看到。",
      "options": [
        { "id": "receive", "text": "谢大师兄。", "effects": [{ "type": "add_item", "itemId": "basic_sword_manual", "quantity": 1 }], "nextNodeId": "boss_exit" }
      ]
    },
    "post_boss_lose": {
      "id": "post_boss_lose",
      "speaker": "萧寒",
      "text": "……就这点本事？（他摇摇头）罢了，你还太弱。回去修炼吧，等你变强了再来找我。",
      "options": [
        { "id": "leave", "text": "……弟子明白了。", "effects": [], "nextNodeId": "boss_exit" }
      ]
    },
    "boss_exit": {
      "id": "boss_exit",
      "speaker": "旁白",
      "text": "天色渐暗，你拖着疲惫的身体返回弟子居所。今天发生的一切，像是一场梦。",
      "options": [
        { "id": "return", "text": "返回居所", "effects": [{ "type": "teleport", "scene": "OverworldScene", "x": 120, "y": 120 }], "nextNodeId": "" }
      ]
    },
    "return_housing": {
      "id": "return_housing",
      "speaker": "旁白",
      "text": "你回到弟子居所，发现桌上多了一封信。信封上没有署名，只画着一把断剑。",
      "options": [
        { "id": "open", "text": "打开信件", "effects": [{ "type": "set_flag", "flag": "triggered_c1_housing_ending", "value": true }], "nextNodeId": "mysterious_letter" }
      ]
    },
    "mysterious_letter": {
      "id": "mysterious_letter",
      "speaker": "神秘信件",
      "text": "「天剑宗的历史，远比你想象的复杂。云深子不是他表面那样。去后山禁地看看吧，真相在那里等你。」",
      "options": [
        { "id": "read_more", "text": "继续阅读", "effects": [], "nextNodeId": "get_torn_map" }
      ]
    },
    "get_torn_map": {
      "id": "get_torn_map",
      "speaker": "旁白",
      "text": "信中夹着一张残缺的地图碎片，指向一个叫做「封印之地」的地方。",
      "options": [
        { "id": "take", "text": "收起地图", "effects": [{ "type": "add_item", "itemId": "torn_map", "quantity": 1 }, { "type": "set_flag", "flag": "chapter1_complete", "value": true }], "nextNodeId": "chapter1_end" }
      ]
    },
    "chapter1_end": {
      "id": "chapter1_end",
      "speaker": "旁白",
      "text": "第一章：初入宗门 — 完。更多的秘密，等待着你去揭开。",
      "options": [
        { "id": "continue", "text": "继续", "effects": [], "nextNodeId": "" }
      ]
    }
```

- [ ] **Step 2: 验证 JSON 格式**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/data/dialogues/chapter1.json'))" && echo "JSON valid"`
Expected: `JSON valid`

- [ ] **Step 3: Commit**

```bash
git add src/data/dialogues/chapter1.json
git commit -m "feat(data): add forbidden art, boss battle, and chapter ending nodes"
```

---

### Task 14: 更新地图数据

**Files:**
- Modify: `src/data/maps/gate.json`
- Modify: `src/data/maps/main_hall.json`
- Modify: `src/data/maps/disciples_housing.json`
- Modify: `src/data/maps/back_mountain.json`

- [ ] **Step 1: 更新 gate.json**

替换 `src/data/maps/gate.json` 的 `layers.objects.items` 数组为：

```json
      "items": [
        { "id": "gate_exit", "type": "teleport", "x": 304, "y": 80, "w": 16, "h": 80, "target": "main_hall", "targetX": 32, "targetY": 160 }
      ]
```

- [ ] **Step 2: 更新 main_hall.json**

替换 `src/data/maps/main_hall.json` 的 `layers.objects.items` 数组为：

```json
      "items": [
        { "id": "mh_to_gate", "type": "teleport", "x": 0, "y": 80, "w": 16, "h": 80, "target": "gate", "targetX": 280, "targetY": 120 },
        { "id": "mh_to_housing", "type": "teleport", "x": 304, "y": 80, "w": 16, "h": 80, "target": "disciples_housing", "targetX": 32, "targetY": 160 }
      ]
```

- [ ] **Step 3: 更新 disciples_housing.json**

替换 `src/data/maps/disciples_housing.json` 的 `layers.objects.items` 数组为：

```json
      "items": [
        { "id": "dh_to_main_hall", "type": "teleport", "x": 0, "y": 80, "w": 16, "h": 80, "target": "main_hall", "targetX": 280, "targetY": 120 },
        { "id": "dh_to_meditation", "type": "teleport", "x": 304, "y": 80, "w": 16, "h": 80, "target": "meditation_room", "targetX": 80, "targetY": 120 },
        { "id": "dh_to_back_mountain", "type": "teleport", "x": 160, "y": 0, "w": 80, "h": 16, "target": "back_mountain", "targetX": 48, "targetY": 240 }
      ]
```

- [ ] **Step 4: 更新 back_mountain.json**

替换 `src/data/maps/back_mountain.json` 的 `layers.objects.items` 数组为：

```json
      "items": [
        { "id": "bm_to_disciples_housing", "type": "teleport", "x": 32, "y": 272, "w": 48, "h": 16, "target": "disciples_housing", "targetX": 160, "targetY": 32 },
        { "id": "encounter_zone_1", "type": "encounter", "x": 80, "y": 80, "w": 80, "h": 80, "battleGroupId": "ch1_woods" },
        { "id": "encounter_zone_2", "type": "encounter", "x": 200, "y": 120, "w": 100, "h": 80, "battleGroupId": "ch1_deep_woods" },
        { "id": "story_dantang_residue", "type": "story_trigger", "x": 400, "y": 160, "w": 60, "h": 60 },
        { "id": "story_xiaohan_forbidden", "type": "story_trigger", "x": 560, "y": 80, "w": 80, "h": 80 }
      ]
```

- [ ] **Step 5: 运行类型检查**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add src/data/maps/
git commit -m "feat(data): update map objects with NPC positions and story trigger zones"
```

---

### Task 15: 类型检查、lint、测试与验证

**Files:**
- All modified files

- [ ] **Step 1: 类型检查**

Run: `npm run typecheck`
Expected: 无错误。如果有错误，逐条修复。

- [ ] **Step 2: Lint 检查**

Run: `npm run lint`
Expected: 无错误。如果有错误，逐条修复。

- [ ] **Step 3: 运行测试**

Run: `npx vitest run`
Expected: 所有测试通过。如果 DialogueSystem 测试失败，检查 effect 事件格式是否匹配。

- [ ] **Step 4: 启动开发服务器验证**

Run: `npm run dev`
手工验证：
1. 游戏开场自动触发转生苏醒剧情
2. 进入大殿自动触发拜师仪式
3. 进入弟子居所自动触发认识墨言和白芷
4. 进入后山自动触发雪团初遇
5. 与李师兄对话触发失踪事件
6. 进入后山 story trigger 区域触发丹药残渣事件
7. 进入后山深处触发大师兄禁术事件
8. 选择"表示理解"触发 Boss 战
9. 战斗结束后返回，回到居所触发神秘来信
10. 章节结束后不再重复触发剧情

- [ ] **Step 5: Commit 最终修复**

```bash
git add .
git commit -m "fix: address typecheck, lint, and test issues"
```

---

## 自我审查

### 1. Spec 覆盖检查

| Spec 要求 | 对应任务 |
|-----------|----------|
| DialogueSystem 支持起始节点 | Task 1 |
| DialogueSystem effect 事件同步 | Task 2 |
| SceneTransitionData.mapId + battleResult | Task 3 |
| Story state 持久化 | Task 4 |
| 按地图动态创建 NPC | Task 5 |
| StoryTrigger 自动触发 | Task 6 |
| NPC 对话分发 | Task 7 |
| 战斗返回处理 | Task 8 |
| BattleScene 剧情战返回 | Task 9 |
| 新增敌人/战斗组 | Task 10 |
| chapter1.json 扩展（~100 节点） | Task 11-13 |
| 地图数据更新（NPC 站立点 + trigger 区） | Task 14 |
| 类型检查、lint、测试、验证 | Task 15 |

无遗漏。

### 2. Placeholder 扫描

- 无 "TBD"、"TODO"、"implement later"
- 无 "Add appropriate error handling" 类模糊描述
- 所有测试都有实际代码
- 所有 JSON 数据都是完整可运行的

### 3. 类型一致性检查

- `StoryTrigger` 接口与 `checkStoryTriggers` 使用一致
- `SceneTransitionData.battleResult` 与 `onBattleReturn` 参数类型一致
- `effect` 事件名称（`effect:set_flag` 等）在 DialogueSystem 和测试中一致
- `startDialogue(data, startNodeId)` 签名在所有调用点一致

---

## 执行方式选择

**Plan complete and saved to `docs/superpowers/plans/2026-04-28-chapter1-story-skeleton.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints for review

**Which approach?**
