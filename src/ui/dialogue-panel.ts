import { Scene } from 'phaser';
import type { DialogueNode, DialogueOption } from '../types/dialogue';
import { uiTextStyle } from './text-style';

type SelectCallback = (optionIndex: number) => void;
type CloseCallback = () => void;

const PANEL_MARGIN_RATIO = 0.015;     // panel bottom margin as % of screen height
const PANEL_HEIGHT_RATIO = 0.24;      // panel height as % of screen height (reduced from 0.40)
export const PANEL_WIDTH_RATIO = 0.84;   // panel width as % of screen width
export const PANEL_MAX_HEIGHT = 100;     // cap panel height at 100px
export const PANEL_MAX_WIDTH = 540;      // cap panel width at 540px
const NAME_FONT_RATIO = 0.038;        // name text font as % of screen height (~14px @ 360h)
const BODY_FONT_RATIO = 0.034;        // body text font as % of screen height (~12px @ 360h)
const OPTION_FONT_RATIO = 0.034;      // option text font as % of screen height (~12px @ 360h)
const HINT_FONT_RATIO = 0.030;        // hint text font as % of screen height (~11px @ 360h)
const OPTION_LINE_RATIO = 0.038;      // option line height as % of screen height (~14px @ 360h)

export class DialoguePanel {
  private scene: Scene;
  private container!: Phaser.GameObjects.Container;
  private bg!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Text;
  private continueHint!: Phaser.GameObjects.Text;

  private fullText = '';
  private displayedChars = 0;
  private typingTimer?: Phaser.Time.TimerEvent;
  private isTyping = false;
  private options: DialogueOption[] = [];
  private selectedIndex = 0;

  // Manual key state tracking (Playwright-compatible)
  private eKeyWasDown = false;
  private spaceWasDown = false;
  private upWasDown = false;
  private downWasDown = false;

  private onSelect?: SelectCallback;
  private onClose?: CloseCallback;

  // Keys
  private upKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;
  private confirmKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;

  // Adaptive layout state (recomputed per dialogue)
  private layout = {
    panelScreenX: 0,
    panelScreenY: 0,
    panelScreenW: 0,
    panelScreenH: 0,
    innerPad: 0,
    bodyScreenY: 0,
    optionStartScreenY: 0,
    hintScreenY: 0,
  };

  constructor(scene: Scene) {
    this.scene = scene;
    this.createElements();
    this.setupInput();
    this.hide();
  }

  setCallbacks(onSelect: SelectCallback, onClose: CloseCallback): void {
    this.onSelect = onSelect;
    this.onClose = onClose;
  }

  showDialogue(node: DialogueNode, options: DialogueOption[]): void {
    this.clearOptions();
    this.fullText = node.text;
    this.displayedChars = 0;
    this.options = options;
    this.selectedIndex = 0;

    // Compute adaptive layout based on content
    this.computeAndApplyLayout(node.text, options);

    this.nameText.setText(node.speaker);
    this.bodyText.setText('');
    this.continueHint.setVisible(false);

    // Show container
    this.container.setVisible(true);
    this.container.setAlpha(1);

    // Start typewriter effect
    this.isTyping = true;
    this.typingTimer = this.scene.time.addEvent({
      delay: 30,
      callback: () => this.typeNextChar(),
      repeat: this.fullText.length - 1,
    });
  }

  private computeAndApplyLayout(text: string, options: DialogueOption[]): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const zoom = this.scene.cameras.main.zoom;
    const sz = (v: number) => v / zoom;

    const panelMargin = Math.max(2, Math.round(height * PANEL_MARGIN_RATIO));
    const panelHRaw = Math.round(height * PANEL_HEIGHT_RATIO);
    const panelWRaw = Math.round(width * PANEL_WIDTH_RATIO);
    const panelH = Math.min(panelHRaw, PANEL_MAX_HEIGHT);
    const panelW = Math.min(panelWRaw, PANEL_MAX_WIDTH);
    const panelX = Math.round((width - panelW) / 2);
    const refH = panelH;
    const innerPad = Math.max(4, Math.round(refH * 0.04));
    const gapNameBody = Math.max(3, Math.round(refH * 0.03));
    const gapBodyOptions = Math.max(6, Math.round(refH * 0.06));
    const bottomPad = Math.max(4, Math.round(refH * 0.05));

    const maxH = panelH;
    const minH = Math.round(height * 0.18);

    const nameFontSize = Math.max(10, Math.round(height * NAME_FONT_RATIO));
    const bodyFontSize = Math.max(9, Math.round(height * BODY_FONT_RATIO));
    const optionLineHeight = Math.max(12, Math.round(height * OPTION_LINE_RATIO));
    const hintFontSize = Math.max(8, Math.round(height * HINT_FONT_RATIO));

