import { Scene } from 'phaser';
import type { DialogueNode, DialogueOption } from '../types/dialogue';
import { uiTextStyle } from './text-style';

type SelectCallback = (optionIndex: number) => void;
type CloseCallback = () => void;

const PANEL_MARGIN_RATIO = 0.015;
const PANEL_HEIGHT_RATIO = 0.24;
const PANEL_WIDTH_RATIO = 0.84;
const PANEL_MAX_HEIGHT = 100;
const PANEL_MAX_WIDTH = 540;
const NAME_FONT_RATIO = 0.030;
const BODY_FONT_RATIO = 0.036;
const OPTION_FONT_RATIO = 0.036;
const HINT_FONT_RATIO = 0.030;
const OPTION_LINE_RATIO = 0.038;
const PORTRAIT_SIZE = 48; // dialogue portrait display size in screen pixels

const SPEAKER_TO_PORTRAIT: Record<string, string> = {
  '主角': 'player_portrait',
  '云深子': 'npc_master_portrait',
  '萧寒': 'npc_xiaohan_portrait',
  '红绡': 'npc_hongxiao_portrait',
  '墨言': 'npc_moyan_portrait',
  '白芷': 'npc_baizhi_portrait',
  '雪团': 'npc_xuetuan_portrait',
  '守门弟子': 'npc_disciple_portrait',
  '行商': 'npc_town_merchant_portrait',
  '陈师妹': 'npc_junior_sister_portrait',
  '李师兄': 'npc_disciple_portrait',
  '镇民': 'npc_disciple_portrait',
};

export class DialoguePanel {
  private scene: Scene;
  private container!: Phaser.GameObjects.Container;
  private bg!: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Text;
  private continueHint!: Phaser.GameObjects.Text;
  private portrait!: Phaser.GameObjects.Image;
  private currentSpeaker = '';

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
    this.currentSpeaker = node.speaker;

    // Update portrait before layout so text can offset
    this.updatePortrait();

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

    // Portrait offset: if a portrait is shown, shift text to the right
    const hasPortrait = this.hasPortrait();
    const portraitOffset = hasPortrait ? PORTRAIT_SIZE + innerPad : 0;

    // Max text height if panel were fully expanded
    const maxTextH = maxH - innerPad - nameFontSize - gapNameBody - gapBodyOptions - optionAreaH;

    // Try shrinking font until text fits inside maxTextH
    const textBlockW = sz(panelW - innerPad * 2 - portraitOffset);
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
    const toWorldX = (sx: number) => Math.round(camera.centerX + (sx - camera.centerX) / zoom);
    const toWorldY = (sy: number) => Math.round(camera.centerY + (sy - camera.centerY) / zoom);

    this.bg.setPosition(toWorldX(panelX + panelW / 2), toWorldY(finalPanelY + finalPanelH / 2));
    if (this.bg instanceof Phaser.GameObjects.Rectangle) {
      this.bg.setSize(sz(panelW), sz(finalPanelH));
    } else {
      this.bg.setDisplaySize(sz(panelW), sz(finalPanelH));
    }

    // Position portrait on the left, vertically centered in the text area
    if (hasPortrait) {
      const portraitCenterX = panelX + innerPad + PORTRAIT_SIZE / 2;
      const portraitCenterY = nameY + (finalPanelH - innerPad * 2 - hintFontSize) / 2;
      this.portrait.setPosition(toWorldX(portraitCenterX), toWorldY(portraitCenterY));
    }

    this.nameText.setPosition(toWorldX(panelX + innerPad + portraitOffset), toWorldY(nameY));
    this.bodyText.setPosition(toWorldX(panelX + innerPad + portraitOffset), toWorldY(bodyY));
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

    // Fixed ribbon sizing based on screen dimensions
    const panelMargin = Math.max(2, Math.round(height * PANEL_MARGIN_RATIO));
    const panelHRaw = Math.round(height * PANEL_HEIGHT_RATIO);
    const panelWRaw = Math.round(width * PANEL_WIDTH_RATIO);
    const panelH = Math.min(panelHRaw, PANEL_MAX_HEIGHT);
    const panelW = Math.min(panelWRaw, PANEL_MAX_WIDTH);
    const panelX = Math.round((width - panelW) / 2);
    const panelY = height - panelH - panelMargin;

    // Camera zoom compensation for fixed UI elements
    // zoom is anchored at camera center, so screen→world mapping is:
    //   world = center + (screen - center) / zoom
    const camera = this.scene.cameras.main;
    const zoom = camera.zoom;
    const toWorldX = (screenX: number) => Math.round(camera.centerX + (screenX - camera.centerX) / zoom);
    const toWorldY = (screenY: number) => Math.round(camera.centerY + (screenY - camera.centerY) / zoom);
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

    // Portrait (speaker avatar) — created hidden, shown per-dialogue
    this.portrait = this.scene.add.image(0, 0, '__DEFAULT');
    this.portrait.setDisplaySize(sz(PORTRAIT_SIZE), sz(PORTRAIT_SIZE));
    this.portrait.setVisible(false);
    this.portrait.setScrollFactor(0);
    this.portrait.setName('dialogue-portrait');

    this.container.add([this.bg, this.portrait, this.nameText, this.bodyText, this.continueHint]);

    // Each element must have scrollFactor=0 to stay fixed on screen under zoom
    this.bg.setScrollFactor(0);
    this.portrait.setScrollFactor(0);
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
    const toWorldX = (screenX: number) => Math.round(camera.centerX + (screenX - camera.centerX) / zoom);
    const toWorldY = (screenY: number) => Math.round(camera.centerY + (screenY - camera.centerY) / zoom);
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

    const hasPortrait = this.hasPortrait();
    const portraitOffset = hasPortrait ? PORTRAIT_SIZE + this.layout.innerPad : 0;

    for (let i = 0; i < this.options.length; i++) {
      const opt = this.options[i];

      const cursorX = this.layout.panelScreenX + this.layout.innerPad + portraitOffset + 2;
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
      const toWorldY = (screenY: number) => Math.round(camera.centerY + (screenY - camera.centerY) / zoom);
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

  private hasPortrait(): boolean {
    if (!this.currentSpeaker) return false;
    const key = SPEAKER_TO_PORTRAIT[this.currentSpeaker];
    return !!key && this.scene.textures.exists(key);
  }

  private updatePortrait(): void {
    const key = SPEAKER_TO_PORTRAIT[this.currentSpeaker];
    if (key && this.scene.textures.exists(key)) {
      this.portrait.setTexture(key);
      this.portrait.setVisible(true);
    } else {
      this.portrait.setVisible(false);
    }
  }
}
