import type { Scene } from 'phaser';
import type { InventorySystem } from '../systems/inventory-system';

export const QUICK_SLOT_COUNT = 6;
export const QUICK_SLOT_SIZE = 16;
export const QUICK_SLOT_GAP = 2;

export class QuickBar extends Phaser.GameObjects.Container {
  private inventorySystem: InventorySystem;
  private slotAssignments: (string | null)[];
  private slotSprites: Phaser.GameObjects.Rectangle[] = [];
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private keyHintTexts: Phaser.GameObjects.Text[] = [];

  constructor(scene: Scene, inventorySystem: InventorySystem) {
    const totalWidth = QUICK_SLOT_COUNT * (QUICK_SLOT_SIZE + QUICK_SLOT_GAP) - QUICK_SLOT_GAP;
    const x = (320 - totalWidth) / 2;
    const y = 180 - QUICK_SLOT_SIZE - 4;
    super(scene, x, y);
    this.inventorySystem = inventorySystem;
    this.slotAssignments = Array(QUICK_SLOT_COUNT).fill(null);
    this.createBar();
    this.setDepth(50);
    scene.add.existing(this);

    inventorySystem.on('item_removed', () => this.refresh());
    inventorySystem.on('item_added', () => this.refresh());
  }

  private createBar(): void {
    for (let i = 0; i < QUICK_SLOT_COUNT; i++) {
      const slotX = i * (QUICK_SLOT_SIZE + QUICK_SLOT_GAP) + QUICK_SLOT_SIZE / 2;
      const slotY = QUICK_SLOT_SIZE / 2;

      const slot = this.scene.add.rectangle(slotX, slotY, QUICK_SLOT_SIZE, QUICK_SLOT_SIZE, 0x2d2d44);
      slot.setStrokeStyle(1, 0x4a4a6a);
      this.add(slot);
      this.slotSprites.push(slot);

      const text = this.scene.add.text(slotX, slotY, '', {
        fontSize: '6px',
        color: '#ffffff',
        fontFamily: 'monospace',
      });
      text.setOrigin(0.5);
      this.add(text);
      this.slotTexts.push(text);

      // Key hint (1-6)
      const hint = this.scene.add.text(slotX, -4, `${i + 1}`, {
        fontSize: '5px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      });
      hint.setOrigin(0.5);
      this.add(hint);
      this.keyHintTexts.push(hint);
    }
  }

  refresh(): void {
    for (let i = 0; i < QUICK_SLOT_COUNT; i++) {
      const itemId = this.slotAssignments[i];
      const sprite = this.slotSprites[i];
      const text = this.slotTexts[i];

      if (itemId) {
        const itemData = this.inventorySystem.getItemData(itemId);
        const quantity = this.inventorySystem.getItemQuantity(itemId);

        if (quantity > 0) {
          sprite.setFillStyle(itemData?.iconColor ?? 0x666666);
          sprite.setStrokeStyle(1, 0x4a90d9);
          text.setText(`${quantity}`);
        } else {
          // Item was consumed, clear slot
          this.slotAssignments[i] = null;
          sprite.setFillStyle(0x2d2d44);
          sprite.setStrokeStyle(1, 0x4a4a6a);
          text.setText('');
        }
      } else {
        sprite.setFillStyle(0x2d2d44);
        sprite.setStrokeStyle(1, 0x4a4a6a);
        text.setText('');
      }
    }
  }

  assignItem(slotIndex: number, itemId: string | null): boolean {
    if (slotIndex < 0 || slotIndex >= QUICK_SLOT_COUNT) return false;

    if (itemId === null) {
      this.slotAssignments[slotIndex] = null;
    } else {
      // Validate item exists
      const itemData = this.inventorySystem.getItemData(itemId);
      if (!itemData) return false;
      this.slotAssignments[slotIndex] = itemId;
    }

    this.refresh();
    return true;
  }

  getAssignedItem(slotIndex: number): string | null {
    if (slotIndex < 0 || slotIndex >= QUICK_SLOT_COUNT) return null;
    return this.slotAssignments[slotIndex];
  }

  useSlot(slotIndex: number): { success: boolean; itemId?: string; effect?: unknown } {
    if (slotIndex < 0 || slotIndex >= QUICK_SLOT_COUNT) {
      return { success: false };
    }

    const itemId = this.slotAssignments[slotIndex];
    if (!itemId) {
      return { success: false };
    }

    const result = this.inventorySystem.useItemById(itemId);
    if (result.success && result.consumed) {
      this.refresh();
      return { success: true, itemId, effect: result.effect };
    }

    return { success: false };
  }

  getAssignments(): (string | null)[] {
    return [...this.slotAssignments];
  }
}
