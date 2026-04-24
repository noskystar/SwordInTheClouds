import { Scene } from 'phaser';
import { uiTextStyle } from '../ui/text-style';

interface GameOverData {
  returnScene?: string;
}

export class GameOverScene extends Scene {
  private returnScene = 'OverworldScene';

  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    this.returnScene = data.returnScene ?? 'OverworldScene';
    this.cameras.main.setBackgroundColor('#1a0505');

    const titleText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 20,
      '陨落',
      uiTextStyle({
        fontSize: '20px',
        color: '#cc4444',
      })
    );
    titleText.setOrigin(0.5);

    const subtitleText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 10,
      '按 R 重试  按 T 返回标题',
      uiTextStyle({
        fontSize: '7px',
        color: '#aaaaaa',
      })
    );
    subtitleText.setOrigin(0.5);

    this.input.keyboard?.once('keydown-R', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(this.returnScene);
      });
    });

    this.input.keyboard?.once('keydown-T', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('TitleScene');
      });
    });
  }
}