    const optionAreaH = options.length > 0
      ? options.length * optionLineHeight + bottomPad
      : hintFontSize + Math.round(refH * 0.03) + bottomPad;

    // Max text height if panel were fully expanded
    const maxTextH = maxH - innerPad - nameFontSize - gapNameBody - gapBodyOptions - optionAreaH;

    // Try shrinking font until text fits inside maxTextH
    const textBlockW = sz(panelW - innerPad * 2);
    let bestFont = bodyFontSize;
    let bestTextH = 0;

    for (let trySize = bodyFontSize; trySize >= 7; trySize--) {
      const temp = this.scene.add.text(0, 0, text, uiTextStyle({
        fontSize: trySize + 'px',
        color: '#eeeeee',
        fixedWidth: textBlockW,
        wordWrap: { width: textBlockW, useAdvancedWrap: true },
        lineSpacing: Math.max(2, Math.round(trySize * 0.3)),
        padding: { x: 0, y: 0 },
      }));
      const h = temp.height * zoom;
      temp.destroy();

      if (h <= maxTextH || trySize === 7) {
        bestFont = trySize;
        bestTextH = h;
        break;
      }
    }

    // Apply the chosen font size to bodyText
    this.bodyText.setStyle(uiTextStyle({
      fontSize: bestFont + 'px',
      color: '#eeeeee',
      fixedWidth: textBlockW,
      wordWrap: { width: textBlockW, useAdvancedWrap: true },
      lineSpacing: Math.max(2, Math.round(bestFont * 0.3)),
      padding: { x: 0, y: 0 },
    }));

    // Compute final panel height from actual text height
    const requiredH = innerPad + nameFontSize + gapNameBody + bestTextH + gapBodyOptions + optionAreaH;
    const finalPanelH = Math.max(minH, Math.min(requiredH, maxH));
    const finalPanelY = height - finalPanelH - panelMargin;

    const nameY = finalPanelY + innerPad;
    const bodyY = nameY + nameFontSize + gapNameBody;
    const optionStartY = bodyY + bestTextH + gapBodyOptions;
    const hintY = finalPanelY + finalPanelH - hintFontSize - Math.round(finalPanelH * 0.03);

    this.layout = {
      panelScreenX: panelX,
      panelScreenY: finalPanelY,
      panelScreenW: panelW,
      panelScreenH: finalPanelH,
      innerPad,
      bodyScreenY: bodyY,
      optionStartScreenY: optionStartY,
      hintScreenY: hintY,
    };

    const camera = this.scene.cameras.main;
    const toWorldX = (sx: number) => camera.centerX + (sx - camera.centerX) / zoom;
    const toWorldY = (sy: number) => camera.centerY + (sy - camera.centerY) / zoom;

    this.bg.setPosition(toWorldX(panelX + panelW / 2), toWorldY(finalPanelY + finalPanelH / 2));
    if (this.bg instanceof Phaser.GameObjects.Rectangle) {
      this.bg.setSize(sz(panelW), sz(finalPanelH));
    } else {
      this.bg.setDisplaySize(sz(panelW), sz(finalPanelH));
    }

    this.nameText.setPosition(toWorldX(panelX + innerPad), toWorldY(nameY));
    this.bodyText.setPosition(toWorldX(panelX + innerPad), toWorldY(bodyY));
    this.continueHint.setPosition(toWorldX(panelX + panelW - innerPad), toWorldY(hintY));

    // Remove any previous crop since text now fits
    this.bodyText.setCrop();
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  destroy(): void {
    this.typingTimer?.destroy();
    this.upKey.destroy();
    this.downKey.destroy();
    this.confirmKey.destroy();
    this.eKey.destroy();
    this.container.destroy();
  }

