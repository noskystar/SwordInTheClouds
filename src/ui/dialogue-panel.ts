import { Scene } from 'phaser';
import type { DialogueNode, DialogueOption } from '../types/dialogue';

type SelectCallback = (optionIndex: number) => void;
type CloseCallback = () => void;

export class DialoguePanel {
  private scene: Scene;
  private container!: Phaser.GameObjects.Container;
  private bg!: Phaser.GameObjects.Rectangle;
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

    this.nameText.setText(node.speaker);
    this.bodyText.setText('');
    this.continueHint.setVisible(false);

    // Show container
    this.container.setVisible(true);
    this.container.setAlpha(1);

    // Start typewriter
    this.isTyping = true;
    this.typingTimer = this.scene.time.addEvent({
      delay: 40,
      callback: this.typeNextChar,
      callbackScope: this,
      repeat: this.fullText.length - 1,
    });
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

    // Background
    const panelW = width - 8;
    const panelH = 76;
    const panelX = 4;
    const panelY = height - panelH - 4;
    this.bg = this.scene.add.rectangle(panelX + panelW / 2, panelY + panelH / 2, panelW, panelH, 0x1a1a2e, 0.95);
    this.bg.setStrokeStyle(1, 0x4a4a6a);

    // Speaker name
    this.nameText = this.scene.add.text(panelX + 4, panelY + 4, '', {
      fontSize: '6px',
      color: '#ffff00',
      fontFamily: 'monospace',
    });

    // Body text
    this.bodyText = this.scene.add.text(panelX + 4, panelY + 14, '', {
      fontSize: '6px',
      color: '#eeeeee',
      fontFamily: 'monospace',
      wordWrap: { width: panelW - 8 },
      lineSpacing: 2,
    });

    // Continue hint
    this.continueHint = this.scene.add.text(panelX + panelW - 4, panelY + panelH - 4, '▶ E/空格继续', {
      fontSize: '5px',
      color: '#888888',
      fontFamily: 'monospace',
    });
    this.continueHint.setOrigin(1, 1);
    this.continueHint.setVisible(false);

    this.container.add([this.bg, this.nameText, this.bodyText, this.continueHint]);
    this.container.setScrollFactor(0);
    this.container.setDepth(100);
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
    const height = this.scene.cameras.main.height;
    const panelH = 76;
    const panelX = 4;
    const panelY = height - panelH - 4;
    const startY = panelY + 36;

    for (let i = 0; i < this.options.length; i++) {
      const opt = this.options[i];

      const cursorX = panelX + 6;
      const textX = cursorX + 8;
      const y = startY + i * 10;

      if (i === 0) {
        this.cursor = this.scene.add.text(cursorX, y, '▶', {
          fontSize: '6px',
          color: '#ffff00',
          fontFamily: 'monospace',
        });
        this.container.add(this.cursor);
      }

      const text = this.scene.add.text(textX, y, opt.text, {
        fontSize: '6px',
        color: i === 0 ? '#ffff00' : '#cccccc',
        fontFamily: 'monospace',
      });
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
      const height = this.scene.cameras.main.height;
      const panelH = 76;
      const panelY = height - panelH - 4;
      const startY = panelY + 36;
      this.cursor.setY(startY + this.selectedIndex * 10);
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
