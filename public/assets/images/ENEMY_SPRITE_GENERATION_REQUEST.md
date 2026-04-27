# 敌人精灵素材生成请求

> 由 OpenClaw Agent 使用 MiniMax Image-01 生成
> 风格: 像素艺术 (Pixel Art), 中国仙侠题材
> 目标分辨率: 16×16 ~ 24×32 像素

---

## 现有素材风格参考

已生成的敌人精灵采用 **低分辨率 16-bit 复古像素艺术** 风格：

| 文件名 | 尺寸 | 描述 |
|--------|------|------|
| `enemy_wolf.png` | 24×16 | 灵狼 — 深蓝底色 + 青色灵焰光环，侧姿站立 |
| `enemy_bandit.png` | 16×24 | 山匪 — 深红武袍 + 长枪，战斗站姿 |
| `enemy_spirit.png` | 16×16 | 低级灵体 — 翠绿玉色 + 嫩芽角，萌系小龙坐姿 |
| `enemy_elder_1.png` | 24×32 | 腐化长老 — 紫黑长袍 + 邪气环绕 |
| `enemy_shadow_clone.png` | 16×24 | 暗影分身 — 深紫半透明 + 残影效果 |

**共同特征：**
- 剪影清晰，高对比色块定义形状
- 每 sprite 使用 4~6 种主色
- 五行元素通过主色调区分（木=绿，水=蓝，火=红，金=白/银，土=棕/黄）
- 适当使用 1px 高光或轮廓光表现"灵气"

---

## 待生成素材 (Missing Sprites)

### 1. 岩傀儡 / Stone Golem

| 属性 | 值 |
|------|-----|
| 文件名 | `characters/enemies/enemy_stone_golem.png` |
| 建议尺寸 | **24×32** (高大笨重型敌人) |
| 五行属性 | 土 (Earth) |
| 主色调 | 深褐 #5C4033、岩灰 #8B8680、暗金 #B8860B |
| 辅助色 | 裂纹发光土黄 #DAA520、苔藓绿 #6B8E23 |

**详细描述：**
- 体型魁梧，由不规则岩石块堆叠而成的人形构造体
- 头部是一块较大的圆石，嵌有两颗暗金色的发光眼睛（1px 光点）
- 躯干中央有一道垂直的裂纹，从中透出微弱的土黄色灵气光芒
- 双肩和膝盖处有突出的尖锐岩块
- 双臂粗壮下垂，手掌为巨大的石拳
- 姿态：双脚稳扎站立，略微前倾，给人一种沉重不可撼动的感觉
- 下半身可以比上半身略宽，增强"根基稳固"的土元素特征

**生成提示词 (Prompt)：**
```
Pixel art sprite of a stone golem, 24x32 pixels, Chinese xianxia fantasy style. 
A hulking humanoid made of rugged brown and gray rock blocks. 
Large round boulder head with two small glowing golden eyes. 
Vertical crack in torso with faint yellow qi light leaking through. 
Jagged rock protrusions on shoulders and knees. 
Massive stone fists. Earth element creature. 
Semi-isometric view. Limited 6-color palette: deep brown, stone gray, dark gold, moss green, crack-glow yellow, shadow black.
Pixel art, crisp edges, no anti-aliasing, retro 16-bit RPG style.
```

---

### 2. 火狐 / Flame Fox

| 属性 | 值 |
|------|-----|
| 文件名 | `characters/enemies/enemy_flame_fox.png` |
| 建议尺寸 | **24×24** (中型敏捷型敌人) |
| 五行属性 | 火 (Fire) |
| 主色调 | 火焰红 #DC143C、橙红 #FF4500、金焰 #FFD700 |
| 辅助色 | 深棕毛发 #8B4513、尾尖白 #FFF8DC、眼白 #FFFFFF |

**详细描述：**
- 一只优雅的狐狸，尾巴蓬松且带有火焰效果
- 毛色以深棕为底，四肢和腹部过渡到火焰橙红色
- 最显著特征是 **九条尾巴中的主尾**（因像素限制可简化为 1~2 条大尾），尾尖燃烧着金色火焰
- 眼睛为竖瞳，金黄色，带凶性
- 姿态：低伏准备扑击的狩猎姿态，四肢弯曲，尾巴上扬展开
- 身体周围有几缕飘散的火焰粒子（2~3 个 1px 橙/金色像素点）
- 耳朵尖和四爪带有火焰高光

**生成提示词 (Prompt)：**
```
Pixel art sprite of a flame fox, 24x24 pixels, Chinese xianxia fantasy style. 
An elegant fox with deep brown fur transitioning to flame orange-red on legs and belly. 
Large fluffy tail with golden fire burning at the tip. 
Vertical golden slit eyes showing aggression. 
Crouching hunting stance, ready to pounce. 
Small fire ember particles floating around body. 
Fire element spirit beast. 
Semi-isometric view. Limited 6-color palette: crimson red, orange-red, golden flame, dark brown, cream white, shadow black.
Pixel art, crisp edges, no anti-aliasing, retro 16-bit RPG style.
```

