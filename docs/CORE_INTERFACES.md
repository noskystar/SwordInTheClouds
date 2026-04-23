# TypeScript 核心接口定义

本文档定义游戏核心模块的 TypeScript 接口。接口以 **数据驱动** 为原则，尽量保持纯数据、无 Phaser 依赖，便于独立测试和外部工具读取。

---

## 目录

- [基础类型](#基础类型)
- [角色系统](#角色系统)
- [战斗系统](#战斗系统)
- [物品系统](#物品系统)
- [对话系统](#对话系统)
- [任务系统](#任务系统)
- [存档系统](#存档系统)

---

## 基础类型

### Element

五行属性：

```typescript
type Element = 'metal' | 'wood' | 'water' | 'fire' | 'earth';
```

### MoralAlignment

道德倾向：

```typescript
type MoralAlignment = 'righteous' | 'demonic' | 'free';
```

### Realm

修炼境界：

```typescript
type RealmStage = 'early' | 'middle' | 'late' | 'peak';

type Realm = {
  name: 'qi_refining' | 'foundation' | 'golden_core' | 'nascent_soul' | 'deity';
  stage: RealmStage;
  expToNext: number;
};
```

---

## 角色系统

### CharacterStats

基础属性：

```typescript
interface CharacterStats {
  hp: number;        // 气血
  maxHp: number;
  mp: number;        // 灵力
  maxMp: number;
  attack: number;    // 攻击
  defense: number;   // 防御
  speed: number;     // 身法（影响 ATB 条填充速度）
  insight: number;   // 悟性
  aptitude: number;  // 根骨
  luck: number;      // 机缘
}
```

### EquipmentSlot

装备槽位：

```typescript
interface EquipmentSlots {
  weapon: Equipment | null;
  armor: Equipment | null;
  boots: Equipment | null;
  accessory1: Equipment | null;
  accessory2: Equipment | null;
}
```

### Character

通用角色接口（玩家、NPC、敌人共用）：

```typescript
interface Character {
  id: string;
  name: string;
  avatar: string;            // 头像资源路径
  sprite: string;            // 精灵图资源路径
  element: Element;
  stats: CharacterStats;
  skills: string[];          // 技能 ID 列表
  equipment: EquipmentSlots;
  realm: Realm;
}
```

### PlayerData

玩家特有数据：

```typescript
interface PlayerData extends Character {
  exp: number;
  swordHeart: number;        // 剑心值（0-100）
  morality: number;          // 道德值（-100 魔道 ~ +100 正道）
  reputation: Record<string, number>; // 各势力声望
}
```

### NPCData

NPC 数据：

```typescript
interface NPCData extends Character {
  affinity: number;          // 好感度（-100 ~ +100）
  dialogues: string[];       // 可用对话 ID 列表
  schedule: NPCSchedule[];   // 昼夜行程表
  isRecruitable: boolean;    // 是否可入队
}

interface NPCSchedule {
  timeRange: [number, number]; // 游戏内时间（0-2400）
  location: { scene: string; x: number; y: number };
  behavior: 'idle' | 'patrol' | 'work';
}
```

---

## 战斗系统

### BattleEntity

战斗中的实体（参与者）：

```typescript
interface BattleEntity {
  characterId: string;
  isPlayer: boolean;
  team: 'player' | 'enemy';
  currentHp: number;
  currentMp: number;
  atbGauge: number;          // 0-1000，满值可行动
  buffs: Buff[];
  debuffs: Debuff[];
  isDead: boolean;
}
```

### Skill

技能定义：

```typescript
interface Skill {
  id: string;
  name: string;
  description: string;
  element: Element;
  cost: { mp?: number; hp?: number; swordHeart?: number };
  targetType: 'self' | 'single' | 'all' | 'row';
  targetTeam: 'ally' | 'enemy' | 'any';
  power: number;             // 威力系数
  effects: SkillEffect[];
  cooldown: number;          // 冷却回合
  requiredRealm?: Realm;     // 境界要求
  requiredSwordHeart?: number;
}

type SkillEffect =
  | { type: 'damage'; element: Element; power: number }
  | { type: 'heal'; power: number }
  | { type: 'buff'; stat: keyof CharacterStats; value: number; duration: number }
  | { type: 'debuff'; stat: keyof CharacterStats; value: number; duration: number }
  | { type: 'drain'; mp?: number; hp?: number }
  | { type: 'combo'; partnerId: string; comboSkillId: string };
```

### Buff / Debuff

状态效果：

```typescript
interface StatusEffect {
  id: string;
  name: string;
  statModifier: Partial<CharacterStats>;
  duration: number;          // 持续回合数，-1 表示永久
  isRemovable: boolean;
}

type Buff = StatusEffect;
type Debuff = StatusEffect;
```

### BattleState

战斗状态：

```typescript
interface BattleState {
  entities: BattleEntity[];
  turnCount: number;
  activeEntityIndex: number;
  phase: 'init' | 'atb' | 'action' | 'resolution' | 'victory' | 'defeat';
  escapeAttempts: number;
  rewards?: BattleRewards;
}

interface BattleRewards {
  exp: number;
  items: { itemId: string; quantity: number }[];
  gold: number;
}
```

---

## 物品系统

### ItemType

物品分类：

```typescript
type ItemType =
  | 'weapon'
  | 'armor'
  | 'boots'
  | 'accessory'
  | 'consumable'    // 丹药等消耗品
  | 'material'      // 炼器/炼丹材料
  | 'skill_book'    // 功法秘籍
  | 'quest';        // 任务道具
```

### Item

物品定义：

```typescript
interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  maxStack: number;
  sellPrice: number;
  buyPrice: number;
}
```

### Equipment

装备（继承 Item）：

```typescript
interface Equipment extends Item {
  type: 'weapon' | 'armor' | 'boots' | 'accessory';
  element?: Element;
  statBonus: Partial<CharacterStats>;
  specialEffect?: string;    // 特效描述
}
```

### Consumable

消耗品（继承 Item）：

```typescript
interface Consumable extends Item {
  type: 'consumable';
  effect: ConsumableEffect;
  useInBattle: boolean;
  useInField: boolean;
}

type ConsumableEffect =
  | { type: 'heal_hp'; value: number }
  | { type: 'heal_mp'; value: number }
  | { type: 'restore_both'; hp: number; mp: number }
  | { type: 'revive'; hpPercent: number }
  | { type: 'buff'; effect: StatusEffect; duration: number }
  | { type: 'teleport'; destination: string }
  | { type: 'realm_breakthrough_hint' };
```

### InventoryItem

背包中的物品实例：

```typescript
interface InventoryItem {
  itemId: string;
  quantity: number;
  equipped?: boolean;        // 是否已装备
}

interface InventoryData {
  items: InventoryItem[];
  maxSlots: number;
  materials: InventoryItem[]; // 独立材料袋
}
```

### CraftRecipe

合成配方：

```typescript
interface CraftRecipe {
  id: string;
  name: string;
  type: 'alchemy' | 'forge' | 'sew';
  materials: { itemId: string; quantity: number }[];
  result: { itemId: string; quantity: number };
  requiredInsight: number;   // 悟性要求
}
```

---

## 对话系统

### DialogueNode

对话节点：

```typescript
interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  avatar?: string;
  emotion?: 'neutral' | 'happy' | 'angry' | 'sad' | 'surprised';
  options: DialogueOption[];
  autoAdvance?: boolean;     // 是否自动进入下一节点
  autoAdvanceDelay?: number; // 自动推进延迟（毫秒）
}
```

### DialogueOption

对话选项：

```typescript
interface DialogueOption {
  id: string;
  text: string;
  condition?: DialogueCondition;
  effects: DialogueEffect[];
  nextNodeId?: string;       // null 表示结束对话
  timeLimit?: number;        // 限时选择（毫秒），超时默认执行 defaultAction
}

type DialogueCondition =
  | { type: 'stat_check'; stat: keyof CharacterStats; minValue: number }
  | { type: 'affinity_check'; npcId: string; minValue: number }
  | { type: 'item_check'; itemId: string; quantity?: number }
  | { type: 'flag_check'; flag: string; value: boolean }
  | { type: 'morality_check'; min?: number; max?: number }
  | { type: 'realm_check'; realm: string; stage?: RealmStage }
  | { type: 'compound'; operator: 'and' | 'or'; conditions: DialogueCondition[] };
```

### DialogueEffect

对话产生的效果：

```typescript
type DialogueEffect =
  | { type: 'set_flag'; flag: string; value: boolean | number | string }
  | { type: 'change_affinity'; npcId: string; delta: number }
  | { type: 'change_morality'; delta: number }
  | { type: 'change_sword_heart'; delta: number }
  | { type: 'add_item'; itemId: string; quantity: number }
  | { type: 'remove_item'; itemId: string; quantity: number }
  | { type: 'start_battle'; enemyGroupId: string }
  | { type: 'start_quest'; questId: string }
  | { type: 'advance_quest'; questId: string; stage: string }
  | { type: 'teleport'; scene: string; x: number; y: number }
  | { type: 'unlock_skill'; skillId: string }
  | { type: 'play_sound'; soundId: string }
  | { type: 'show_animation'; animationId: string }
  | { type: 'delay'; ms: number };
```

---

## 任务系统

### Quest

任务定义：

```typescript
interface Quest {
  id: string;
  name: string;
  description: string;
  type: 'main' | 'side' | 'daily';
  stages: QuestStage[];
  rewards: QuestReward[];
  prerequisites?: QuestCondition[];
}

interface QuestStage {
  id: string;
  description: string;
  objectives: QuestObjective[];
  nextStageId?: string;
}

type QuestObjective =
  | { type: 'kill'; enemyId: string; count: number; current: number }
  | { type: 'collect'; itemId: string; count: number; current: number }
  | { type: 'talk'; npcId: string; dialogueNodeId?: string }
  | { type: 'reach'; scene: string; x?: number; y?: number }
  | { type: 'flag'; flag: string; expectedValue: boolean | number | string }
  | { type: 'craft'; recipeId: string; count: number }
  | { type: 'breakthrough'; realm: string };
```

### QuestReward

任务奖励：

```typescript
type QuestReward =
  | { type: 'exp'; value: number }
  | { type: 'item'; itemId: string; quantity: number }
  | { type: 'gold'; value: number }
  | { type: 'affinity'; npcId: string; value: number }
  | { type: 'skill'; skillId: string }
  | { type: 'sword_heart'; value: number }
  | { type: 'reputation'; faction: string; value: number };
```

### QuestLog

任务日志：

```typescript
interface QuestLog {
  active: ActiveQuest[];
  completed: string[];       // 已完成任务 ID 列表
  failed: string[];
}

interface ActiveQuest {
  questId: string;
  currentStageId: string;
  objectives: QuestObjective[];
  startTime: number;         // 时间戳
}
```

---

## 存档系统

### SaveData

存档数据结构：

```typescript
interface SaveData {
  version: string;           // 存档格式版本，用于迁移
  timestamp: number;
  playTime: number;          // 累计游戏时间（秒）
  
  // 核心数据
  player: PlayerData;
  inventory: InventoryData;
  questLog: QuestLog;
  
  // 世界状态
  world: WorldState;
  
  // 系统设置
  settings: GameSettings;
}

interface WorldState {
  currentScene: string;
  playerPosition: { x: number; y: number };
  flags: Record<string, boolean | number | string>;
  npcStates: Record<string, NPCState>;
  unlockedAreas: string[];
  gameTime: number;          // 游戏内累计时间
  dayNightCycle: number;     // 0-2400
}

interface NPCState {
  affinity: number;
  currentLocation: { scene: string; x: number; y: number };
  isDead?: boolean;
  isRecruited?: boolean;
  dialogueProgress: string[]; // 已触发的对话节点 ID
}

interface GameSettings {
  bgmVolume: number;         // 0-1
  sfxVolume: number;
  textSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  battleSpeed: number;       // ATB 倍速
  screenShake: boolean;
  language: 'zh-CN' | 'zh-TW' | 'en';
}
```
