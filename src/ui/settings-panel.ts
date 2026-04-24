import type { Scene } from 'phaser';
import { SettingsSystem, type GameSettings } from '../systems/settings-system';
import { uiTextStyle } from './text-style';

const PANEL_WIDTH = 180;
const PANEL_HEIGHT = 140;

export class SettingsPanel extends Phaser.GameObjects.Container {
  private settingsSystem: SettingsSystem;
  private bg!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private sliderLabels: Phaser.GameObjects.Text[] = [];
  private sliderBars: Phaser.GameObjects.Rectangle[] = [];
  private sliderKnobs: Phaser.GameObjects.Rectangle[] = [];
  private optionLabels: Phaser.GameObjects.Text[] = [];
  private draggingIndex = -1;
  private onClose?: () => void;

  // Config: label, key, min, max, type
  private readonly sliders: { label: string; key: keyof GameSettings; min: number; max: number }[] = [
    { label: '主音量', key: 'masterVolume', min: 0, max: 1 },
    { label: '音乐', key: 'musicVolume', min: 0, max: 1 },
    { label: '音效', key: 'sfxVolume', min: 0, max: 1 },
  ];

  private readonly options: { label: string; key: keyof GameSettings; choices: string[] }[] = [
    { label: '文字速度', key: 'textSpeed', choices: ['慢', '中', '快'] },
    { label: '战斗速度', key: 'battleSpeed', choices: ['慢', '中', '快'] },
  ];

