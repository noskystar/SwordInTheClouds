# 像素美术与音频资源规范

本文档定义游戏所需的全部美术与音频资源的标准，供美术制作和程序加载参考。

---

## 目录

- [视觉规范](#视觉规范)
- [图像资源清单](#图像资源清单)
- [音频资源清单](#音频资源清单)
- [资源命名规范](#资源命名规范)
- [导出设置](#导出设置)

---

## 视觉规范

### 分辨率

- **游戏基础分辨率**：320 × 180 像素
- **渲染模式**：像素完美（Pixel Perfect），禁用抗锯齿
- **缩放方式**：整数倍缩放（1×, 2×, 3×, 4×...），根据窗口大小自适应
- **UI 设计分辨率**：320 × 180，所有 UI 元素基于此分辨率设计

### 色彩规范

- **色板**：限制调色板（建议 32-64 色主色板），保持复古像素感
- **透明色**：PNG 使用 Alpha 通道，禁止用特定 RGB 色作为透明色
- **氛围主色调**：
  - 天剑宗：青白 + 金（仙气、冷峻）
  - 魔道揭露场景：暗紫 + 血红（压抑、危险）
  - 战斗场景：根据环境变化

### 像素艺术风格

- **角色**：2-3 头身 Q 版比例，或 4-5 头身少年/少女比例
- **动画帧率**：游戏逻辑 60fps，角色动画 8-12fps
- **描边**：角色外描 1px 深色描边，与环境区分
- **阴影**：简单投影或 45° 方向阴影，保持像素风格一致性

---

## 图像资源清单

### 角色精灵 (Characters)

#### 玩家角色

| 资源名 | 尺寸 | 帧数 | 说明 |
|--------|------|------|------|
| `player_idle` | 16×24 | 2 | 待机呼吸动画 |
| `player_walk_down` | 16×24 | 4 | 向下行走 |
| `player_walk_up` | 16×24 | 4 | 向上行走 |
| `player_walk_left` | 16×24 | 4 | 向左行走（向右翻转） |
| `player_attack` | 24×24 | 4 | 普通攻击 |
| `player_cast` | 16×24 | 6 | 施法/剑诀动画 |
| `player_hurt` | 16×24 | 2 | 受击动画 |
| `player_dead` | 16×24 | 1 | 倒下 |
| `player_portrait` | 64×64 | 1 | 对话立绘 |

#### 主要 NPC（6 位）

每位 NPC 至少包含：
- `npc_{id}_idle`：2 帧待机
- `npc_{id}_walk_{dir}`：4 帧×4 方向（可复用左右镜像）
- `npc_{id}_portrait`：64×64 对话立绘，含多种表情（neutral, happy, angry, sad, surprised）

| NPC ID | 身份 | 特征 |
|--------|------|------|
| `master` | 师父/云深魔君 | 白发、道袍、深不可测 |
| `senior_brother` | 大师兄 | 黑衣、佩长剑、冷漠 |
| `second_sister` | 二师姐 | 红衣、丹炉、妖艳 |
| `third_brother` | 三师兄 | 书生气质、善阵法 |
| `junior_sister` | 四师姐 | 天真外表、实则心机 |
| `spirit_pet` | 护宗灵兽 | 非人类形态（如白狐） |

#### 敌人

| 资源名 | 尺寸 | 帧数 | 说明 |
|--------|------|------|------|
| `enemy_wolf` | 24×16 | 4 | 野狼 |
| `enemy_bandit` | 16×24 | 4 | 山匪 |
| `enemy_spirit` | 16×16 | 4 | 低级灵体 |
| `enemy_elder_1` | 24×32 | 6 | 第一章小 Boss |
| `enemy_shadow_clone` | 16×24 | 4 | 大师兄的试炼分身 |

### UI 元素 (UI)

| 资源名 | 尺寸 | 说明 |
|--------|------|------|
| `ui_frame_9patch` | 16×16 | 通用窗口边框（9-patch 缩放） |
| `ui_button_normal` | 48×16 | 普通按钮 |
| `ui_button_hover` | 48×16 | 悬停状态 |
| `ui_button_pressed` | 48×16 | 按下状态 |
| `ui_hp_bar_bg` | 32×4 | HP 条背景 |
| `ui_hp_bar_fill` | 32×4 | HP 条填充 |
| `ui_mp_bar_bg` | 32×4 | MP 条背景 |
| `ui_mp_bar_fill` | 32×4 | MP 条填充 |
| `ui_atb_bar` | 32×4 | ATB 条 |
| `ui_dialogue_bg` | 320×80 | 对话文本框背景 |
| `ui_panel_inventory` | 160×120 | 背包面板 |
| `ui_icon_sword` | 8×8 | 剑图标 |
| `ui_icon_shield` | 8×8 | 盾图标 |
| `ui_icon_potion` | 8×8 | 药瓶图标 |
| `ui_element_icons` | 40×8 (5×1) | 五行图标精灵表 |

### 场景与地图 (Scenes)

| 资源名 | 尺寸 | 说明 |
|--------|------|------|
| `tileset_ground` | 128×128 | 地面瓦片集（草地、石板、泥土） |
| `tileset_building` | 128×128 | 建筑瓦片集（墙、屋顶、门、窗） |
| `tileset_props` | 128×128 | 装饰物（树、石、灯、旗） |
| `bg_title` | 320×180 | 标题画面背景 |
| `bg_battle_forest` | 320×180 | 森林战斗背景 |
| `bg_battle_hall` | 320×180 | 大殿战斗背景 |
| `bg_battle_cave` | 320×180 | 洞窟战斗背景 |

### 特效 (Effects)

| 资源名 | 尺寸 | 帧数 | 说明 |
|--------|------|------|------|
| `fx_slash` | 32×32 | 4 | 斩击特效 |
| `fx_fire` | 24×24 | 6 | 火系法术 |
| `fx_ice` | 24×24 | 6 | 水系/冰系法术 |
| `fx_thunder` | 32×32 | 6 | 雷系法术 |
| `fx_heal` | 24×24 | 6 | 治疗特效 |
| `fx_buff` | 16×16 | 4 | 增益光环 |
| `fx_levelup` | 32×32 | 8 | 升级特效 |
| `fx_hit` | 16×16 | 3 | 受击火花 |

---

## 音频资源清单

### 背景音乐 (BGM)

| 资源名 | 时长 | 氛围 | 格式 |
|--------|------|------|------|
| `bgm_title` | 2:00 | 悠扬、仙侠、神秘 | OGG |
| `bgm_overworld_day` | 2:00 | 轻快、自然 | OGG |
| `bgm_overworld_night` | 2:00 | 宁静、略带诡异 | OGG |
| `bgm_battle_normal` | 1:30 | 紧张、节奏感 | OGG |
| `bgm_battle_boss` | 2:00 | 宏大、压迫感 | OGG |
| `bgm_dialogue_tense` | 1:00 | 悬疑、不安 | OGG |
| `bgm_dialogue_peaceful` | 1:00 | 温和、日常 | OGG |
| `bgm_ending_good` | 2:00 | 悲壮、希望 | OGG |
| `bgm_ending_bad` | 2:00 | 沉重、遗憾 | OGG |

### 音效 (SFX)

| 资源名 | 时长 | 触发时机 | 格式 |
|--------|------|----------|------|
| `sfx_confirm` | 0.2s | 菜单确认 | OGG |
| `sfx_cancel` | 0.2s | 菜单取消 | OGG |
| `sfx_cursor` | 0.1s | 光标移动 | OGG |
| `sfx_step_grass` | 0.3s | 草地行走 | OGG |
| `sfx_step_stone` | 0.3s | 石板行走 | OGG |
| `sfx_sword_swing` | 0.5s | 普通攻击 | OGG |
| `sfx_sword_hit` | 0.3s | 剑命中 | OGG |
| `sfx_magic_cast` | 0.8s | 施法 | OGG |
| `sfx_fire` | 0.8s | 火系技能 | OGG |
| `sfx_ice` | 0.8s | 冰系技能 | OGG |
| `sfx_thunder` | 1.0s | 雷系技能 | OGG |
| `sfx_heal` | 0.8s | 治疗 | OGG |
| `sfx_buff` | 0.5s | 增益效果 | OGG |
| `sfx_debuff` | 0.5s | 减益效果 | OGG |
| `sfx_item_use` | 0.5s | 使用物品 | OGG |
| `sfx_equip` | 0.4s | 装备更换 | OGG |
| `sfx_levelup` | 1.5s | 升级/突破 | OGG |
| `sfx_victory` | 3.0s | 战斗胜利 | OGG |
| `sfx_defeat` | 2.0s | 战斗失败 | OGG |
| `sfx_dialogue_advance` | 0.1s | 对话翻页 | OGG |
| `sfx_gold` | 0.3s | 获得金钱 | OGG |
| `sfx_item_get` | 0.5s | 获得物品 | OGG |
| `sfx_door_open` | 0.5s | 开门/传送 | OGG |

---

## 资源命名规范

### 文件命名

- 全部小写，单词间用下划线 `_` 连接
- 格式：`{category}_{name}_{variant}`
- 动画序列：`{name}_{action}_{frame}` 或使用 TexturePacker 打包为图集

### 目录结构

```
public/assets/
├── images/
│   ├── characters/          # 角色精灵图
│   │   ├── player/
│   │   ├── npcs/
│   │   └── enemies/
│   ├── ui/                  # UI 元素
│   ├── tilesets/            # Tiled 瓦片集
│   ├── backgrounds/         # 场景背景
│   └── effects/             # 特效动画
├── audio/
│   ├── bgm/                 # 背景音乐
│   └── sfx/                 # 音效
├── tilemaps/                # Tiled 地图文件 (.tmx/.json)
├── fonts/                   # 像素字体 (.ttf/.woff)
└── data/                    # JSON 数据文件
    ├── items/
    ├── skills/
    ├── enemies/
    ├── dialogues/
    └── quests/
```

---

## 导出设置

### 图像

- **格式**：PNG-24（保留 Alpha），背景图可用 JPEG
- **压缩**：使用 pngquant 或 TinyPNG 有损压缩，目标文件大小减少 50-70%
- **精灵表**：动画序列使用 TexturePacker 打包，启用 "Trim" 和 "Power of Two"

### 音频

- **BGM**：OGG Vorbis，质量等级 5，单声道或立体声，循环无缝
- **SFX**：OGG Vorbis，质量等级 4，单声道，短音效优先使用 .wav（Phaser 会自动转换）
- **音量标准**：BGM 峰值 -12dB，SFX 峰值 -6dB
