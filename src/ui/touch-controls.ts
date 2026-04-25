import type { Scene } from 'phaser';
import { uiTextStyle } from './text-style';

export class TouchControls extends Phaser.GameObjects.Container {
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickKnob!: Phaser.GameObjects.Arc;
  private isDragging = false;
  private pointerId: number | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private knobMaxRadius = 0;
  private direction = { x: 0, y: 0 };
  private onInteract!: () => void;
  private onBattle!: () => void;
  private onMenu!: () => void;
  private onDialogueAdvance!: () => void;
  private isTouchDevice = false;

  constructor(
    scene: Scene,
    callbacks: { onInteract: () => void; onBattle: () => void; onMenu: () => void; onDialogueAdvance: () => void }
  ) {
    super(scene, 0, 0);
    this.onInteract = callbacks.onInteract;
    this.onBattle = callbacks.onBattle;
    this.onMenu = callbacks.onMenu;
    this.onDialogueAdvance = callbacks.onDialogueAdvance;

    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!this.isTouchDevice) {
      this.setVisible(false);
      return;
    }

    this.setScrollFactor(0);
    this.createControls();
    this.setDepth(80);
    scene.add.existing(this);
  }

  private createControls(): void {
    const W = this.scene.cameras.main.width;
    const H = this.scene.cameras.main.height;

    // Joystick: bottom-left, size relative to screen
    const jRadius = Math.round(H * 0.09);
    const jBaseX = Math.round(W * 0.13);
    const jBaseY = H - Math.round(H * 0.16);
    const knobRadius = Math.round(jRadius * 0.45);

    this.joystickCenter = { x: jBaseX, y: jBaseY };
    this.knobMaxRadius = jRadius - knobRadius;

    this.joystickBase = this.scene.add.circle(jBaseX, jBaseY, jRadius, 0x333344, 0.7);
    this.joystickBase.setStrokeStyle(2.5, 0x556677);
    this.joystickBase.setScrollFactor(0);
    this.joystickBase.setInteractive({ draggable: false });
    this.joystickBase.on('pointerdown', this.onJoystickDown, this);
    this.add(this.joystickBase);

    this.joystickKnob = this.scene.add.circle(jBaseX, jBaseY, knobRadius, 0x4a90d9, 0.95);
    this.joystickKnob.setScrollFactor(0);
    this.add(this.joystickKnob);

    this.scene.input.on('pointermove', this.onPointerMove, this);
    this.scene.input.on('pointerup', this.onPointerUp, this);
    this.scene.input.on('pointerdown', this.onScreenTap, this);

    // Buttons: bottom-right, stacked vertically
    const btnX = W - Math.round(W * 0.12);
    const btnY = H - Math.round(H * 0.08);
    const btnGap = Math.round(H * 0.09);
    const btnR = Math.round(H * 0.04);

    this.createButton(btnX, btnY - btnGap, btnR, 'E', 0x44bb44, this.onInteract, '交互');
    this.createButton(btnX, btnY, btnR, 'B', 0xcc4444, this.onBattle, '战斗');
    this.createButton(btnX, btnY + btnGap, btnR, 'M', 0x4466cc, this.onMenu, '菜单');

    // Dialogue advance: large zone covering right 60% of screen
    const advZone = this.scene.add.rectangle(W * 0.7, H * 0.5, W * 0.6, H * 0.5, 0x000000, 0.001);
    advZone.setScrollFactor(0);
    advZone.setInteractive({ useHandCursor: false });
    advZone.on('pointerdown', () => this.onDialogueAdvance(), this);
    this.add(advZone);
  }

  private createButton(
    x: number, y: number, r: number,
    label: string, color: number, action: () => void, desc: string
  ): void {
    const ring = this.scene.add.circle(x, y, r + 4, color, 0.25);
    ring.setStrokeStyle(2.5, color);
    ring.setScrollFactor(0);
    this.add(ring);

    const bg = this.scene.add.circle(x, y, r, color, 0.88);
    bg.setStrokeStyle(1.5, 0xffffff, 0.5);
    bg.setScrollFactor(0);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', action, this);
    this.add(bg);

    const fontSize = Math.max(14, Math.round(r * 1.1));
    const text = this.scene.add.text(x, y, label, uiTextStyle({
      fontSize: fontSize + 'px',
      color: '#ffffff',
      fontStyle: 'bold',
    }));
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    this.add(text);

    const descEl = this.scene.add.text(x, y + r + 6, desc, uiTextStyle({
      fontSize: Math.max(10, Math.round(fontSize * 0.55)) + 'px',
      color: '#aaaaaa',
    }));
    descEl.setOrigin(0.5);
    descEl.setScrollFactor(0);
    this.add(descEl);
  }

  private onJoystickDown(pointer: Phaser.Input.Pointer): void {
    this.isDragging = true;
    this.pointerId = pointer.id;
    this.updateKnob(pointer.x, pointer.y);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.isDragging && pointer.id === this.pointerId) {
      this.updateKnob(pointer.x, pointer.y);
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.isDragging && pointer.id === this.pointerId) {
      this.isDragging = false;
      this.pointerId = null;
      this.joystickKnob.x = this.joystickCenter.x;
      this.joystickKnob.y = this.joystickCenter.y;
      this.direction = { x: 0, y: 0 };
    }
  }

  private onScreenTap(pointer: Phaser.Input.Pointer): void {
    const W = this.scene.cameras.main.width;
    if (pointer.x > W * 0.5) {
      this.onDialogueAdvance();
    }
  }

  private updateKnob(px: number, py: number): void {
    const dx = px - this.joystickCenter.x;
    const dy = py - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = this.knobMaxRadius;

    const nx = dist > 0 ? (dist > maxR ? (dx / dist) * maxR : dx) : 0;
    const ny = dist > 0 ? (dist > maxR ? (dy / dist) * maxR : dy) : 0;

    this.joystickKnob.x = this.joystickCenter.x + nx;
    this.joystickKnob.y = this.joystickCenter.y + ny;

    this.direction = {
      x: dist > maxR ? nx / maxR : nx / Math.max(dist, 1),
      y: dist > maxR ? ny / maxR : ny / Math.max(dist, 1),
    };
  }

  getDirection(): { x: number; y: number } {
    return { ...this.direction };
  }

  isActive(): boolean {
    return this.visible;
  }

  destroy(fromScene?: boolean): void {
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    this.scene.input.off('pointerdown', this.onScreenTap, this);
    if (this.joystickBase) {
      this.joystickBase.off('pointerdown', this.onJoystickDown, this);
    }
    super.destroy(fromScene);
  }
}