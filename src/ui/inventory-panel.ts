import type { Scene } from 'phaser';
import type { InventorySystem } from '../systems/inventory-system';
import { uiTextStyle } from './text-style';

export const SLOT_SIZE = 18;
export const SLOT_GAP = 2;
export const GRID_COLS = 8;
export const GRID_ROWS = 6;
export const PANEL_WIDTH = GRID_COLS * (SLOT_SIZE + SLOT_GAP) + SLOT_GAP + 4;
export const PANEL_HEIGHT = GRID_ROWS * (SLOT_SIZE + SLOT_GAP) + SLOT_GAP + 24;

export class InventoryPanel extends Phaser.GameObjects.Container {
  private inventorySystem: InventorySystem;
  private slotSprites: Phaser.GameObjects.Rectangle[] = [];
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private isOpen = false;
  private bg!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
  private titleText!: Phaser.GameObjects.Text;

  constructor(scene: Scene, inventorySystem: InventorySystem) {
    const x = (320 - PANEL_WIDTH) / 2;
    const y = (180 - PANEL_HEIGHT) / 2;
    super(scene, x, y);
    this.inventorySystem = inventorySystem;
    this.createPanel();
    this.setDepth(100);
    this.setVisible(false);
    scene.add.existing(this);

    // Update when inventory changes
    inventorySystem.on('item_added', () => this.refresh());
    inventorySystem.on('item_removed', () => this.refresh());
    inventorySystem.on('item_moved', () => this.refresh());
    inventorySystem.on('item_used', () => this.refresh());
  }

  private createPanel(): void {
    // Background - try to use the inventory panel image
    if (this.scene.textures.exists('ui_panel_inventory')) {
      this.bg = this.scene.add.image(
        PANEL_WIDTH / 2,
        PANEL_HEIGHT / 2,
        'ui_panel_inventory'
      );
      this.bg.setDisplaySize(PANEL_WIDTH, PANEL_HEIGHT);
      this.bg.setOrigin(0.5);
    } else {
      this.bg = this.scene.add.rectangle(
        PANEL_WIDTH / 2,
        PANEL_HEIGHT / 2,
        PANEL_WIDTH,
        PANEL_HEIGHT,
        0x1a1a2e,
        0.95
      );
      this.bg.setStrokeStyle(1, 0x4a90d9);
    }
    this.add(this.bg);

    // Title
    this.titleText = this.scene.add.text(PANEL_WIDTH / 2, 10, '物品栏', uiTextStyle({
      fontSize: '8px',
      color: '#ffffff',
    }));
    this.titleText.setOrigin(0.5);
    this.add(this.titleText);

    // Grid slots
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const slotX = SLOT_GAP + 2 + col * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2;
        const slotY = 20 + row * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2;

        const slot = this.scene.add.rectangle(slotX, slotY, SLOT_SIZE, SLOT_SIZE, 0x2d2d44);
        slot.setStrokeStyle(1, 0x4a4a6a);
        this.add(slot);
        this.slotSprites.push(slot);

        const text = this.scene.add.text(slotX, slotY, '', uiTextStyle({
          fontSize: '6px',
          color: '#ffffff',
        }));
        text.setOrigin(0.5);
        this.add(text);
        this.slotTexts.push(text);
      }
    }
  }

  refresh(): void {
    const slots = this.inventorySystem.getSlots();
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const sprite = this.slotSprites[i];
      const text = this.slotTexts[i];

      if (slot.itemId && slot.quantity > 0) {
        const itemData = this.inventorySystem.getItemData(slot.itemId);
        sprite.setFillStyle(itemData?.iconColor ?? 0x666666);
        sprite.setStrokeStyle(1, 0x4a90d9);
        text.setText(`${slot.quantity}`);
      } else {
        sprite.setFillStyle(0x2d2d44);
        sprite.setStrokeStyle(1, 0x4a4a6a);
        text.setText('');
      }
    }
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    this.isOpen = true;
    this.setVisible(true);
    this.refresh();
  }

  close(): void {
    this.isOpen = false;
    this.setVisible(false);
  }

  isVisible(): boolean {
    return this.isOpen;
  }
}
