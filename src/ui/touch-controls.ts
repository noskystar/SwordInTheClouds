import type { Scene } from 'phaser';
import { uiTextStyle } from './text-style';

const JOYSTICK_RADIUS = 32;
const KNOB_RADIUS = 14;

export class TouchControls extends Phaser.GameObjects.Container {
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickKnob!: Phaser.GameObjects.Arc;
  private isDragging = false;
  private pointerId: number | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private direction = { x: 0, y: 0 };
  private onInteract!: () => void;
  private onBattle!: () => void;
  private onMenu!: () => void;
  private onDialogueAdvance!: () => void;

  constructor(
    scene: Scene,
    callbacks: { onInteract: () => void; onBattle: () => void; onMenu: () => void; onDialogueAdvance: () => void }
  ) {
        super(scene, 0, 0);
    // Fix controls to screen, not world position
    this.setScrollFactor(0);
    this.onInteract = callbacks.onInteract;
    this.onBattle = callbacks.onBattle;
    this.onMenu = callbacks.onMenu;
    this.onDialogueAdvance = callbacks.onDialogueAdvance;

    this.createJoystick();
    this.createButtons();
    this.createDialogueAdvanceZone();
    this.setDepth(80);
    scene.add.existing(this);

    // Only show on touch devices
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.setVisible(isTouch);
  }

  private createJoystick(): void {
    // Position in bottom-left corner, using 320x180 coordinate space
    const cx = 64;
    const cy = 260;
    this.joystickCenter = { x: cx, y: cy };

    this.joystickBase = this.scene.add.circle(cx, cy, JOYSTICK_RADIUS, 0x333344, 0.6);
    this.joystickBase.setStrokeStyle(2, 0x555566);
    this.joystickBase.setScrollFactor(0);
    this.add(this.joystickBase);

    this.joystickKnob = this.scene.add.circle(cx, cy, KNOB_RADIUS, 0x4a90d9, 0.9);
    this.joystickKnob.setScrollFactor(0);
    this.add(this.joystickKnob);

    this.joystickBase.setInteractive({ draggable: false });
    this.joystickBase.on('pointerdown', this.onJoystickPointerDown, this);
    this.scene.input.on('pointermove', this.onPointerMove, this);
    this.scene.input.on('pointerup', this.onPointerUp, this);
  }

  private onJoystickPointerDown(pointer: Phaser.Input.Pointer): void {
    this.isDragging = true;
    this.pointerId = pointer.id;
    this.updateKnobPosition(pointer.x, pointer.y);
  }

  private onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (this.isDragging && pointer.id === this.pointerId) {
      this.updateKnobPosition(pointer.x, pointer.y);
    }
  };

  private onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (this.isDragging && pointer.id === this.pointerId) {
      this.isDragging = false;
      this.pointerId = null;
      this.joystickKnob.x = this.joystickCenter.x;
      this.joystickKnob.y = this.joystickCenter.y;
      this.direction = { x: 0, y: 0 };
    }
  };

  private updateKnobPosition(worldX: number, worldY: number): void {
    // Since container is at world origin and scrollFactor=0, world coords = screen coords
    // The joystick center is in the container's local coordinate space
    const dx = worldX - this.joystickCenter.x;
    const dy = worldY - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = JOYSTICK_RADIUS - KNOB_RADIUS;

    let nx = dx;
    let ny = dy;
    if (dist > maxDist) {
      nx = (dx / dist) * maxDist;
      ny = (dy / dist) * maxDist;
    }

    this.joystickKnob.x = this.joystickCenter.x + nx;
    this.joystickKnob.y = this.joystickCenter.y + ny;

    this.direction = {
      x: dist > 0 ? nx / maxDist : 0,
      y: dist > 0 ? ny / maxDist : 0,
    };
  }

  private createDialogueAdvanceZone(): void {
    // Invisible zone on the right half of screen for dialogue advancement
    const screenW = this.scene.cameras.main.width;
    const screenH = this.scene.cameras.main.height;
    const zone = this.scene.add.rectangle(screenW * 0.75, screenH * 0.6, screenW * 0.5, screenH * 0.5, 0x000000, 0.001);
    zone.setScrollFactor(0);
    zone.setInteractive({ useHandCursor: false });
    zone.on('pointerdown', () => {
      this.onDialogueAdvance();
    });
    this.add(zone);
  }

  private createButtons(): void {
    // Position relative to GAME resolution (640x360)
    const btnY = 260;
    const btnGap = 70;
    const startX = 480;
    const btnRadius = 20;

    const buttons = [
      { label: 'E', x: startX, color: 0x44bb44, action: this.onInteract, desc: '交互' },
      { label: 'B', x: startX + btnGap, color: 0xcc4444, action: this.onBattle, desc: '战斗' },
      { label: 'M', x: startX + btnGap * 2, color: 0x4466cc, action: this.onMenu, desc: '菜单' },
    ];

    for (const btn of buttons) {
      const outerRing = this.scene.add.circle(btn.x, btnY, btnRadius + 4, btn.color, 0.3);
      outerRing.setStrokeStyle(2, btn.color);
      outerRing.setScrollFactor(0);
      this.add(outerRing);

      const bg = this.scene.add.circle(btn.x, btnY, btnRadius, btn.color, 0.85);
      bg.setStrokeStyle(1.5, 0xffffff, 0.6);
      bg.setScrollFactor(0);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', btn.action);
      this.add(bg);

      const text = this.scene.add.text(btn.x, btnY, btn.label, uiTextStyle({
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      }));
      text.setOrigin(0.5);
      text.setScrollFactor(0);
      this.add(text);

      const desc = this.scene.add.text(btn.x, btnY + btnRadius + 8, btn.desc, uiTextStyle({
        fontSize: '16px',
        color: '#bbbbbb',
      }));
      desc.setOrigin(0.5);
      desc.setScrollFactor(0);
      this.add(desc);
    }
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
    this.joystickBase.off('pointerdown', this.onJoystickPointerDown, this);
    super.destroy(fromScene);
  }
}