  private createElements(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    this.container = this.scene.add.container(0, 0);
    this.container.setName('dialogue-panel');

    // Proportional sizing based on screen dimensions
    const panelMargin = Math.max(2, Math.round(height * PANEL_MARGIN_RATIO));
    const panelH = Math.max(100, Math.round(height * PANEL_HEIGHT_RATIO));
    const panelW = width - panelMargin * 2;
    const panelX = panelMargin;
    const panelY = height - panelH - panelMargin;

    // Camera zoom compensation for fixed UI elements
    // zoom is anchored at camera center, so screen→world mapping is:
    //   world = center + (screen - center) / zoom
    const camera = this.scene.cameras.main;
    const zoom = camera.zoom;
    const toWorldX = (screenX: number) => camera.centerX + (screenX - camera.centerX) / zoom;
    const toWorldY = (screenY: number) => camera.centerY + (screenY - camera.centerY) / zoom;
    const sz = (v: number) => v / zoom;

    const nameFontSize = Math.max(10, Math.round(height * NAME_FONT_RATIO));
    const bodyFontSize = Math.max(9, Math.round(height * BODY_FONT_RATIO));
    const hintFontSize = Math.max(8, Math.round(height * HINT_FONT_RATIO));
    const innerPad = Math.max(4, Math.round(panelH * 0.04));
    const gapNameBody = Math.max(3, Math.round(panelH * 0.03));
    const lineSpacing = Math.max(3, Math.round(bodyFontSize * 0.35));

    // Background
    if (this.scene.textures.exists('ui_dialogue_bg')) {
      this.bg = this.scene.add.image(toWorldX(panelX + panelW / 2), toWorldY(panelY + panelH / 2), 'ui_dialogue_bg');
      this.bg.setDisplaySize(sz(panelW), sz(panelH));
      this.bg.setOrigin(0.5);
    } else {
      this.bg = this.scene.add.rectangle(toWorldX(panelX + panelW / 2), toWorldY(panelY + panelH / 2), sz(panelW), sz(panelH), 0x1a1a2e, 0.95);
      this.bg.setStrokeStyle(sz(1), 0x4a4a6a);
    }

    // Speaker name
    const nameY = panelY + innerPad;
    this.nameText = this.scene.add.text(toWorldX(panelX + innerPad), toWorldY(nameY), '', uiTextStyle({
      fontSize: nameFontSize + 'px',
      color: '#ffff00',
      padding: { x: 0, y: 0 },
    }));

    // Body text - word wrap with fixed width; height grows with content
    const bodyY = nameY + nameFontSize + gapNameBody;
    const textBlockW = sz(panelW - innerPad * 2);
    this.bodyText = this.scene.add.text(toWorldX(panelX + innerPad), toWorldY(bodyY), '', uiTextStyle({
      fontSize: bodyFontSize + 'px',
      color: '#eeeeee',
      fixedWidth: textBlockW,
      wordWrap: { width: textBlockW, useAdvancedWrap: true },
      lineSpacing,
      padding: { x: 0, y: 0 },
    }));

    // Continue hint (positioned to stay inside panel bounds)
    const hintY = panelY + panelH - hintFontSize - Math.round(panelH * 0.03);
    this.continueHint = this.scene.add.text(toWorldX(panelX + panelW - innerPad), toWorldY(hintY), '▶ E/空格继续', uiTextStyle({
      fontSize: hintFontSize + 'px',
      color: '#888888',
      padding: { y: 1 },
    }));
    this.continueHint.setOrigin(1, 0);
    this.continueHint.setVisible(false);

    this.container.add([this.bg, this.nameText, this.bodyText, this.continueHint]);

    // Each element must have scrollFactor=0 to stay fixed on screen under zoom
    this.bg.setScrollFactor(0);
    this.nameText.setScrollFactor(0);
    this.bodyText.setScrollFactor(0);
    this.continueHint.setScrollFactor(0);

    this.container.setScrollFactor(0);
    this.container.setDepth(100);

    // Store initial layout for adaptive resizing
    this.layout = {
      panelScreenX: panelX,
      panelScreenY: panelY,
      panelScreenW: panelW,
      panelScreenH: panelH,
      innerPad,
      bodyScreenY: bodyY,
      optionStartScreenY: 0,
      hintScreenY: hintY,
    };
  }

