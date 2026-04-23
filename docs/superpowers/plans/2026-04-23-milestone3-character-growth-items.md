# Milestone 3: Character Growth and Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement all 10 Milestone 3 tasks: character growth systems (stats, realm, cultivation, sword heart, affection) and item systems (inventory, equipment, consumables, crafting, quick bar).

**Architecture:** Data-driven JSON configuration + pure TypeScript system classes using EventEmitter for decoupled communication. UI uses Phaser GameObjects with colored rectangles and text labels (no external assets). Systems are testable without Phaser.

**Tech Stack:** TypeScript 5, Phaser 3, Vitest, jsdom

---

## File Structure

### Types (foundation)
- `src/types/character-stats.ts` — CharacterStats interface and growth types
- `src/types/inventory.ts` — Item, InventorySlot, EquipmentSlot types
- `src/types/realm.ts` — Realm, RealmStage types
- `src/types/cultivation.ts` — CultivationArt types
- `src/types/sword-heart.ts` — SwordHeart types
- `src/types/affection.ts` — AffectionLevel, AffectionEvent types

### Data (JSON, all independent)
- `src/data/items.json` — All items (consumables, materials, quest items)
- `src/data/weapons.json` — Weapon equipment data
- `src/data/armors.json` — Armor equipment data
- `src/data/accessories.json` — Accessory equipment data
- `src/data/recipes.json` — Crafting recipes
- `src/data/cultivation-arts.json` — Cultivation arts / 功法
- `src/data/characters.json` — NPC characters for affection system
- `src/data/affection-events.json` — Affection event triggers

### Systems (implementation order follows dependencies)
- `src/entities/character.ts` — Base Character class with CharacterStats
- `src/systems/realm-system.ts` — Realm progression
- `src/systems/cultivation-system.ts` — Cultivation art equipping
- `src/systems/sword-heart-system.ts` — Sword heart progression
- `src/systems/affection-system.ts` — Affection tracking
- `src/systems/inventory-system.ts` — 48-slot inventory management
- `src/systems/equipment-system.ts` — Equip/unequip gear
- `src/systems/crafting-system.ts` — Recipe-based crafting
- `src/ui/inventory-panel.ts` — Inventory overlay panel UI
- `src/ui/quick-bar.ts` — 6-slot quick bar UI

### Tests
- `tests/character-stats.test.ts`
- `tests/inventory-system.test.ts`
- `tests/crafting-system.test.ts`

---

## Task 1: CharacterStats Foundation (3.1)

**Files:**
- Create: `src/types/character-stats.ts`
- Create: `src/entities/character.ts`
- Modify: `src/systems/battle-system.ts` (integrate CharacterStats)
- Test: `tests/character-stats.test.ts`

### Step 1: Define CharacterStats types

```typescript
export interface CharacterStats {
  level: number;
  exp: number;
  expToNextLevel: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  critRate: number; // 0-1
  critDamage: number; // multiplier, e.g. 1.5
  element: FiveElement;
}

export interface StatGrowth {
  hpPerLevel: number;
  mpPerLevel: number;
  attackPerLevel: number;
  defensePerLevel: number;
  speedPerLevel: number;
}

export interface LevelUpResult {
  newLevel: number;
  hpGained: number;
  mpGained: number;
  attackGained: number;
  defenseGained: number;
  speedGained: number;
}
```

### Step 2: Create Character base class

Character class holds stats, handles level-up, emits events.

### Step 3: Integrate with BattleSystem

Modify `PlayerBattleStats` creation to pull from Character instance.

### Step 4: Write tests

Test level-up logic, stat calculations, event emission.

---

## Task 2: Realm System (3.2)

**Files:**
- Create: `src/types/realm.ts`
- Create: `src/systems/realm-system.ts`

Realms: 炼气(LianQi) → 筑基(ZhuJi) → 金丹(JinDan) → 元婴(YuanYing) → 化神(HuaShen)
Each realm has 3 stages (early/mid/late). Realm breakthroughs give massive stat bonuses.

---

## Task 3: Cultivation Arts (3.3)

**Files:**
- Create: `src/data/cultivation-arts.json`
- Create: `src/types/cultivation.ts`
- Create: `src/systems/cultivation-system.ts`

Arts modify stat growth and available skills. One active art at a time.

---

## Task 4: Sword Heart System (3.4)

**Files:**
- Create: `src/types/sword-heart.ts`
- Create: `src/systems/sword-heart-system.ts`

Independent experience bar for "sword heart". Gains from moral choices and combat. Unlocks passive skills at thresholds.

---

## Task 5: Affection System (3.5)

**Files:**
- Create: `src/data/characters.json`
- Create: `src/data/affection-events.json`
- Create: `src/types/affection.ts`
- Create: `src/systems/affection-system.ts`

6 characters, affection levels from 0-100. Events modify affection. Affects dialogue branches.

---

## Task 6: Inventory System (3.6)

**Files:**
- Create: `src/types/inventory.ts`
- Create: `src/data/items.json`
- Create: `src/systems/inventory-system.ts`
- Test: `tests/inventory-system.test.ts`

48-slot grid. Items stack by quantity. Categories: consumable, equipment, material, quest.

---

## Task 7: Equipment System (3.7)

**Files:**
- Create: `src/data/weapons.json`
- Create: `src/data/armors.json`
- Create: `src/data/accessories.json`
- Create: `src/systems/equipment-system.ts`

Slots: weapon, armor, boots, accessory1, accessory2. Equipment modifies CharacterStats.

---

## Task 8: Item Use (3.8)

**Files:**
- Modify: `src/systems/inventory-system.ts`
- Modify: `src/systems/battle-system.ts`

Consumables: HP potions, MP potions. Can use from inventory or quick bar in battle.

---

## Task 9: Crafting System (3.9)

**Files:**
- Create: `src/data/recipes.json`
- Create: `src/systems/crafting-system.ts`
- Test: `tests/crafting-system.test.ts`

Recipes require materials. Output new item. Consumes inputs.

---

## Task 10: Quick Bar (3.10)

**Files:**
- Create: `src/ui/quick-bar.ts`

6 slots. Assign items for quick use in battle.

---

## Execution Order

1. Write all type definitions (Task 1 types, 2-5 types, 6 types)
2. Write all JSON data files (parallel)
3. Implement Character base class + tests
4. Implement Realm, Cultivation, SwordHeart, Affection systems (parallel)
5. Implement Inventory + Equipment systems + tests
6. Implement Crafting system + tests
7. Implement Item Use integration
8. Implement Inventory Panel UI + Quick Bar UI
9. Run full test suite and typecheck
10. Commit
