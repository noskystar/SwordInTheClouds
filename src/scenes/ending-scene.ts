import { Scene } from 'phaser';
import { ENDINGS } from '../systems/ending-system';
import type { EndingType } from '../types/ending';

interface EndingSceneData {
  endingId: EndingType;
}

const ENDING_BG_COLORS: Record<EndingType, number> = {
  good: 0x1a3a5c,
  neutral: 0x2d4a3e,
  bad: 0x3c1a1a,
  hidden_true: 0x2a1a4a,
  hidden_ironic: 0x1a1a2e,
};

export class EndingScene extends Scene {
  private endingId!: EndingType;

  constructor() {
    super({ key: 'EndingScene' });
  }

  create(data: EndingSceneData): void {
    this.endingId = data.endingId ?? 'neutral';
    const ending = ENDINGS.find((e) => e.id === this.endingId);

    this.cameras.main.setBackgroundColor(ENDING_BG_COLORS[this.endingId]);
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    const title = this.add.text(160, 50, `结局：${ending?.name ?? '未知'}`, {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
      align: 'center',
    });
    title.setOrigin(0.5);
    title.setAlpha(0);

    const desc = this.add.text(160, 90, ending?.description ?? '', {
      fontSize: '7px',
      color: '#cccccc',
      fontFamily: 'monospace',
      align: 'center',
      wordWrap: { width: 280 },
    });
    desc.setOrigin(0.5);
    desc.setAlpha(0);

    const isHidden = ending?.condition.hidden ?? false;
    const typeLabel = this.add.text(160, 130, isHidden ? '【隐藏结局】' : '【普通结局】', {
      fontSize: '6px',
      color: isHidden ? '#ffcc00' : '#888888',
      fontFamily: 'monospace',
    });
    typeLabel.setOrigin(0.5);
    typeLabel.setAlpha(0);

    const prompt = this.add.text(160, 160, '按 SPACE 返回标题画面', {
      fontSize: '6px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    });
    prompt.setOrigin(0.5);
    prompt.setAlpha(0);

    this.tweens.add({ targets: title, alpha: 1, duration: 1500, delay: 500 });
    this.tweens.add({ targets: desc, alpha: 1, duration: 1500, delay: 1500 });
    this.tweens.add({ targets: typeLabel, alpha: 1, duration: 1000, delay: 2500 });
    this.tweens.add({ targets: prompt, alpha: 1, duration: 1000, delay: 3500 });

    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).once('down', () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('TitleScene');
      });
    });
  }
}
