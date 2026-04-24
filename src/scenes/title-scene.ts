import { Scene } from 'phaser';
import { SaveSystem } from '../systems/save-system';
import { SettingsSystem } from '../systems/settings-system';
import { SettingsPanel } from '../ui/settings-panel';
import { uiTextStyle } from '../ui/text-style';

interface MenuItem {
  label: string;
  action: () => void;
  enabled: boolean;
}

export class TitleScene extends Scene {
  private menuItems: Phaser.GameObjects.Text[] = [];
  private selectedIndex = 0;
  private menuContainer!: Phaser.GameObjects.Container;
  private settingsPanel?: SettingsPanel;
  private settingsSystem!: SettingsSystem;
  private saveSystem!: SaveSystem;
  private confirmKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.settingsSystem = new SettingsSystem();
    this.saveSystem = new SaveSystem();

    // Title
    const titleText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 30,
      '云深不知剑',
      uiTextStyle({
        fontSize: '28px',
        color: '#ffffff',
        padding: { y: 3 },
      })
    );
    titleText.setOrigin(0.5);

    // Subtitle
    const subtitleText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 8,
      '—— 按方向键选择，回车确认 ——',
      uiTextStyle({
        fontSize: '10px',
        color: '#888888',
        padding: { y: 2 },
      })
    );
    subtitleText.setOrigin(0.5);

    this.createMenu();
    this.createSettingsPanel();

    this.confirmKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this.input.keyboard?.on('keydown-UP', () => this.moveSelection(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(1));
    this.confirmKey.on('down', () => this.confirmSelection());
  }

  private createMenu(): void {
    this.menuContainer = this.add.container(0, 0);

    const hasSave = this.saveSystem.hasSave();

    const menuData: MenuItem[] = [
      {
        label: '开始游戏',
        action: () => this.startNewGame(),
        enabled: true,
      },
      {
        label: hasSave ? '继续游戏' : '继续游戏（无存档）',
        action: () => this.continueGame(),
        enabled: hasSave,
      },
      {
        label: '设置',
        action: () => this.openSettings(),
        enabled: true,
      },
    ];

    const startY = this.cameras.main.height / 2 + 10;
    const gap = 16;

    for (let i = 0; i < menuData.length; i++) {
      const item = menuData[i];
      const text = this.add.text(
        this.cameras.main.width / 2,
        startY + i * gap,
        item.label,
        uiTextStyle({
          fontSize: '10px',
          color: item.enabled ? '#cccccc' : '#555555',
          backgroundColor: '#00000000',
          padding: { x: 6, y: 3 },
        })
      );
      text.setOrigin(0.5);

      if (item.enabled) {
        text.setInteractive({ useHandCursor: true });
        text.on('pointerover', () => {
          this.selectedIndex = i;
          this.updateMenuHighlight();
        });
        text.on('pointerdown', () => {
          this.selectedIndex = i;
          this.updateMenuHighlight();
          item.action();
        });
      }

      this.menuItems.push(text);
      this.menuContainer.add(text);
    }

    this.updateMenuHighlight();
  }

  private updateMenuHighlight(): void {
    const hasSave = this.saveSystem.hasSave();
    for (let i = 0; i < this.menuItems.length; i++) {
      const text = this.menuItems[i];
      if (i === this.selectedIndex) {
        text.setColor('#4a90d9');
        text.setBackgroundColor('#1a3a5a');
      } else {
        const enabled = i !== 1 || hasSave;
        text.setColor(enabled ? '#aaaaaa' : '#555555');
        text.setBackgroundColor('#00000000');
      }
    }
  }

  private moveSelection(dir: number): void {
    const hasSave = this.saveSystem.hasSave();
    let next = this.selectedIndex + dir;
    next = Math.max(0, Math.min(this.menuItems.length - 1, next));
    // Skip disabled items
    if (next === 1 && !hasSave) {
      if (dir > 0) next = 2;
      else next = 0;
    }
    this.selectedIndex = next;
    this.updateMenuHighlight();
  }

  private confirmSelection(): void {
    if (this.settingsPanel?.isOpen()) return;

    const hasSave = this.saveSystem.hasSave();
    if (this.selectedIndex === 1 && !hasSave) return;

    const actions = [
      () => this.startNewGame(),
      () => this.continueGame(),
      () => this.openSettings(),
    ];
    actions[this.selectedIndex]();
  }

  private startNewGame(): void {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene');
    });
  }

  private continueGame(): void {
    const saveData = this.saveSystem.load();
    if (!saveData) return;

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('OverworldScene', {
        playerX: saveData.player.position.x,
        playerY: saveData.player.position.y,
      });
    });
  }

  private openSettings(): void {
    this.settingsPanel?.open();
  }

  private createSettingsPanel(): void {
    this.settingsPanel = new SettingsPanel(this, this.settingsSystem);
  }
}
