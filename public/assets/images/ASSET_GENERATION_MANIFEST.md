# 素材生成清单

> 由 OpenClaw Agent 使用 MiniMax Image-01 生成
> 生成时间: 2026-04-24
> 风格: 像素艺术 (Pixel Art), 中国仙侠题材

---

## 角色立绘 (Characters/Player + NPCs)

| 文件名 | 尺寸 | 说明 |
|--------|------|------|
| `characters/player/player_portrait.png` | 64×64 | 玩家角色对话立绘，多表情 |
| `characters/player/player_idle.png` | 16×24 | 玩家待机动画 (2帧) |
| `characters/player/player_walk_down.png` | 16×24×4 | 玩家行走动画 (4帧) |
| `characters/npcs/npc_master_portrait.png` | 64×64 | 师父/云深魔君 立绘，多表情 |
| `characters/npcs/npc_senior_brother_portrait.png` | 64×64 | 大师兄 立绘，多表情 |
| `characters/npcs/npc_second_sister_portrait.png` | 64×64 | 二师姐 立绘，多表情 |
| `characters/npcs/npc_third_brother_portrait.png` | 64×64 | 三师兄 立绘，多表情 |
| `characters/npcs/npc_junior_sister_portrait.png` | 64×64 | 四师姐 立绘，多表情 |
| `characters/npcs/npc_spirit_pet_portrait.png` | 64×64 | 护宗灵兽(白狐) 立绘，多表情 |

## 敌人 (Characters/Enemies)

| 文件名 | 尺寸 | 说明 |
|--------|------|------|
| `characters/enemies/enemy_wolf.png` | 24×16 | 野狼 (4帧动画) |
| `characters/enemies/enemy_bandit.png` | 16×24 | 山匪 (4帧动画) |
| `characters/enemies/enemy_spirit.png` | 16×16 | 低级灵体 (4帧动画) |
| `characters/enemies/enemy_elder_1.png` | 24×32 | 第一章Boss (6帧动画) |
| `characters/enemies/enemy_shadow_clone.png` | 16×24 | 大师兄试炼分身 (4帧动画) |

## UI 元素 (UI)

| 文件名 | 尺寸 | 说明 |
|--------|------|------|
| `ui/ui_frame_9patch.png` | 16×16 | 通用窗口边框 (9-patch) |
| `ui/ui_bars_and_icons.png` | - | HP条/MP条/ATB条 + 剑/盾/药瓶图标 |
| `ui/ui_dialogue_bg.png` | 320×80 | 对话框背景 |
| `ui/ui_panel_inventory.png` | 160×120 | 背包面板 |
| `ui/ui_element_icons_grid.png` | - | 五行图标（金木水火土）网格 |

## 场景背景 (Backgrounds)

| 文件名 | 尺寸 | 说明 |
|--------|------|------|
| `backgrounds/bg_title.png` | 320×180 | 标题画面背景 |
| `backgrounds/bg_battle_forest.png` | 320×180 | 森林战斗背景 |
| `backgrounds/bg_battle_hall.png` | 320×180 | 大殿战斗背景 |
| `backgrounds/bg_battle_cave.png` | 320×180 | 洞窟战斗背景 |

## 瓦片集 (Tilesets)

| 文件名 | 尺寸 | 说明 |
|--------|------|------|
| `tilesets/tileset_ground.png` | 128×128 | 地面瓦片集（草地、石板、泥土、木地板） |
| `tilesets/tileset_building.png` | 128×128 | 建筑瓦片集（墙、屋顶、门、窗、柱） |
| `tilesets/tileset_props.png` | 128×128 | 装饰物瓦片集（树、石、灯、旗、丹炉等） |

## 特效 (Effects)

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

## 待补充素材 (未生成)

- `player_walk_up`, `player_walk_left/right` (玩家其他方向行走)
- `player_attack`, `player_cast`, `player_hurt`, `player_dead` (玩家战斗动画)
- `npc_{id}_walk_{dir}` (NPC行走动画)
- 按钮状态 (hover/pressed)
- BGM/音效音频文件
- 像素字体文件

---

## 重要说明

1. **AI生成局限性**: AI生成的图片是1024×1024的高分辨率，需要用像素艺术软件（如Aseprite, Piskel）打开后按目标分辨率重新绘制或缩小处理
2. **下一步**: 建议使用 Aseprite 或 Lossless Scaling 等工具将 AI 生成的参考图转为真正的游戏分辨率像素素材
3. **nano banana 2**: 用户提到要接入 nano banana 2 做素材生成，待了解该工具后继续
