import { EventEmitter } from '../utils/event-emitter';
import type { InventorySlot, ItemData, ItemEffect } from '../types/inventory';

export const INVENTORY_SIZE = 48;
export const DEFAULT_STACK_SIZE = 99;

export interface InventoryUseResult {
  success: boolean;
  consumed: boolean;
  effect?: ItemEffect;
  message: string;
}

export class InventorySystem {
  private eventEmitter = new EventEmitter();
  private slots: InventorySlot[];
  private itemData = new Map<string, ItemData>();

  constructor(itemDataList: ItemData[] = []) {
    this.slots = Array.from({ length: INVENTORY_SIZE }, () => ({ itemId: null, quantity: 0 }));
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

  getItemData(itemId: string): ItemData | undefined {
    return this.itemData.get(itemId);
  }

  getSlots(): InventorySlot[] {
    return this.slots.map((s) => ({ ...s }));
  }

  getSlot(index: number): InventorySlot | undefined {
    if (index < 0 || index >= INVENTORY_SIZE) return undefined;
    return { ...this.slots[index] };
  }

  findItemSlot(itemId: string): number {
    return this.slots.findIndex((s) => s.itemId === itemId);
  }

  findEmptySlot(): number {
    return this.slots.findIndex((s) => s.itemId === null);
  }

  findStackableSlot(itemId: string): number {
    const item = this.itemData.get(itemId);
    if (!item) return -1;
    const maxStack = item.maxStack ?? DEFAULT_STACK_SIZE;
    return this.slots.findIndex((s) => s.itemId === itemId && s.quantity < maxStack);
  }

  getItemQuantity(itemId: string): number {
    return this.slots
      .filter((s) => s.itemId === itemId)
      .reduce((sum, s) => sum + s.quantity, 0);
  }

  addItem(itemId: string, quantity: number): { success: boolean; added: number; remaining: number } {
    if (quantity <= 0) return { success: false, added: 0, remaining: quantity };
    const item = this.itemData.get(itemId);
    if (!item) return { success: false, added: 0, remaining: quantity };

    const maxStack = item.maxStack ?? DEFAULT_STACK_SIZE;
    let remaining = quantity;
    let added = 0;

    // Try to stack with existing
    for (let i = 0; i < INVENTORY_SIZE && remaining > 0; i++) {
      if (this.slots[i].itemId === itemId && this.slots[i].quantity < maxStack) {
        const space = maxStack - this.slots[i].quantity;
        const amount = Math.min(space, remaining);
        this.slots[i].quantity += amount;
        remaining -= amount;
        added += amount;
      }
    }

    // Try empty slots
    for (let i = 0; i < INVENTORY_SIZE && remaining > 0; i++) {
      if (this.slots[i].itemId === null) {
        const amount = Math.min(maxStack, remaining);
        this.slots[i] = { itemId, quantity: amount };
        remaining -= amount;
        added += amount;
      }
    }

    if (added > 0) {
      this.emit('item_added', { itemId, quantity: added });
    }

    return { success: remaining === 0, added, remaining };
  }

  removeItem(itemId: string, quantity: number): { success: boolean; removed: number } {
    if (quantity <= 0) return { success: false, removed: 0 };

    const totalAvailable = this.getItemQuantity(itemId);
    if (totalAvailable < quantity) return { success: false, removed: 0 };

    let remaining = quantity;
    let removed = 0;

    for (let i = 0; i < INVENTORY_SIZE && remaining > 0; i++) {
      if (this.slots[i].itemId === itemId) {
        const amount = Math.min(this.slots[i].quantity, remaining);
        this.slots[i].quantity -= amount;
        remaining -= amount;
        removed += amount;

        if (this.slots[i].quantity === 0) {
          this.slots[i] = { itemId: null, quantity: 0 };
        }
      }
    }

    this.emit('item_removed', { itemId, quantity: removed });
    return { success: true, removed };
  }

  removeFromSlot(slotIndex: number, quantity = 1): { success: boolean; removed: number } {
    if (slotIndex < 0 || slotIndex >= INVENTORY_SIZE) return { success: false, removed: 0 };
    const slot = this.slots[slotIndex];
    if (!slot.itemId || slot.quantity < quantity) return { success: false, removed: 0 };

    const itemId = slot.itemId;
    slot.quantity -= quantity;
    if (slot.quantity === 0) {
      this.slots[slotIndex] = { itemId: null, quantity: 0 };
    }

    this.emit('item_removed', { itemId, quantity });
    return { success: true, removed: quantity };
  }

  moveItem(fromIndex: number, toIndex: number): boolean {
    if (fromIndex < 0 || fromIndex >= INVENTORY_SIZE || toIndex < 0 || toIndex >= INVENTORY_SIZE) {
      return false;
    }
    if (fromIndex === toIndex) return true;

    const fromSlot = this.slots[fromIndex];
    const toSlot = this.slots[toIndex];

    if (!fromSlot.itemId) return false;

    // Stack if same item
    if (toSlot.itemId === fromSlot.itemId) {
      const item = this.itemData.get(fromSlot.itemId);
      const maxStack = item?.maxStack ?? DEFAULT_STACK_SIZE;
      const space = maxStack - toSlot.quantity;
      if (space > 0) {
        const amount = Math.min(space, fromSlot.quantity);
        toSlot.quantity += amount;
        fromSlot.quantity -= amount;
        if (fromSlot.quantity === 0) {
          this.slots[fromIndex] = { itemId: null, quantity: 0 };
        }
        this.emit('item_moved', { fromIndex, toIndex, quantity: amount });
        return true;
      }
    }

    // Swap
    const temp = this.slots[fromIndex];
    this.slots[fromIndex] = this.slots[toIndex];
    this.slots[toIndex] = temp;
    this.emit('item_moved', { fromIndex, toIndex });
    return true;
  }

  swapSlots(fromIndex: number, toIndex: number): boolean {
    return this.moveItem(fromIndex, toIndex);
  }

  useItem(slotIndex: number): InventoryUseResult {
    if (slotIndex < 0 || slotIndex >= INVENTORY_SIZE) {
      return { success: false, consumed: false, message: '无效槽位' };
    }
    const slot = this.slots[slotIndex];
    if (!slot.itemId || slot.quantity <= 0) {
      return { success: false, consumed: false, message: '空槽位' };
    }

    const item = this.itemData.get(slot.itemId);
    if (!item) {
      return { success: false, consumed: false, message: '未知物品' };
    }

    if (item.category !== 'consumable') {
      return { success: false, consumed: false, message: '该物品无法使用' };
    }

    if (!item.effect) {
      return { success: false, consumed: false, message: '该物品没有效果' };
    }

    slot.quantity -= 1;
    if (slot.quantity === 0) {
      this.slots[slotIndex] = { itemId: null, quantity: 0 };
    }

    this.emit('item_used', { itemId: item.id, slotIndex, effect: item.effect });
    return { success: true, consumed: true, effect: item.effect, message: `使用了 ${item.name}` };
  }

  useItemById(itemId: string): InventoryUseResult {
    const slotIndex = this.findItemSlot(itemId);
    if (slotIndex === -1) {
      return { success: false, consumed: false, message: '物品不在背包中' };
    }
    return this.useItem(slotIndex);
  }

  hasItem(itemId: string, quantity = 1): boolean {
    return this.getItemQuantity(itemId) >= quantity;
  }

  getItemsByCategory(category: string): { slotIndex: number; itemId: string; quantity: number }[] {
    return this.slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => {
        if (!slot.itemId) return false;
        const item = this.itemData.get(slot.itemId);
        return item?.category === category;
      })
      .map(({ slot, index }) => ({ slotIndex: index, itemId: slot.itemId!, quantity: slot.quantity }));
  }

  getUsedSlotsCount(): number {
    return this.slots.filter((s) => s.itemId !== null).length;
  }

  getTotalQuantity(itemId: string): number {
    return this.getItemQuantity(itemId);
  }

  clear(): void {
    for (let i = 0; i < INVENTORY_SIZE; i++) {
      this.slots[i] = { itemId: null, quantity: 0 };
    }
    this.emit('inventory_cleared', {});
  }
}
