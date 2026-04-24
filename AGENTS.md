# SwordInTheClouds / 云深不知剑

基于 Phaser 3 + TypeScript 的 2D 像素风回合制 RPG 游戏项目。

## 技术栈

- **游戏引擎**：Phaser 3 (v3.70+)
- **开发语言**：TypeScript 5.0（严格模式）
- **构建工具**：Vite 5
- **测试框架**：Vitest
- **代码规范**：ESLint + Prettier

## 开发规范

### 命名

- 类名：`PascalCase`，场景以 `Scene` 结尾，系统以 `System` 结尾
- 函数/变量：`camelCase`
- 常量：`UPPER_SNAKE_CASE`
- 文件命名：kebab-case（如 `battle-scene.ts`）

### 代码组织

- 优先使用组合而非继承
- 数据与表现分离：纯数据接口不依赖 Phaser
- 系统间通过 `EventEmitter` 通信，避免直接耦合

### 提交规范

遵循 Conventional Commits：

```
<type>(<scope>): <subject>
```

常用类型：`feat`、`fix`、`docs`、`refactor`、`test`、`chore`

## 常用命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint

# 类型检查
npm run typecheck
```

## 项目结构

```
src/
├── main.ts              # 应用入口
├── config.ts            # Phaser 游戏配置
├── scenes/              # 游戏场景（Boot、Title、Overworld、Battle、Dialogue、UI）
├── entities/            # 游戏实体（Player、NPC、Enemy、Item）
├── systems/             # 核心系统（Battle、Dialogue、Inventory、Progression、Save）
├── data/                # JSON 数据定义（items、skills、enemies、dialogues、quests）
├── ui/                  # UI 组件（components、panels、hud）
├── utils/               # 工具函数
└── types/               # TypeScript 类型定义
```

## 关键设计约束

- 基础分辨率 320×180，整数倍缩放，像素完美渲染
- 存档系统：`localStorage`（自动存档）+ JSON 导出/导入
- 数据驱动：敌人、技能、物品、对话全部 JSON 配置
- 资源命名：`{category}_{name}_{variant}`，全小写下划线分隔

## 文档索引

- `docs/GDD.md` — 游戏设计总文档
- `docs/ARCHITECTURE.md` — 技术架构设计
- `docs/CORE_INTERFACES.md` — TypeScript 核心接口
- `docs/TASKS.md` — 开发任务清单
- `docs/ASSETS_GUIDE.md` — 美术与音频规范
- `docs/NARRATIVE.md` — 剧情与角色设计

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