  constructor(scene: Scene, settingsSystem: SettingsSystem, onClose?: () => void) {
    const x = (320 - PANEL_WIDTH) / 2;
    const y = (180 - PANEL_HEIGHT) / 2;
    super(scene, x, y);
    this.settingsSystem = settingsSystem;
    this.onClose = onClose;
    this.createPanel();
    this.setDepth(200);
    this.setVisible(false);
    scene.add.existing(this);

    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);
  }

  private createPanel(): void {
    // Background
    this.bg = this.scene.add.rectangle(PANEL_WIDTH / 2, PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 0x1a1a2e, 0.97);
    this.bg.setStrokeStyle(1, 0x4a90d9);
    this.add(this.bg);

    // Title
    this.titleText = this.scene.add.text(PANEL_WIDTH / 2, 10, '设置', uiTextStyle({
      fontSize: '10px',
      color: '#ffffff',
    }));
    this.titleText.setOrigin(0.5);
    this.add(this.titleText);

    // Close button
    const closeBtn = this.scene.add.text(PANEL_WIDTH - 10, 8, 'X', uiTextStyle({
      fontSize: '8px',
      color: '#ff6666',
    }));
    closeBtn.setOrigin(1, 0);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.close());
    this.add(closeBtn);

    // Sliders
    let currentY = 28;
    for (let i = 0; i < this.sliders.length; i++) {
      const config = this.sliders[i];
      const label = this.scene.add.text(8, currentY, config.label, uiTextStyle({
        fontSize: '7px',
        color: '#cccccc',
      }));
      this.add(label);

      const barX = 60;
      const barW = 70;
      const barH = 4;
      const barBg = this.scene.add.rectangle(barX + barW / 2, currentY + 3, barW, barH, 0x333344);
      this.add(barBg);

      const bar = this.scene.add.rectangle(barX, currentY + 3, 0, barH, 0x4a90d9);
      bar.setOrigin(0, 0.5);
      this.add(bar);
      this.sliderBars.push(bar);

      const knob = this.scene.add.rectangle(barX, currentY + 3, 6, 8, 0xffffff);
      knob.setInteractive({ useHandCursor: true });
      const idx = i;
      knob.on('pointerdown', () => { this.draggingIndex = idx; });
      this.add(knob);
      this.sliderKnobs.push(knob);

      const valueText = this.scene.add.text(barX + barW + 4, currentY, '0%', uiTextStyle({
        fontSize: '6px',
        color: '#aaaaaa',
      }));
      this.add(valueText);
      this.sliderLabels.push(valueText);

      currentY += 16;
    }

    // Options (text speed, battle speed)
    for (let i = 0; i < this.options.length; i++) {
      const config = this.options[i];
      const label = this.scene.add.text(8, currentY, config.label, uiTextStyle({
        fontSize: '7px',
        color: '#cccccc',
      }));
      this.add(label);

      const choiceContainer = this.scene.add.container(60, currentY - 2);
      for (let j = 0; j < config.choices.length; j++) {
        const choiceText = this.scene.add.text(j * 32, 0, config.choices[j], uiTextStyle({
          fontSize: '7px',
          color: '#888888',
          backgroundColor: '#00000000',
          padding: { x: 2, y: 1 },
        }));
        choiceText.setInteractive({ useHandCursor: true });
        choiceText.on('pointerdown', () => {
          this.settingsSystem.set(config.key, j);
          this.refreshOptions();
        });
        choiceContainer.add(choiceText);
      }
      this.add(choiceContainer);
      this.optionLabels.push(label);
      currentY += 16;
    }

    // Reset button
    const resetBtn = this.scene.add.text(PANEL_WIDTH / 2, PANEL_HEIGHT - 10, '恢复默认', uiTextStyle({
      fontSize: '7px',
      color: '#ffaa66',
    }));
    resetBtn.setOrigin(0.5);
    resetBtn.setInteractive({ useHandCursor: true });
    resetBtn.on('pointerdown', () => {
      this.settingsSystem.reset();
      this.refreshSliders();
      this.refreshOptions();
    });
    this.add(resetBtn);

    this.refreshSliders();
    this.refreshOptions();
  }

  private refreshSliders(): void {
    const settings = this.settingsSystem.getSettings();
    for (let i = 0; i < this.sliders.length; i++) {
      const config = this.sliders[i];
      const value = settings[config.key] as number;
      const barW = 70;
      const barX = 60;
      const ratio = (value - config.min) / (config.max - config.min);
      this.sliderBars[i].width = barW * ratio;
      this.sliderKnobs[i].x = barX + barW * ratio;
      this.sliderLabels[i].setText(`${Math.round(ratio * 100)}%`);
    }
  }

  private refreshOptions(): void {
    const settings = this.settingsSystem.getSettings();
    // The option texts are children of containers added at specific indices.
    // We rebuild the option choices color based on current selection.
    // Container children: we need to find the option containers and update their text colors.
    let optionIndex = 0;
    for (const child of this.list) {
      if (child instanceof Phaser.GameObjects.Container && child !== this) {
        const container = child as Phaser.GameObjects.Container;
        if (optionIndex < this.options.length) {
          const config = this.options[optionIndex];
          const currentValue = settings[config.key] as number;
          for (let j = 0; j < container.list.length; j++) {
            const text = container.list[j] as Phaser.GameObjects.Text;
            if (j === currentValue) {
              text.setColor('#4a90d9');
              text.setBackgroundColor('#1a3a5a');
            } else {
              text.setColor('#888888');
              text.setBackgroundColor('#00000000');
            }
          }
          optionIndex++;
        }
      }
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.draggingIndex < 0 || !this.visible) return;
    const config = this.sliders[this.draggingIndex];
    const barX = 60;
    const barW = 70;
    const localX = pointer.x - this.x;
    let ratio = (localX - barX) / barW;
    ratio = Math.max(0, Math.min(1, ratio));
    const value = config.min + ratio * (config.max - config.min);
    this.settingsSystem.set(config.key, Math.round(value * 100) / 100);
    this.refreshSliders();
  }

  private handlePointerUp(): void {
    this.draggingIndex = -1;
  }

  open(): void {
    this.setVisible(true);
    this.refreshSliders();
    this.refreshOptions();
  }

  close(): void {
    this.setVisible(false);
    this.onClose?.();
  }

  isOpen(): boolean {
    return this.visible;
  }

  destroy(fromScene?: boolean): void {
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    super.destroy(fromScene);
  }
}
