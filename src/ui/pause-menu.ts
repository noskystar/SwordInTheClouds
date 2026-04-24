import type { Scene } from 'phaser';
import type { InventorySystem } from '../systems/inventory-system';
import type { QuestSystem } from '../systems/quest-system';
import type { DayNightSystem } from '../systems/day-night-system';
import { SettingsSystem } from '../systems/settings-system';
import { SettingsPanel } from './settings-panel';
import { InventoryPanel } from './inventory-panel';

const TAB_WIDTH = 50;
const CONTENT_X = TAB_WIDTH + 4;

export class PauseMenu extends Phaser.GameObjects.Container {
  private bg!: Phaser.GameObjects.Rectangle;
  private tabTexts: Phaser.GameObjects.Text[] = [];
  private contentContainer!: Phaser.GameObjects.Container;
  private selectedTab = 0;
  private isOpen = false;

  // Sub-panels
  private settingsPanel!: SettingsPanel;
  private inventoryPanel!: InventoryPanel;

  // Data refs
  private questSystem: QuestSystem;
  private dayNightSystem: DayNightSystem;
  private settingsSystem: SettingsSystem;

  // Content elements (recreated per tab)
  private contentElements: Phaser.GameObjects.GameObject[] = [];

  private readonly tabs = ['状态', '背包', '任务', '设置'];

  constructor(
    scene: Scene,
    inventorySystem: InventorySystem,
    questSystem: QuestSystem,
    dayNightSystem: DayNightSystem,
    settingsSystem: SettingsSystem,
    private playerPosition: () => { x: number; y: number },
    private currentMapName: () => string,
  ) {
    super(scene, 0, 0);
    this.questSystem = questSystem;
    this.dayNightSystem = dayNightSystem;
    this.settingsSystem = settingsSystem;

    this.createBackground();
    this.createTabs();
    this.createContentArea();
    this.createSubPanels(inventorySystem);

    this.setDepth(150);
    this.setVisible(false);
    scene.add.existing(this);
  }

  private createBackground(): void {
    this.bg = this.scene.add.rectangle(160, 90, 320, 180, 0x000000, 0.85);
    this.add(this.bg);
  }