  private setupInput(): void {
    this.upKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.confirmKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.eKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  handleInput(): void {
    if (!this.container.visible) return;

    const eKeyIsDown = this.eKey.isDown;
    const spaceIsDown = this.confirmKey.isDown;
    const upIsDown = this.upKey.isDown;
    const downIsDown = this.downKey.isDown;

    const eJustPressed = eKeyIsDown && !this.eKeyWasDown;
    const spaceJustPressed = spaceIsDown && !this.spaceWasDown;
    const upJustPressed = upIsDown && !this.upWasDown;
    const downJustPressed = downIsDown && !this.downWasDown;

    this.eKeyWasDown = eKeyIsDown;
    this.spaceWasDown = spaceIsDown;
    this.upWasDown = upIsDown;
    this.downWasDown = downIsDown;

    // Skip typing or confirm
    if (eJustPressed || spaceJustPressed) {
      if (this.isTyping) {
        this.skipTyping();
      } else if (this.options.length > 0) {
        this.onSelect?.(this.selectedIndex);
      } else {
        this.onClose?.();
      }
      return;
    }

    if (!this.isTyping && this.options.length > 0) {
      if (upJustPressed) {
        this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
        this.updateOptionHighlight();
      }
      if (downJustPressed) {
        this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
        this.updateOptionHighlight();
      }
    }
  }

  // Called from touch input - bypasses keyboard state entirely
  handleInputTouch(): void {
    if (!this.container.visible) return;

    // Skip typing immediately
    if (this.isTyping) {
      this.skipTyping();
      return;
    }

    // Advance: select option if available, otherwise close
    if (this.options.length > 0) {
      this.onSelect?.(this.selectedIndex);
    } else {
      this.onClose?.();
    }
  }

  private typeNextChar(): void {
    this.displayedChars++;
    this.bodyText.setText(this.fullText.slice(0, this.displayedChars));

    if (this.displayedChars >= this.fullText.length) {
      this.finishTyping();
    }
  }

  private skipTyping(): void {
    this.typingTimer?.destroy();
    this.displayedChars = this.fullText.length;
    this.bodyText.setText(this.fullText);
    this.finishTyping();
  }

  private finishTyping(): void {
    this.isTyping = false;
    this.typingTimer = undefined;

    if (this.options.length > 0) {
      this.showOptions();
    } else {
      this.continueHint.setVisible(true);
    }
  }

  private showOptions(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const camera = this.scene.cameras.main;
    const zoom = camera.zoom;
    const toWorldX = (screenX: number) => camera.centerX + (screenX - camera.centerX) / zoom;
    const toWorldY = (screenY: number) => camera.centerY + (screenY - camera.centerY) / zoom;
    const sz = (v: number) => v / zoom;

    const optionFontSize = Math.max(9, Math.round(height * OPTION_FONT_RATIO));
    const optionLineHeight = Math.max(12, Math.round(height * OPTION_LINE_RATIO));

    const startY = this.layout.optionStartScreenY;
    const bottomPad = Math.max(4, Math.round(this.layout.panelScreenH * 0.05));
    const availableHeight = this.layout.panelScreenY + this.layout.panelScreenH - startY - bottomPad;
    const minOptionHeight = Math.round(optionFontSize * 1.5);
    const optionHeight = Math.min(
      Math.max(optionLineHeight, minOptionHeight),
      Math.floor(availableHeight / Math.max(this.options.length, 1)),
    );

    for (let i = 0; i < this.options.length; i++) {
      const opt = this.options[i];

      const cursorX = this.layout.panelScreenX + this.layout.innerPad + 2;
      const textX = cursorX + Math.round(optionFontSize * 0.6);
      const y = startY + i * optionHeight;

      if (i === 0) {
        this.cursor = this.scene.add.text(toWorldX(cursorX), toWorldY(y), '▶', uiTextStyle({
          fontSize: optionFontSize + 'px',
          color: '#ffff00',
          padding: { x: 0, y: 0 },
        }));
        this.cursor.setScrollFactor(0);
        this.container.add(this.cursor);
      }

      const textWidth = width - textX - this.layout.innerPad * 2;
      const text = this.scene.add.text(toWorldX(textX), toWorldY(y), opt.text, uiTextStyle({
        fontSize: optionFontSize + 'px',
        color: i === 0 ? '#ffff00' : '#cccccc',
        padding: { x: 0, y: 0 },
        fixedWidth: sz(textWidth),
        wordWrap: { width: sz(textWidth), useAdvancedWrap: true },
      }));
      text.setScrollFactor(0);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => {
        this.selectedIndex = i;
        this.onSelect?.(i);
      });
      text.on('pointerover', () => {
        this.selectedIndex = i;
        this.updateOptionHighlight();
      });

      this.optionTexts.push(text);
      this.container.add(text);
    }
  }

  private updateOptionHighlight(): void {
    if (this.cursor) {
      const camera = this.scene.cameras.main;
      const zoom = camera.zoom;
      const toWorldY = (screenY: number) => camera.centerY + (screenY - camera.centerY) / zoom;
      const optionLineHeight = Math.max(12, Math.round(this.scene.cameras.main.height * OPTION_LINE_RATIO));
      const startY = this.layout.optionStartScreenY;
      const bottomPad = Math.max(4, Math.round(this.layout.panelScreenH * 0.05));
      const availableHeight = this.layout.panelScreenY + this.layout.panelScreenH - startY - bottomPad;
      const minOptionHeight = Math.max(12, Math.round(this.scene.cameras.main.height * OPTION_FONT_RATIO * 1.5));
      const optionHeight = Math.min(
        Math.max(optionLineHeight, minOptionHeight),
        Math.floor(availableHeight / Math.max(this.options.length, 1)),
      );
      this.cursor.setY(toWorldY(startY + this.selectedIndex * optionHeight));
    }
    for (let i = 0; i < this.optionTexts.length; i++) {
      this.optionTexts[i].setColor(i === this.selectedIndex ? '#ffff00' : '#cccccc');
    }
  }

  private clearOptions(): void {
    for (const text of this.optionTexts) {
      text.destroy();
    }
    this.optionTexts = [];
    this.cursor?.destroy();
    this.cursor = undefined as unknown as Phaser.GameObjects.Text;
    this.continueHint.setVisible(false);
  }

  private hide(): void {
    this.container.setVisible(false);
  }
}
