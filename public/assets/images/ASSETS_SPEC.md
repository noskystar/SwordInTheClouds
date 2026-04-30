# 云深不知剑 — 美术资产生成规范

## 整体风格

- **像素风**：所有角色精灵为 16×24 像素的纯像素画（pixel art），无抗锯齿、无渐变、无描边
- **配色**：中国传统水墨风 + 仙侠题材，低饱和为主，点缀高饱和（红、金、蓝）区分角色
- **视角**：2D 俯视/斜 45°（类似经典 JRPG），能看到头顶和正面
- **画布背景**：透明（PNG 格式，RGBA）
- **人物比例**：头占身高约 1/3（~8px），躯干 ~8px，腿 ~8px

---

## 一、主角（Player）

### 1.1 player_sprite.png
- **尺寸**：16×24 像素
- **格式**：PNG，透明背景
- **内容**：主角站立 idle  pose（正面/略微偏右）
- **角色设定**：16岁少年剑修，黑发高马尾，青白弟子服，腰间佩剑
- **关键特征**：
  - 头发：黑色，高马尾向右飘
  - 服装：青白相间长袍，白色内衬
  - 武器：腰间短剑（右侧）
  - 姿态：双脚并拢站立，双手自然下垂
  - 面部：简单但可辨认的五官（2px 眼睛，1px 嘴），面部朝右略偏

### 1.2 player_walk_spritesheet.png ⭐ 关键
- **尺寸**：64×24 像素（4 帧横向排列）
- **格式**：PNG，透明背景
- **内容**：4 帧行走循环动画，每帧 16×24
- **帧布局**：`[帧0][帧1][帧2][帧3]` 从左到右
- **每帧姿态**（必须严格区分，能看出迈步）：
  - **帧0**：双脚并拢站立（同 idle），作为行走起始
  - **帧1**：右腿向前迈出（屈膝），左腿在后蹬地，左臂向前摆，右臂向后摆，身体略微起伏（重心上升）
  - **帧2**：双腿分开最大（一前一后），双臂自然下垂，身体略低（重心下降）
  - **帧3**：左腿向前迈出（屈膝），右腿在后蹬地，右臂向前摆，左臂向后摆，身体略微起伏（重心上升）
- **行走动画要求**：
  - 双腿必须明显交替前后移动（至少移动 2-3 像素）
  - 双臂必须跟着摆动（与对侧腿同向）
  - 身体有上下起伏（帧1/3 比 帧0/2 高 1 像素）
  - 马尾随步伐轻微摆动

---

## 二、NPC 角色精灵（16×24 像素，每人一张）

以下 NPC 每人需要 **一张独立的 idle 图**（16×24 PNG），不再共用同一纹理。

### 2.1 npc_master_sprite.png — 云深子（掌门）
- **设定**：白发老者，仙风道骨，青色道袍，手持拂尘
- **特征**：长白胡须，青色宽袍，站姿稳重，双手背在身后
- **配色**：白（发/须）+ 青（袍）+ 金（腰带）

### 2.2 npc_senior_brother_sprite.png — 大师兄/墨言
- **设定**：20岁青年，冷峻寡言，黑衣剑修
- **特征**：束发，黑色劲装，抱剑而立，表情冷淡
- **配色**：黑（衣）+ 银（剑鞘）+ 灰（肤色）

### 2.3 npc_junior_sister_sprite.png — 红绡/白芷/陈师妹
- **设定**：16岁少女，活泼/温柔，粉色/白色长裙
- **特征**：双髻或垂发，裙摆有褶皱，双手交叠于腹前
- **配色**：粉（红绡）/ 白+绿（白芷）/ 紫（陈师妹）

> 注：当前代码中红绡、白芷、陈师妹共用此纹理。若需区分，建议生成 3 张变体：
> - `npc_hongxiao_sprite.png`（粉衣）
> - `npc_baizhi_sprite.png`（白绿衣）
> - `npc_junior_sister_sprite.png`（紫衣）

### 2.4 npc_spirit_pet_sprite.png — 雪团（灵兽）
- **设定**：白色小狐狸/灵猫，有耳朵和尾巴
- **特征**：四足站立，大尾巴蓬松，尖耳朵，眼睛大而圆
- **配色**：白（毛）+ 粉（耳内/腮红）+ 黑（眼/鼻）

### 2.5 npc_xiaohan_sprite.png — 萧寒
- **设定**：17岁少年，外冷内热，蓝白剑修服
- **特征**：短发，蓝白色劲装，单手按剑，眼神锐利
- **配色**：蓝（衣）+ 白（内衬）+ 黑（发）

### 2.6 npc_town_merchant_sprite.png — 行商
- **设定**：中年商人，微胖，棕色布衣，肩扛货袋
- **特征**：戴小帽，八字胡，笑容可掬，站姿略驼
- **配色**：棕（衣）+ 米（裤）+ 红（腰带）

### 2.7 npc_disciple_sprite.png — 普通弟子/守门弟子/镇民
- **设定**：天剑宗外门弟子，灰蓝制服，无特征面孔
- **特征**：束发，灰蓝色统一服装，站姿端正
- **配色**：灰蓝（衣）+ 黑（发）+ 棕（鞋）

---

## 三、四方向行走图（可选升级，需代码配合）

若希望角色上下左右行走都有独立动画（而非仅靠左右翻转），需以下额外素材：