---

### 3. 水蛇 / Water Serpent

| 属性 | 值 |
|------|-----|
| 文件名 | `characters/enemies/enemy_water_serpent.png` |
| 建议尺寸 | **24×24** (蛇形，身体盘绕) |
| 五行属性 | 水 (Water) |
| 主色调 | 深海蓝 #00008B、水蓝 #00BFFF、鳞光青 #20B2AA |
| 辅助色 | 珍珠白腹部 #F0F8FF、红眼 #DC143C、水花白 #FFFFFF |

**详细描述：**
- 一条盘绕身体的东方风格水蛇/蛟龙幼体
- 身体呈 S 形盘绕，头部抬起，吐信子
- 鳞片以深蓝为底，背部有浅青色鳞纹（用 1px 浅色点表现）
- 腹部为珍珠白色，与背部形成明显分界
- 眼睛为猩红色竖瞳，带冷酷感
- 头顶有两个极小的突起（龙角雏形）
- 身体周围有 2~3 个水花/水珠效果像素点
- 姿态：防御性盘绕，头部高高抬起，准备攻击

**生成提示词 (Prompt)：**
```
Pixel art sprite of a water serpent, 24x24 pixels, Chinese xianxia fantasy style. 
An eastern-style serpent with body coiled in S-shape, head raised high. 
Deep blue scaly body with light teal scale patterns on back. 
Pearl white belly with clear boundary. 
Crimson red vertical slit eyes. Two tiny horn buds on head suggesting juvenile dragon. 
Small water droplet particles around body. 
Water element creature. 
Semi-isometric view. Limited 6-color palette: deep blue, cyan, teal, pearl white, crimson red, shadow black.
Pixel art, crisp edges, no anti-aliasing, retro 16-bit RPG style.
```

---

### 4. 金刃怪 / Metal Blade

| 属性 | 值 |
|------|-----|
| 文件名 | `characters/enemies/enemy_metal_blade.png` |
| 建议尺寸 | **16×24** (人形武器怪) |
| 五行属性 | 金 (Metal) |
| 主色调 | 冷银 #C0C0C0、钢灰 #708090、铁锈棕 #8B4513 |
| 辅助色 | 刃口白光 #FFFFFF、核心暗红 #8B0000、关节黑 #2F4F4F |

**详细描述：**
- 一种由废弃兵器聚合而成的妖怪，人形但身体由各种金属武器拼接而成
- 头部是一顶残破的古代战盔，面罩处透出暗红色的"核心"光芒
- 右臂直接是一把巨大的长刀/阔剑，刀刃朝前
- 左臂是带锯齿的短刃或铁爪
- 躯干由锁子甲片和铁板拼凑，有明显的焊接/锈迹纹理
- 腿部较粗壮，脚为铁靴
- 姿态：持刀站立，刀尖指地，给人肃杀之感
- 刀刃边缘有 1px 白色高光表现锋利

**生成提示词 (Prompt)：**
```
Pixel art sprite of a metal blade monster, 16x24 pixels, Chinese xianxia fantasy style. 
A humanoid creature formed from scrap weapons and armor pieces. 
Head is a broken ancient battle helmet with dark red glowing core visible through visor. 
Right arm is a massive long blade pointing forward. 
Left arm is a serrated short blade or iron claw. 
Torso made of chain mail and iron plates with weld/rust marks. 
Thick legs ending in iron boots. 
Metal element creature. 
Semi-isometric view. Limited 6-color palette: silver, steel gray, rust brown, white blade-edge, dark red core glow, shadow black.
Pixel art, crisp edges, no anti-aliasing, retro 16-bit RPG style.
```

---

## 生成后处理

1. 使用 Pillow 将生成的高分辨率参考图缩放至目标像素分辨率
2. 缩放方法: `Image.NEAREST` (保持像素边缘锐利)
3. 保存为真 PNG 格式 (非 JPEG)
4. 将生成的文件放入 `public/assets/images/characters/enemies/` 目录
5. 不需要修改代码 — 映射关系已在 `src/scenes/battle-scene.ts:getEnemySpriteKey()` 中配置好

---

## 五行元素颜色速查

| 元素 | 英文 | 主色 | 高光 |
|------|------|------|------|
| 金 | Metal | 银白 / 钢灰 | 刃口白光 |
| 木 | Wood | 翠绿 / 深绿 | 嫩芽黄绿 |
| 水 | Water | 深蓝 / 海蓝 | 水波光白 |
| 火 | Fire | 赤红 / 橙红 | 金焰 |
| 土 | Earth | 褐 / 岩灰 | 土黄裂纹光 |
