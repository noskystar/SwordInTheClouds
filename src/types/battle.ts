export type FiveElement = 'metal' | 'wood' | 'earth' | 'water' | 'fire';

export type TargetType = 'single' | 'all' | 'self';

export type BuffType =
  | 'atk_up'
  | 'atk_down'
  | 'def_up'
  | 'def_down'
  | 'spd_up'
  | 'spd_down'
  | 'regen'
  | 'poison'
  | 'stun';

export interface SkillData {
  id: string;
  name: string;
  description: string;
  mpCost: number;
  power: number;
  targetType: TargetType;
  element: FiveElement;
  isUltimate: boolean;
}

export interface EnemyData {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  element: FiveElement;
  expReward: number;
  dropItems: DropItem[];
  skills: string[];
  color: number;
}

export interface DropItem {
  itemId: string;
  chance: number;
  minQuantity: number;
  maxQuantity: number;
}

export interface BattleGroupData {
  id: string;
  name: string;
  enemies: string[];
  backgroundColor: number;
}

export interface BattleReward {
  exp: number;
  drops: { itemId: string; quantity: number }[];
}

export interface Buff {
  type: BuffType;
  value: number;
  duration: number;
  sourceId: string;
}

export interface BattleEntity {
  id: string;
  name: string;
  isPlayer: boolean;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  element: FiveElement;
  atbGauge: number;
  isAlive: boolean;
  buffs: Buff[];
  skills: string[];
  color: number;
  swordIntent: number;
}

export type BattleAction =
  | { type: 'attack'; targetId: string }
  | { type: 'defend' }
  | { type: 'flee' }
  | { type: 'skill'; skillId: string; targetId?: string }
  | { type: 'ultimate'; targetId?: string };

export type BattleResult = 'victory' | 'defeat' | 'fled';

export interface ComboCondition {
  requiredElements: FiveElement[];
  requiredBuffs?: BuffType[];
  minSwordIntent?: number;
}

export interface ComboSkillData {
  id: string;
  name: string;
  description: string;
  power: number;
  element: FiveElement;
  condition: ComboCondition;
}

export type BattleEvent =
  | { type: 'turn_ready'; entityId: string }
  | { type: 'action_executed'; entityId: string; action: BattleAction }
  | { type: 'damage_dealt'; sourceId: string; targetId: string; damage: number; isCritical?: boolean }
  | { type: 'heal'; targetId: string; amount: number }
  | { type: 'mp_changed'; entityId: string; delta: number }
  | { type: 'sword_intent_changed'; entityId: string; value: number }
  | { type: 'buff_applied'; targetId: string; buff: Buff }
  | { type: 'buff_removed'; targetId: string; buffType: BuffType }
  | { type: 'buff_tick'; targetId: string; buffType: BuffType; damage?: number; heal?: number }
  | { type: 'entity_defeated'; entityId: string }
  | { type: 'battle_ended'; result: BattleResult; rewards?: BattleReward }
  | { type: 'flee_attempted'; success: boolean }
  | { type: 'combo_triggered'; comboId: string; entityIds: string[] }
  | { type: 'defend'; entityId: string };