  private createTabs(): void {
    for (let i = 0; i < this.tabs.length; i++) {
      const y = 20 + i * 28;
      const text = this.scene.add.text(6, y, this.tabs[i], {
        fontSize: '8px',
        color: '#888888',
        fontFamily: 'monospace',
        backgroundColor: '#00000000',
        padding: { x: 3, y: 2 },
      });
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => this.selectTab(i));
      this.tabTexts.push(text);
      this.add(text);
    }
  }

  private createContentArea(): void {
    this.contentContainer = this.scene.add.container(CONTENT_X, 4);
    this.add(this.contentContainer);
  }

  private createSubPanels(inventorySystem: InventorySystem): void {
    // Settings panel reuses the existing component but positioned inside our content
    this.settingsPanel = new SettingsPanel(this.scene, this.settingsSystem);
    // Inventory panel
    this.inventoryPanel = new InventoryPanel(this.scene, inventorySystem);
  }

  private selectTab(index: number): void {
    this.selectedTab = index;
    this.updateTabHighlight();
    this.refreshContent();
  }

  private updateTabHighlight(): void {
    for (let i = 0; i < this.tabTexts.length; i++) {
      const text = this.tabTexts[i];
      if (i === this.selectedTab) {
        text.setColor('#4a90d9');
        text.setBackgroundColor('#1a3a5a');
      } else {
        text.setColor('#888888');
        text.setBackgroundColor('#00000000');
      }
    }
  }

  private clearContent(): void {
    for (const el of this.contentElements) {
      el.destroy();
    }
    this.contentElements = [];
    this.settingsPanel.setVisible(false);
    this.inventoryPanel.setVisible(false);
  }

  private refreshContent(): void {
    this.clearContent();

    switch (this.selectedTab) {
      case 0:
        this.showStatusTab();
        break;
      case 1:
        this.showInventoryTab();
        break;
      case 2:
        this.showQuestTab();
        break;
      case 3:
        this.showSettingsTab();
        break;
    }
  }

  private showStatusTab(): void {
    const pos = this.playerPosition();
    const mapName = this.currentMapName();
    const time = Math.floor(this.dayNightSystem.getTime());
    const phase = this.dayNightSystem.getPhaseName();

    const lines = [
      `当前地图: ${mapName}`,
      `位置: (${Math.round(pos.x)}, ${Math.round(pos.y)})`,
      `时间: ${time} (${phase})`,
      '',
      '—— 属性 ——',
      '等级: 1',
      '境界: 炼气期',
      '',
      '—— 剑心 ——',
      '当前: 初醒',
    ];

    let y = 12;
    for (const line of lines) {
      const text = this.scene.add.text(8, y, line, {
        fontSize: '7px',
        color: '#cccccc',
        fontFamily: 'monospace',
      });
      this.contentContainer.add(text);
      this.contentElements.push(text);
      y += 11;
    }
  }

  private showInventoryTab(): void {
    // Reposition inventory panel inside our content area
    this.inventoryPanel.setPosition(CONTENT_X + 8, 8);
    this.inventoryPanel.setVisible(true);
    this.inventoryPanel.refresh();
    // We don't add it to contentContainer because it's already in the scene.
    // Just track it for cleanup.
    this.contentElements.push(this.inventoryPanel);
  }

  private showQuestTab(): void {
    const activeQuests = this.questSystem.getActiveQuests();
    const completedQuests = this.questSystem.getCompletedQuests();

    let y = 12;

    const header1 = this.scene.add.text(8, y, `进行中的任务 (${activeQuests.length})`, {
      fontSize: '8px',
      color: '#4a90d9',
      fontFamily: 'monospace',
    });
    this.contentContainer.add(header1);
    this.contentElements.push(header1);
    y += 14;

    if (activeQuests.length === 0) {
      const empty = this.scene.add.text(8, y, '暂无进行中的任务', {
        fontSize: '7px',
        color: '#666666',
        fontFamily: 'monospace',
      });
      this.contentContainer.add(empty);
      this.contentElements.push(empty);
      y += 12;
    } else {
      for (const quest of activeQuests) {
        const questData = this.questSystem.getQuestData(quest.questId);
        const name = this.scene.add.text(8, y, questData?.name ?? quest.questId, {
          fontSize: '7px',
          color: '#ffffff',
          fontFamily: 'monospace',
        });
        this.contentContainer.add(name);
        this.contentElements.push(name);
        y += 10;

        const stage = questData?.stages[quest.currentStageIndex];
        if (stage) {
          const desc = this.scene.add.text(12, y, stage.description, {
            fontSize: '6px',
            color: '#aaaaaa',
            fontFamily: 'monospace',
          });
          this.contentContainer.add(desc);
          this.contentElements.push(desc);
          y += 10;
        }
        y += 4;
      }
    }

    y += 8;
    const header2 = this.scene.add.text(8, y, `已完成 (${completedQuests.length})`, {
      fontSize: '8px',
      color: '#66aa66',
      fontFamily: 'monospace',
    });
    this.contentContainer.add(header2);
    this.contentElements.push(header2);
    y += 14;

    for (const questId of completedQuests) {
      const quest = this.questSystem.getQuestData(questId);
      const name = this.scene.add.text(8, y, quest?.name ?? questId, {
        fontSize: '7px',
        color: '#888888',
        fontFamily: 'monospace',
      });
      this.contentContainer.add(name);
      this.contentElements.push(name);
      y += 10;
    }
  }

  private showSettingsTab(): void {
    this.settingsPanel.setPosition(CONTENT_X + 8, 8);
    this.settingsPanel.setVisible(true);
    this.contentElements.push(this.settingsPanel);
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.setVisible(true);
    this.selectedTab = 0;
    this.updateTabHighlight();
    this.refreshContent();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.setVisible(false);
    this.clearContent();
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  isVisible(): boolean {
    return this.isOpen;
  }

  handleInput(keyCode: number): void {
    if (!this.isOpen) return;
    if (keyCode === Phaser.Input.Keyboard.KeyCodes.UP) {
      this.selectedTab = Math.max(0, this.selectedTab - 1);
      this.selectTab(this.selectedTab);
    } else if (keyCode === Phaser.Input.Keyboard.KeyCodes.DOWN) {
      this.selectedTab = Math.min(this.tabs.length - 1, this.selectedTab + 1);
      this.selectTab(this.selectedTab);
    } else if (keyCode === Phaser.Input.Keyboard.KeyCodes.ESC) {
      this.close();
    }
  }
}