### 3.1 主角四方向行走 spritesheet
- **player_walk_down.png**：64×24，4帧，向下走（看到头顶和肩膀）
- **player_walk_up.png**：64×24，4帧，向上走（看到背影）
- **player_walk_left.png**：64×24，4帧，向左走（侧面）
- **player_walk_right.png**：64×24，4帧，向右走（侧面，可 flipX 代替）

### 3.2 关键 NPC 四方向行走
- 每个 NPC 需要 3 张（down/up/left），格式同上
- 优先级：**主角 > 萧寒 > 红绡 > 墨言 > 雪团**

> 注：四方向素材需要额外代码支持（修改 `player.ts` / `npc.ts` 的动画系统）。当前代码仅支持左右翻转。

---

## 四、背景图（Backgrounds）

### 4.1 地图背景（320×180 像素）
所有背景统一尺寸 320×180，PNG 格式，像素风场景。

| 文件名 | 场景 | 描述 |
|--------|------|------|
| bg_gate.png | 天剑宗山门 | 云雾缭绕的山门，石阶向上，两侧石柱，远处山峦 |
| bg_main_hall.png | 天剑殿 | 宏大殿堂，红木柱子，青石板地，后方有掌门座 |
| bg_disciples_housing.png | 弟子居所 | 木质建筑走廊，灯笼，盆栽，温馨感 |
| bg_back_mountain.png | 后山 | 竹林/松林，小路蜿蜒，有野兽足迹，略阴森 |
| bg_meditation_room.png | 静心阁 | 榻榻米房间，蒲团，香炉，窗外有竹影 |
| bg_yunlai_town.png | 云来镇 | 古代小镇集市，石板路，店铺招牌，人群氛围 |
| bg_library.png | 万卷楼 | 巨大书架，楼梯，古籍，昏暗烛光 |

### 4.2 战斗背景（320×180 像素）
| 文件名 | 场景 |
|--------|------|
| bg_battle_forest.png | 密林空地，落叶，斑驳阳光 |
| bg_battle_hall.png | 比武擂台，青石地面，观众席模糊 |
| bg_battle_cave.png | 洞穴，钟乳石，幽蓝微光 |

---

## 五、UI 元素

### 5.1 对话框背景
| 文件名 | 尺寸 | 描述 |
|--------|------|------|
| ui_dialogue_bg.png | 320×72 | 对话底框，半透明深色，上边缘有装饰花纹 |
| ui_dialogue_box.png | 320×72 | 备选：带边框的对话框 |

### 5.2 立绘（Portraits）
- **尺寸**：建议 64×64 或 96×96 像素
- **用途**：对话框左侧显示说话者头像
- **风格**：Q版像素头像，大头身比，能清晰辨认角色
- **需要角色**：主角、云深子、萧寒、红绡、墨言、白芷、雪团、行商

---

## 六、快速生成提示词模板（供 LLM 使用）

### 通用前缀（所有角色）
```
Pixel art sprite, 16x24 pixels, transparent background, 
Chinese cultivation/xianxia RPG character, top-down view, 
no anti-aliasing, crisp pixel edges, limited color palette
```

### 主角示例
```
16x24 pixel art sprite sheet, 4-frame walk cycle horizontal layout (64x24 total), 
teenage swordsman, black hair in high ponytail, 
blue-white disciple robe, sword at waist, 
frame 0: standing, frame 1: right leg forward, 
frame 2: legs apart, frame 3: left leg forward, 
transparent background, pixel art, no blur
```

### NPC 示例（红绡）
```
16x24 pixel art sprite, young female cultivator, 
pink dress, twin buns hairstyle, gentle expression, 
standing pose, hands folded, 
transparent background, pixel art, crisp edges
```

---

## 七、文件路径映射

生成后请按以下路径放置：

```
public/assets/images/
├── characters/
│   ├── player/
│   │   ├── player_sprite.png
│   │   └── player_walk_spritesheet.png
│   └── npcs/
│       ├── npc_master_sprite.png
│       ├── npc_senior_brother_sprite.png
│       ├── npc_junior_sister_sprite.png
│       ├── npc_spirit_pet_sprite.png
│       ├── npc_xiaohan_sprite.png
│       ├── npc_hongxiao_sprite.png
│       ├── npc_moyan_sprite.png
│       ├── npc_baizhi_sprite.png
│       ├── npc_xuetuan_sprite.png
│       ├── npc_disciple_sprite.png
│       ├── npc_town_merchant_sprite.png
│       └── portraits/
│           ├── player_portrait.png
│           ├── npc_master_portrait.png
│           └── ...
├── backgrounds/
│   ├── bg_gate.png
│   ├── bg_main_hall.png
│   └── ...
└── ui/
    ├── ui_dialogue_bg.png
    └── ...
```

---

## 八、优先级建议

按以下顺序生成，影响最大优先：

1. **P0** — `player_walk_spritesheet.png`（修复"移动不像人"的核心）
2. **P0** — `player_sprite.png`（idle 与 walk 第一帧风格统一）
3. **P1** — `npc_xiaohan_sprite.png`、`npc_hongxiao_sprite.png`、`npc_master_sprite.png`（主要角色，不再共用）
4. **P1** — `npc_disciple_sprite.png`（替换当前程序生成的色块）
5. **P2** — 背景图（已有，可迭代优化）
6. **P2** — 立绘 portraits（增强对话体验）
7. **P3** — 四方向行走图（大幅提升体验，但需配合代码修改）
