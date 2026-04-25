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

  constructor(
    scene: Scene,
    callbacks: { onInteract: () => void; onBattle: () => void; onMenu: () => void; onDialogueAdvance: () => void }
  ) {
    super(scene, 0, 0);
    this.onInteract = callbacks.onInteract;
    this.onBattle = callbacks.onBattle;
    this.onMenu = callbacks.onMenu;
    this.onDialogueAdvance = callbacks.onDialogueAdvance;

    this.setScrollFactor(0);
    scene.add.existing(this);
    this.createControls();
    this.setDepth(80);
  }

  private createControls(): void {
    // Game resolution is 640x360, zoomed 2x on screen (390x219 CSS px).
    // With scrollFactor=0, local coords = screen coords in game units.
    // joystick at worldX=20 → screenX=40 (~10% from left of 390px canvas)
    // buttons at worldX=190 → screenX=380 (~97% from left = right edge of 390px canvas)
    // worldY=130 → screenY=260 (near visible world bottom ~145, within camera view)
    const W = this.scene.cameras.main.width;   // 640
    const H = this.scene.cameras.main.height;   // 360

    const jRadius = Math.round(H * 0.065);
    const jBaseX  = 20;
    const jBaseY  = 130;
    const knobR   = Math.round(jRadius * 0.45);

    this.joystickCenter = { x: jBaseX, y: jBaseY };
    this.knobMaxRadius  = jRadius - knobR;

    // Base: semi-transparent dark circle
    this.joystickBase = this.scene.add.circle(jBaseX, jBaseY, jRadius, 0x111122, 0.7);
    this.joystickBase.setStrokeStyle(2.5, 0x445566);
    this.add(this.joystickBase);

    // Knob: bright orange-red, impossible to miss
    this.joystickKnob = this.scene.add.circle(jBaseX, jBaseY, knobR, 0xff4422, 1.0);
    this.joystickKnob.setStrokeStyle(2, 0xffffff);
    this.add(this.joystickKnob);

    this.joystickBase.setInteractive({ draggable: false });
    this.joystickBase.on('pointerdown', this.onJoystickDown, this);
    this.scene.input.on('pointermove', this.onPointerMove, this);
    this.scene.input.on('pointerup',   this.onPointerUp,   this);
    this.scene.input.on('pointerdown', this.onScreenTap,    this);

    // Buttons: bottom-right, near right edge of visible world
    // jBaseX=20 (left ~10%). btnX=400 should be ~75% from left (right side).
    const btnX   = 400;
    const btnY   = jBaseY;
    const btnGap = Math.round(H * 0.085);
    const btnR   = Math.round(H * 0.04);

    this.createButton(btnX, btnY - btnGap, btnR, 'E', 0x44bb44, this.onInteract, '交互');
    this.createButton(btnX, btnY,           btnR, 'B', 0xcc4444, this.onBattle,   '战斗');
    this.createButton(btnX, btnY + btnGap, btnR, 'M', 0x4466cc, this.onMenu,     '菜单');

    // Dialogue advance: right 40% of canvas (worldX > 384)
    const advZone = this.scene.add.rectangle(W * 0.8, H * 0.5, W * 0.4, H, 0x000000, 0.001);
    advZone.setInteractive({ useHandCursor: false });
    advZone.on('pointerdown', () => this.onDialogueAdvance(), this);
    this.add(advZone);

    console.log(`[TouchControls] Created jBase=(${jBaseX},${jBaseY}) btnX=${btnX}`);
  }

  private createButton(
    x: number, y: number, r: number,
    label: string, color: number, action: () => void, desc: string
  ): void {
    const ring = this.scene.add.circle(x, y, r + 4, color, 0.25);
    ring.setStrokeStyle(2.5, color);
    this.add(ring);

    const bg = this.scene.add.circle(x, y, r, color, 0.88);
    bg.setStrokeStyle(1.5, 0xffffff, 0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', action, this);
    this.add(bg);

    const fontSize = Math.max(16, Math.round(r * 1.1));
    const text = this.scene.add.text(x, y, label, uiTextStyle({
      fontSize: fontSize + 'px',
      color: '#ffffff',
      fontStyle: 'bold',
    }));
    text.setOrigin(0.5);
    this.add(text);

    const descEl = this.scene.add.text(x, y + r + 6, desc, uiTextStyle({
      fontSize: Math.max(12, Math.round(fontSize * 0.55)) + 'px',
      color: '#aaaaaa',
    }));
    descEl.setOrigin(0.5);
    this.add(descEl);
  }

  private onJoystickDown(pointer: Phaser.Input.Pointer): void {
    this.isDragging = true;
    this.pointerId  = pointer.id;
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
      this.pointerId  = null;
      this.joystickKnob.x = this.joystickCenter.x;
      this.joystickKnob.y = this.joystickCenter.y;
      this.direction = { x: 0, y: 0 };
    }
  }

  private onScreenTap(pointer: Phaser.Input.Pointer): void {
    const W = this.scene.cameras.main.width;
    if (pointer.x > W * 0.6) {
      this.onDialogueAdvance();
    }
  }

  private updateKnob(px: number, py: number): void {
    const dx   = px - this.joystickCenter.x;
    const dy   = py - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = this.knobMaxRadius;

    const nx = dist > maxR ? (dx / dist) * maxR : dx;
    const ny = dist > maxR ? (dy / dist) * maxR : dy;

    this.joystickKnob.x = this.joystickCenter.x + nx;
    this.joystickKnob.y = this.joystickCenter.y + ny;

    this.direction = {
      x: dist > 0 ? nx / maxR : 0,
      y: dist > 0 ? ny / maxR : 0,
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
    this.scene.input.off('pointerup',   this.onPointerUp,   this);
    this.scene.input.off('pointerdown', this.onScreenTap,   this);
    if (this.joystickBase) {
      this.joystickBase.off('pointerdown', this.onJoystickDown, this);
    }
    super.destroy(fromScene);
  }
}