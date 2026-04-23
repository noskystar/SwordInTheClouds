export type ItemCategory = 'consumable' | 'equipment' | 'material' | 'quest';

export type EquipmentType = 'weapon' | 'armor' | 'boots' | 'accessory';

export type EquipmentSlot = 'weapon' | 'armor' | 'boots' | 'accessory1' | 'accessory2';

export interface ItemData {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  iconColor: number;
  maxStack: number;
  effect?: ItemEffect;
  equipmentType?: EquipmentType;
  stats?: Partial<Record<'attack' | 'defense' | 'speed' | 'maxHp' | 'maxMp' | 'critRate' | 'critDamage', number>>;
}

export interface ItemEffect {
  type: 'heal_hp' | 'heal_mp' | 'buff';
  value: number;
  duration?: number;
}

export interface InventorySlot {
  itemId: string | null;
  quantity: number;
}

export interface EquippedItem {
  slot: EquipmentSlot;
  itemId: string;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  ingredients: { itemId: string; quantity: number }[];
  outputItemId: string;
  outputQuantity: number;
}
