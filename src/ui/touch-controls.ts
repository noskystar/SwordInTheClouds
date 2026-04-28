import type { Scene } from 'phaser';
import { uiTextStyle } from './text-style';
import { isTouchDevice } from '../utils/device';

export class TouchControls {
  static createIfTouch(
    scene: Scene,
    callbacks: { onInteract: () => void; onBattle: () => void; onMenu: () => void; onDialogueAdvance: () => void }
  ): TouchControls | undefined {
    if (!isTouchDevice()) return undefined;
    return new TouchControls(scene, callbacks);
  }
  private scene: Scene;
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
  private buttonElements: Array<{
    ring: Phaser.GameObjects.Arc;
    bg: Phaser.GameObjects.Arc;
    text: Phaser.GameObjects.Text;
    desc: Phaser.GameObjects.Text;
  }> = [];
  private advZone!: Phaser.GameObjects.Rectangle;
  private allElements: Phaser.GameObjects.GameObject[] = [];
  private visible = true;

  constructor(
    scene: Scene,
    callbacks: { onInteract: () => void; onBattle: () => void; onMenu: () => void; onDialogueAdvance: () => void }
  ) {
    this.scene = scene;
    this.onInteract = callbacks.onInteract;
    this.onBattle = callbacks.onBattle;
    this.onMenu = callbacks.onMenu;
    this.onDialogueAdvance = callbacks.onDialogueAdvance;

    this.createControls();

    this.scene.scale.on('resize', this.onResize, this);
  }

  /** Convert desired screen position to scrollFactor=0 element position that works with any zoom */
  private toScrollFactorPos(screenX: number, screenY: number): { x: number; y: number } {
    const cam = this.scene.cameras.main;
    const zoom = cam.zoom || 1;
    const W = cam.width;
    const H = cam.height;
    // When zoom != 1, Phaser offsets scrollFactor=0 elements by (W - W/zoom)/2
    const offsetX = (W - W / zoom) * 0.5;
    const offsetY = (H - H / zoom) * 0.5;
    return {
      x: Math.round(screenX / zoom + offsetX),
      y: Math.round(screenY / zoom + offsetY),
    };
  }

  private createControls(): void {
    const W = this.scene.cameras.main.width;
    const H = this.scene.cameras.main.height;

    const jRadius = Math.round(H * 0.08);
    const jBase = this.toScrollFactorPos(W * 0.12, H * 0.86);
    const knobR = Math.round(jRadius * 0.45);

    this.joystickCenter = { x: jBase.x, y: jBase.y };
    this.knobMaxRadius = jRadius - knobR;

    // Joystick base
    this.joystickBase = this.scene.add.circle(jBase.x, jBase.y, jRadius, 0x333366, 0.65);
    this.joystickBase.setStrokeStyle(3, 0xaaccff);
    this.joystickBase.setScrollFactor(0);
    this.joystickBase.setDepth(100);
    this.allElements.push(this.joystickBase);

    // Joystick knob - bright yellow
    this.joystickKnob = this.scene.add.circle(jBase.x, jBase.y, knobR, 0xffdd00, 1.0);
    this.joystickKnob.setStrokeStyle(3, 0xffffff);
    this.joystickKnob.setScrollFactor(0);
    this.joystickKnob.setDepth(101);
    this.allElements.push(this.joystickKnob);

    this.joystickBase.setInteractive({ draggable: false });
    this.joystickBase.on('pointerdown', this.onJoystickDown, this);
    this.scene.input.on('pointermove', this.onPointerMove, this);
    this.scene.input.on('pointerup', this.onPointerUp, this);
    this.scene.input.on('pointerdown', this.onScreenTap, this);

    // Buttons: bottom-right
    const btnBase = this.toScrollFactorPos(W * 0.82, H * 0.86);
    const btnGap = Math.round(W * 0.065);
    const btnR = Math.round(H * 0.04);

    this.buttonElements = [
      this.createButton(btnBase.x - btnGap, btnBase.y, btnR, 'E', 0x44ff44, this.onInteract, '交互'),
      this.createButton(btnBase.x, btnBase.y, btnR, 'B', 0xff4444, this.onBattle, '战斗'),
      this.createButton(btnBase.x + btnGap, btnBase.y, btnR, 'M', 0x4488ff, this.onMenu, '菜单'),
    ];

    // Dialogue advance zone
    const advPos = this.toScrollFactorPos(W * 0.7, H * 0.5);
    const advSize = this.toScrollFactorPos(W * 0.6, H);
    this.advZone = this.scene.add.rectangle(advPos.x, advPos.y, advSize.x, advSize.y, 0x000000, 0.001);
    this.advZone.setScrollFactor(0);
    this.advZone.setDepth(100);
    this.advZone.setInteractive({ useHandCursor: false });
    this.advZone.on('pointerdown', () => this.onDialogueAdvance(), this);
    this.allElements.push(this.advZone);

    console.log(`[TouchControls] Created jBase=(${jBase.x},${jBase.y}) btnBase=(${btnBase.x},${btnBase.y}) zoom=${this.scene.cameras.main.zoom}`);
  }

