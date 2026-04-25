# 素材生成清单

> 由 OpenClaw Agent 使用 MiniMax Image-01 生成
> 生成时间: 2026-04-25
> 风格: 像素艺术 (Pixel Art), 中国仙侠题材

---

## 已生成素材 (Generated)

### 场景背景 (Backgrounds)

| 文件名 | 尺寸 | 说明 | 状态 |
|--------|------|------|------|
| `backgrounds/bg_title.png` | 320×180 | 标题画面背景 — 仙侠山门日落云海 | 已生成 |
| `backgrounds/bg_battle_forest.png` | 320×180 | 竹林森林战斗背景 | 已生成 |
| `backgrounds/bg_battle_hall.png` | 320×180 | 大殿战斗背景 — 龙柱火炬 | 已生成 |
| `backgrounds/bg_battle_cave.png` | 320×180 | 洞窟战斗背景 — 蓝紫水晶 | 已生成 |

### 敌人精灵 (Enemy Sprites)

| 文件名 | 尺寸 | 说明 | 状态 |
|--------|------|------|------|
| `characters/enemies/enemy_wolf.png` | 24×16 | 灵狼 — 灰毛蓝光 | 已生成 |
| `characters/enemies/enemy_bandit.png` | 16×24 | 山匪 — 持 crude 刀 | 已生成 |
| `characters/enemies/enemy_spirit.png` | 16×16 | 低级灵体 — 绿色幽灵 | 已生成 |
| `characters/enemies/enemy_elder_1.png` | 24×32 | 第一章Boss腐化长老 | 已生成 |
| `characters/enemies/enemy_shadow_clone.png` | 16×24 | 大师兄试炼暗影分身 | 已生成 |

### 角色立绘 (Character Portraits) — 待生成

| 文件名 | 尺寸 | 说明 |
|--------|------|------|
| `characters/player/player_portrait.png` | 64×64 | 玩家角色对话立绘 |
| `characters/npcs/npc_master_portrait.png` | 64×64 | 师父/云深魔君 立绘 |
| `characters/npcs/npc_senior_brother_portrait.png` | 64×64 | 大师兄 立绘 |
| `characters/npcs/npc_second_sister_portrait.png` | 64×64 | 二师姐 立绘 |
| `characters/npcs/npc_third_brother_portrait.png` | 64×64 | 三师兄 立绘 |
| `characters/npcs/npc_junior_sister_portrait.png` | 64×64 | 四师姐 立绘 |
| `characters/npcs/npc_spirit_pet_portrait.png` | 64×64 | 护宗灵兽(白狐) 立绘 |

### 玩家动画 (Player Animations) — 待生成

| 文件名 | 尺寸 | 说明 |
|--------|------|------|
| `characters/player/player_idle.png` | 16×24 | 玩家待机动画 (2帧) |
| `characters/player/player_walk_down.png` | 16×24×4 | 玩家行走动画下 (4帧) |
| `characters/player/player_walk_up.png` | 16×24×4 | 玩家行走动画上 (4帧) |
| `characters/player/player_walk_left.png` | 16×24×4 | 玩家行走动画左 (4帧) |
| `characters/player/player_walk_right.png` | 16×24×4 | 玩家行走动画右 (4帧) |

### UI 元素 (UI) — 待生成

| 文件名 | 尺寸 | 说明 |
|--------|------|------|
| `ui/ui_frame_9patch.png` | 16×16 | 通用窗口边框 (9-patch) |
| `ui/ui_bars_and_icons.png` | - | HP条/MP条/ATB条 + 图标 |
| `ui/ui_dialogue_bg.png` | 320×80 | 对话框背景 |
| `ui/ui_panel_inventory.png` | 160×120 | 背包面板 |
| `ui/ui_element_icons_grid.png` | - | 五行图标网格 |

### 瓦片集 (Tilesets) — 待生成

| 文件名 | 尺寸 | 说明 |
|--------|------|------|
| `tilesets/tileset_ground.png` | 128×128 | 地面瓦片集 |
| `tilesets/tileset_building.png` | 128×128 | 建筑瓦片集 |
| `tilesets/tileset_props.png` | 128×128 | 装饰物瓦片集 |

### 特效 (Effects) — 待生成

| 文件名 | 尺寸 | 说明 |
|--------|------|------|
| `effects/fx_slash.png` | 32×32 | 斩击特效 (4帧) |
| `effects/fx_fire.png` | 24×24 | 火系法术 (6帧) |
| `effects/fx_ice.png` | 24×24 | 冰系法术 (6帧) |
| `effects/fx_thunder.png` | 32×32 | 雷系法术 (6帧) |
| `effects/fx_heal.png` | 24×24 | 治疗特效 (6帧) |
| `effects/fx_buff.png` | 16×16 | 增益光环 (4帧) |
| `effects/fx_levelup.png` | 32×32 | 升级突破特效 (8帧) |
| `effects/fx_hit.png` | 16×16 | 受击火花 (3帧) |

---

## 生成流程

1. 使用 `openclaw capability image generate --model minimax/image-01` 生成高分辨率参考图
2. 使用 Pillow 以 `Image.NEAREST` 缩放至目标像素艺术分辨率
3. 保存为真 PNG 格式 (非 JPEG 伪 PNG)

## 重要说明

- 所有已生成素材均为真 PNG 格式，目标分辨率直接使用
- 背景素材在游戏内以 2x 缩放显示 (320×180 → 640×360)，保持像素完美
- 精灵素材以原生尺寸显示，BattleScene 已移除固定 `setDisplaySize` 以保留原始比例
