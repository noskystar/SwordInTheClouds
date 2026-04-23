# 技术架构设计

## 1. 架构概览

本项目采用 **分层架构**，以 Phaser 3 游戏引擎为核心，将游戏逻辑、数据、UI 分离，确保模块间职责清晰。

```
┌─────────────────────────────────────────────────────────────┐
│                        呈现层 (Phaser 3)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │   Scenes    │ │  GameObjects│ │     Camera / Input      │ │
│  │ 场景管理     │ │  精灵/动画   │ │     相机/输入系统        │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                        逻辑层 (Systems)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ Battle   │ │ Dialogue │ │Inventory │ │  Progression   │  │
│  │ System   │ │ System   │ │ System   │ │   System       │  │
│  │ 战斗系统  │ │ 对话系统  │ │ 物品系统  │ │   成长系统      │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                        数据层 (Data & State)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │  Game    │ │  Player  │ │  World   │ │   Save / Load  │  │
│  │  State   │ │  Data    │ │  State   │ │   System       │  │
│  │ 游戏状态  │ │ 玩家数据  │ │ 世界状态  │ │   存档系统      │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                        资源层 (Assets)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │  Images  │ │  Audio   │ │ Tilemaps │ │   JSON Data    │  │
│  │  图片    │ │  音频    │ │  地图    │ │   数据文件      │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 2. 核心设计原则

### 2.1 场景驱动 (Scene-Driven)

Phaser 3 的 `Scene` 是核心组织单元。每个主要游戏画面独立为一个 Scene：

- **BootScene**：资源预加载、初始化配置
- **TitleScene**：标题画面、主菜单、存档选择
- **OverworldScene**：大地图探索、NPC 交互、场景切换
- **BattleScene**：回合制战斗、UI 渲染
- **DialogueScene**：剧情对话树（可作为 Overworld 的 UI Layer 或独立 Scene）
- **UIScene**：跨场景共享的 UI 层（HP 条、小地图等）

Scene 间通过 Phaser 的 `SceneManager` 通信：

```typescript
// 启动新场景
this.scene.start('BattleScene', { enemyId: 'slime_01' });

// 并行运行 UI 层
this.scene.launch('UIScene');

// 场景间事件总线
this.scene.get('OverworldScene').events.emit('player-moved', { x, y });
```

### 2.2 ECS-Lite 实体设计

不引入完整 ECS 框架，但遵循 **组件化思维**：

```typescript
// 实体 = 数据 + 行为委托
class Player extends Phaser.GameObjects.Sprite {
  stats: CharacterStats;      // 属性数据
  equipment: EquipmentSlots;  // 装备数据
  skills: Skill[];            // 技能列表
  
  // 行为委托给系统
  takeDamage(amount: number, battleSystem: BattleSystem): void {
    const actualDamage = battleSystem.calculateDamage(amount, this);
    this.stats.hp -= actualDamage;
  }
}
```

### 2.3 数据与表现分离

- **数据 (Data)**：纯 JSON/TypeScript 对象，不含 Phaser 依赖，可独立测试
- **表现 (View)**：Phaser GameObjects，只负责渲染和动画
- **逻辑 (System)**：连接数据与表现，处理游戏规则

## 3. 状态管理

### 3.1 全局状态 (GameState)

单例模式管理跨场景持久化数据：

```typescript
interface GameState {
  player: PlayerData;
  world: WorldState;
  inventory: InventoryData;
  questLog: QuestLogData;
  settings: GameSettings;
}
```

### 3.2 存档系统

- **自动存档**：场景切换、战斗胜利、关键剧情节点
- **手动存档**：菜单中最多 10 个存档位
- **导出/导入**：JSON 文件，支持跨设备迁移
- **存储介质**：localStorage（自动存档）+ IndexedDB（手动存档/大数据）

## 4. 数据流

### 4.1 战斗流程

```
[Player Input] → [BattleSystem.processTurn()] → [状态更新] → [动画播放] → [UI 刷新]
                                                           ↓
                                               [BattleSystem.checkEndCondition()]
                                                           ↓
                                              [胜利/失败/逃跑 → 场景切换]
```

### 4.2 对话流程

```
[NPC 交互] → [DialogueSystem.loadDialogue(id)] → [解析节点条件] → [显示选项]
                                                          ↓
                                              [玩家选择] → [更新 WorldState flags]
                                                          ↓
                                              [触发后续事件/场景切换]
```

## 5. 事件系统

使用 Phaser 内置的 `EventEmitter` 实现模块间解耦：

```typescript
// 定义事件常量
enum GameEvents {
  PLAYER_HP_CHANGED = 'player-hp-changed',
  INVENTORY_UPDATED = 'inventory-updated',
  DIALOGUE_STARTED = 'dialogue-started',
  BATTLE_INITIATED = 'battle-initiated',
  SCENE_TRANSITION = 'scene-transition',
}

// 全局事件总线
const gameEvents = new Phaser.Events.EventEmitter();
```

## 6. 资源管理

### 6.1 加载策略

- **BootScene**：预加载所有 UI 素材、核心精灵图、音频
- **场景懒加载**：大地图 tilemap、战斗背景按需加载
- **纹理图集 (Texture Atlas)**：使用 TexturePacker 打包精灵动画，减少 Draw Call

### 6.2 资源命名规范

```
assets/
├── images/
│   ├── characters/
│   │   ├── player_walk_{1..4}.png      # 动画序列帧
│   │   └── npc_elder_idle.png
│   ├── ui/
│   │   ├── button_normal.png
│   │   └── panel_dialogue.9.png        # 9-patch 缩放
│   └── tilesets/
│       └── forest_a2.png
├── audio/
│   ├── bgm/
│   │   └── title_theme.ogg
│   └── sfx/
│       └── sword_hit.ogg
└── data/
    ├── items.json
    ├── enemies.json
    └── dialogues/
        └── chapter01.json
```

## 7. 性能考量

- **对象池 (Object Pooling)**：战斗中的伤害数字、粒子效果复用对象
- **相机裁剪 (Camera Culling)**：大地图只渲染可见区域
- **纹理压缩**：移动端使用 WEBP/AVIF 格式
- **分辨率适配**：基础 320×180，整数倍缩放，保持像素完美

## 8. 扩展性设计

- **插件系统**：Phaser 插件注册自定义系统（如 `this.battleSystem`）
- **数据驱动**：敌人、技能、物品全部 JSON 配置，无需改代码
- **多语言预留**：所有文本抽取到 `locales/` 目录