  private createButton(
    x: number, y: number, r: number,
    label: string, color: number, action: () => void, desc: string
  ): { ring: Phaser.GameObjects.Arc; bg: Phaser.GameObjects.Arc; text: Phaser.GameObjects.Text; desc: Phaser.GameObjects.Text } {
    const ring = this.scene.add.circle(x, y, r + 4, color, 0.35);
    ring.setStrokeStyle(2.5, color);
    ring.setScrollFactor(0);
    ring.setDepth(100);
    this.allElements.push(ring);

    const bg = this.scene.add.circle(x, y, r, color, 0.92);
    bg.setStrokeStyle(2, 0xffffff, 0.6);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', action, this);
    bg.setScrollFactor(0);
    bg.setDepth(101);
    this.allElements.push(bg);

    const fontSize = Math.max(16, Math.round(r * 1.1));
    const text = this.scene.add.text(x, y, label, uiTextStyle({
      fontSize: fontSize + 'px',
      color: '#ffffff',
      fontStyle: 'bold',
    }));
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(102);
    this.allElements.push(text);

    const descEl = this.scene.add.text(x, y + r + 10, desc, uiTextStyle({
      fontSize: Math.max(12, Math.round(fontSize * 0.55)) + 'px',
      color: '#cccccc',
    }));
    descEl.setOrigin(0.5);
    descEl.setScrollFactor(0);
    descEl.setDepth(102);
    this.allElements.push(descEl);

    return { ring, bg, text, desc: descEl };
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
    if (pointer.x > W * 0.6) {
      this.onDialogueAdvance();
    }
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    const W = gameSize.width;
    const H = gameSize.height;

    const jBase = this.toScrollFactorPos(W * 0.12, H * 0.86);
    const jRadius = Math.round(H * 0.08);
    const knobR = Math.round(jRadius * 0.45);

    this.joystickCenter = { x: jBase.x, y: jBase.y };
    this.knobMaxRadius = jRadius - knobR;

    this.joystickBase.setPosition(jBase.x, jBase.y);
    this.joystickBase.setRadius(jRadius);
    this.joystickKnob.setPosition(jBase.x, jBase.y);
    this.joystickKnob.setRadius(knobR);

    const btnBase = this.toScrollFactorPos(W * 0.82, H * 0.86);
    const btnGap = Math.round(W * 0.065);
    const btnR = Math.round(H * 0.04);

    const buttonConfigs = [
      { el: this.buttonElements[0], x: btnBase.x - btnGap, y: btnBase.y, r: btnR },
      { el: this.buttonElements[1], x: btnBase.x, y: btnBase.y, r: btnR },
      { el: this.buttonElements[2], x: btnBase.x + btnGap, y: btnBase.y, r: btnR },
    ];

    for (const cfg of buttonConfigs) {
      if (!cfg.el) continue;
      cfg.el.ring.setPosition(cfg.x, cfg.y);
      cfg.el.ring.setRadius(cfg.r + 4);
      cfg.el.bg.setPosition(cfg.x, cfg.y);
      cfg.el.bg.setRadius(cfg.r);
      cfg.el.text.setPosition(cfg.x, cfg.y);
      cfg.el.desc.setPosition(cfg.x, cfg.y + cfg.r + 10);
    }

    if (this.advZone) {
      const advPos = this.toScrollFactorPos(W * 0.7, H * 0.5);
      const advSize = this.toScrollFactorPos(W * 0.6, H);
      this.advZone.setPosition(advPos.x, advPos.y);
      this.advZone.setSize(advSize.x, advSize.y);
    }

    console.log(`[TouchControls] Resized to ${W}x${H} zoom=${this.scene.cameras.main.zoom}`);
  }

  private updateKnob(px: number, py: number): void {
    const dx = px - this.joystickCenter.x;
    const dy = py - this.joystickCenter.y;
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

  setVisible(visible: boolean): void {
    this.visible = visible;
    for (const el of this.allElements) {
      (el as Phaser.GameObjects.GameObject & { setVisible: (v: boolean) => void }).setVisible(visible);
    }
  }

  destroy(): void {
    this.scene.scale.off('resize', this.onResize, this);
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    this.scene.input.off('pointerdown', this.onScreenTap, this);
    if (this.joystickBase) {
      this.joystickBase.off('pointerdown', this.onJoystickDown, this);
    }
    for (const el of this.allElements) {
      el.destroy();
    }
    this.allElements = [];
  }
}
