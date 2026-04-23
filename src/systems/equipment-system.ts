import { EventEmitter } from '../utils/event-emitter';
import type { EquipmentSlot, ItemData } from '../types/inventory';

export const EQUIPMENT_SLOTS: EquipmentSlot[] = ['weapon', 'armor', 'boots', 'accessory1', 'accessory2'];

export interface EquipmentChangeEvent {
  slot: EquipmentSlot;
  oldItemId: string | null;
  newItemId: string | null;
  statChanges: Partial<Record<string, number>>;
}

export class EquipmentSystem {
  private eventEmitter = new EventEmitter();
  private equipped = new Map<EquipmentSlot, string | null>();
  private itemData = new Map<string, ItemData>();

  constructor(itemDataList: ItemData[] = []) {
    for (const slot of EQUIPMENT_SLOTS) {
      this.equipped.set(slot, null);
    }
    for (const item of itemDataList) {
      this.itemData.set(item.id, item);
    }
  }

  on(event: string, callback: (data: unknown) => void): void {
    this.eventEmitter.on(event, callback);
  }

  off(event: string, callback: (data: unknown) => void): void {
    this.eventEmitter.off(event, callback);
  }

  private emit(event: string, data?: unknown): void {
    this.eventEmitter.emit(event, data);
  }

  loadItemData(itemDataList: ItemData[]): void {
    for (const item of itemDataList) {
      this.itemData.set(item.id, item);
    }
  }

  equip(itemId: string, preferredSlot?: EquipmentSlot): { success: boolean; slot?: EquipmentSlot; previousItemId?: string | null } {
    const item = this.itemData.get(itemId);
    if (!item || item.category !== 'equipment' || !item.equipmentType) {
      return { success: false };
    }

    let targetSlot: EquipmentSlot;

    if (preferredSlot && this.isValidSlotForType(preferredSlot, item.equipmentType)) {
      targetSlot = preferredSlot;
    } else if (item.equipmentType === 'accessory') {
      // Find first empty accessory slot
      if (!this.equipped.get('accessory1')) {
        targetSlot = 'accessory1';
      } else if (!this.equipped.get('accessory2')) {
        targetSlot = 'accessory2';
      } else {
        targetSlot = 'accessory1'; // Overwrite first
      }
    } else {
      targetSlot = item.equipmentType as EquipmentSlot;
    }

    const previousItemId = this.equipped.get(targetSlot) ?? null;
    this.equipped.set(targetSlot, itemId);

    const statChanges = this.calculateStatChanges(itemId, previousItemId);

    this.emit('equipment_changed', {
      slot: targetSlot,
      oldItemId: previousItemId,
      newItemId: itemId,
      statChanges,
    } as EquipmentChangeEvent);

    return { success: true, slot: targetSlot, previousItemId };
  }

  unequip(slot: EquipmentSlot): { success: boolean; itemId?: string | null } {
    const itemId = this.equipped.get(slot);
    if (!itemId) return { success: false };

    this.equipped.set(slot, null);

    this.emit('equipment_changed', {
      slot,
      oldItemId: itemId,
      newItemId: null,
      statChanges: this.calculateStatChanges(null, itemId),
    } as EquipmentChangeEvent);

    return { success: true, itemId };
  }

  getEquipped(slot: EquipmentSlot): string | null {
    return this.equipped.get(slot) ?? null;
  }

  getAllEquipped(): Record<EquipmentSlot, string | null> {
    return {
      weapon: this.equipped.get('weapon') ?? null,
      armor: this.equipped.get('armor') ?? null,
      boots: this.equipped.get('boots') ?? null,
      accessory1: this.equipped.get('accessory1') ?? null,
      accessory2: this.equipped.get('accessory2') ?? null,
    };
  }

  getEquippedItemData(slot: EquipmentSlot): ItemData | undefined {
    const itemId = this.equipped.get(slot);
    return itemId ? this.itemData.get(itemId) : undefined;
  }

  getTotalStatBonus(): Partial<Record<'attack' | 'defense' | 'speed' | 'maxHp' | 'maxMp' | 'critRate' | 'critDamage', number>> {
    const total: Partial<Record<'attack' | 'defense' | 'speed' | 'maxHp' | 'maxMp' | 'critRate' | 'critDamage', number>> = {};

    for (const slot of EQUIPMENT_SLOTS) {
      const itemId = this.equipped.get(slot);
      if (!itemId) continue;
      const item = this.itemData.get(itemId);
      if (!item?.stats) continue;

      for (const [stat, value] of Object.entries(item.stats)) {
        const key = stat as keyof typeof total;
        total[key] = (total[key] ?? 0) + (value ?? 0);
      }
    }

    return total;
  }

  isSlotEquipped(slot: EquipmentSlot): boolean {
    return this.equipped.get(slot) !== null;
  }

  getEquippedSlots(): EquipmentSlot[] {
    return EQUIPMENT_SLOTS.filter((slot) => this.equipped.get(slot) !== null);
  }

  private isValidSlotForType(slot: EquipmentSlot, type: string): boolean {
    if (type === 'weapon') return slot === 'weapon';
    if (type === 'armor') return slot === 'armor';
    if (type === 'boots') return slot === 'boots';
    if (type === 'accessory') return slot === 'accessory1' || slot === 'accessory2';
    return false;
  }

  private calculateStatChanges(newItemId: string | null, oldItemId: string | null): Partial<Record<string, number>> {
    const changes: Partial<Record<string, number>> = {};

    const newItem = newItemId ? this.itemData.get(newItemId) : undefined;
    const oldItem = oldItemId ? this.itemData.get(oldItemId) : undefined;

    const allStats = new Set([
      ...Object.keys(newItem?.stats ?? {}),
      ...Object.keys(oldItem?.stats ?? {}),
    ]);

    for (const stat of allStats) {
      const newVal = newItem?.stats?.[stat as keyof typeof newItem.stats] ?? 0;
      const oldVal = oldItem?.stats?.[stat as keyof typeof oldItem.stats] ?? 0;
      const diff = newVal - oldVal;
      if (diff !== 0) {
        changes[stat] = diff;
      }
    }

    return changes;
  }
}
