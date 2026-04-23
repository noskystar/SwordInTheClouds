# 云深不知剑 (SwordInTheClouds)

> **副标题**：我转生成了剑宗小师妹，但全门派都是反派？

基于浏览器的 2D 像素风剧情向回合制 RPG，使用 Phaser 3 + TypeScript 纯前端实现。

玩家扮演一名现代大学生，意外转生到修仙世界，成为天剑宗刚入门的小师妹。宗门表面上是正道魁首，实则全宗上下皆为"反派"——你需要在"维持正派 façade"与"揭露真相"之间做出选择，最终影响整个修仙界的命运。

---

## 目录

- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [文档索引](#文档索引)
- [开发指南](#开发指南)
- [项目状态](#项目状态)
- [许可证](#许可证)

---

## 功能特性

### 核心玩法

- **探索系统**：2D 俯视角像素地图，支持八方向移动，可交互 NPC、宝箱、传送点、修炼静室
- **回合制战斗（ATB 变体）**：基于"身法"属性的速度条系统，支持普通攻击、剑诀（技能）、道具、防御、逃跑
- **五行相克**：金木水火土属性克制关系，影响 ±30% 伤害
- **连携系统**：特定角色组合触发合击技

### 角色成长

- **八维属性**：气血、灵力、攻击、防御、身法、悟性、根骨、机缘
- **境界系统**：炼气 → 筑基 → 金丹 → 元婴 → 化神（每境分前/中/后/圆满）
- **功法修炼**：装备不同功法改变战斗定位和属性成长倾向
- **剑心系统**：独立经验条，通过道德抉择和剧情事件提升，影响可用技能池
- **好感度系统**：与 6 位主要角色的好感度影响剧情分支和合击技解锁

### 剧情与世界观

- **对话树系统**：每个对话节点包含 2–4 个选项，支持属性检定、隐藏选项、时间限制抉择
- **因果簿**：所有重大选择记录存档，可在菜单查看
- **多结局设计**：3 个主要结局 + 2 个隐藏结局
- **昼夜循环**：影响 NPC 位置和特殊事件触发

### 物品与合成

- **装备系统**：武器 + 衣服 + 鞋子 + 饰品 × 2
- **48 格背包** + 专属材料袋（999 堆叠）
- **合成系统**：丹炉/锻造台合成高级物品（需要配方）

---

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18.0
- npm >= 9.0

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/noskystar/SwordInTheClouds.git
cd SwordInTheClouds

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 构建生产版本
npm run build
```

### 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器（含热重载） |
| `npm run build` | 构建生产版本至 `dist/` |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | 运行 ESLint 代码检查 |
| `npm run typecheck` | 运行 TypeScript 类型检查 |

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 游戏引擎 | [Phaser 3](https://phaser.io/) | ^3.70 |
| 开发语言 | [TypeScript](https://www.typescriptlang.org/) | ^5.0 |
| 构建工具 | [Vite](https://vitejs.dev/) | ^5.0 |
| 代码规范 | ESLint + Prettier | - |
| 测试框架 | Vitest | ^1.0 |

---

## 项目结构

```
SwordInTheClouds/
├── public/                  # 静态资源（直接复制到 dist）
│   ├── assets/              # 游戏素材
│   │   ├── images/          # 精灵图、背景、UI
│   │   ├── tilemaps/        # Tiled 地图文件
│   │   ├── audio/           # 音效与音乐
│   │   └── fonts/           # 像素字体
│   └── index.html           # 入口 HTML
├── src/
│   ├── main.ts              # 应用入口
│   ├── config.ts            # Phaser 游戏配置
│   ├── scenes/              # 游戏场景
│   │   ├── BootScene.ts     # 资源预加载
│   │   ├── TitleScene.ts    # 标题画面
│   │   ├── OverworldScene.ts # 大地图探索
│   │   ├── BattleScene.ts   # 战斗场景
│   │   ├── DialogueScene.ts # 剧情对话
│   │   ├── UIScene.ts       # 共用 UI 层
│   │   └── ...
│   ├── entities/            # 游戏实体
│   │   ├── Player.ts        # 玩家角色
│   │   ├── NPC.ts           # 非玩家角色
│   │   ├── Enemy.ts         # 敌人
│   │   └── Item.ts          # 地图物品
│   ├── systems/             # 核心系统
│   │   ├── BattleSystem.ts  # 战斗逻辑
│   │   ├── DialogueSystem.ts # 对话树引擎
│   │   ├── InventorySystem.ts # 物品栏
│   │   ├── ProgressionSystem.ts # 角色成长
│   │   └── SaveSystem.ts    # 存档管理
│   ├── data/                # 游戏数据
│   │   ├── items/           # 物品定义
│   │   ├── skills/          # 技能定义
│   │   ├── enemies/         # 敌人定义
│   │   ├── dialogues/       # 对话脚本
│   │   └── quests/          # 任务定义
│   ├── ui/                  # UI 组件
│   │   ├── components/      # 可复用组件
│   │   ├── panels/          # 面板（背包、状态等）
│   │   └── hud/             # 战斗中 HUD
│   ├── utils/               # 工具函数
│   └── types/               # TypeScript 类型定义
├── docs/                    # 项目文档
├── tests/                   # 测试文件
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置
├── eslint.config.js         # ESLint 配置
└── package.json             # 项目依赖
```

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [docs/GDD.md](./docs/GDD.md) | 游戏设计总文档（世界观、核心机制、多结局） |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 技术架构与数据流设计 |
| [docs/CORE_INTERFACES.md](./docs/CORE_INTERFACES.md) | TypeScript 核心类接口定义 |
| [docs/TASKS.md](./docs/TASKS.md) | 开发任务清单（按依赖排序） |
| [docs/ASSETS_GUIDE.md](./docs/ASSETS_GUIDE.md) | 像素美术与音频资源规范 |
| [docs/NARRATIVE.md](./docs/NARRATIVE.md) | 剧情与角色设计 |

---

## 开发指南

### 代码规范

- 使用 TypeScript 严格模式
- 类名使用 PascalCase，函数与变量使用 camelCase
- 常量使用 UPPER_SNAKE_CASE
- 场景类以 `Scene` 结尾，系统类以 `System` 结尾
- 优先使用组合而非继承

### 提交规范

提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <subject>

<body>
```

常用类型：`feat`、`fix`、`docs`、`refactor`、`test`、`chore`

### 分支策略

- `main`：稳定分支，仅通过 PR 合并
- `feat/<name>`：功能分支
- `fix/<name>`：修复分支

---

## 项目状态

### 开发进度

| 阶段 | 状态 | 说明 |
|------|------|------|
| Milestone 1：项目骨架 | ✅ 已完成 | Vite+TS+Phaser，场景管理，像素完美渲染 |
| Milestone 2：核心系统 | ✅ 已完成 | 对话系统、战斗系统（ATB）、连携技 |
| Milestone 3：角色成长与物品 | ✅ 已完成 | 角色属性、境界、功法、剑心、物品栏、装备、合成 |
| Milestone 4：世界与剧情 | 🔲 开发中 | 第一章地图、剧情脚本、多结局 |
| Milestone 5：UI与体验打磨 | 🔲 待开始 | 主菜单、HUD、触控适配 |
| Milestone 6：测试与发布 | 🔲 待开始 | 单元测试、性能优化、部署 |

### 关键里程碑

- ✅ **阶段二 2.3 战斗系统（ATB）**：ATB速度条、五行相克、剑意绝招、Buff/Debuff、连携技
- ✅ **阶段三 3.1-3.10**：CharacterStats、境界系统、功法装备、剑心、好感度、物品栏、装备穿戴、合成系统、快捷栏
- ✅ **119+ 个单元测试**，TypeScript 严格模式，零类型错误
- ✅ **GitHub Pages 部署**（CI/CD 自动构建）

### 技术统计

| 指标 | 数值 |
|------|------|
| 总测试数 | 119+ |
| TypeScript | 严格模式 |
| 构建 | ✅ 通过 |
| Lint | ✅ 通过 |

---

## 许可证

[MIT](./LICENSE)
