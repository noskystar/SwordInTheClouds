import { Scene } from 'phaser';

export class TitleScene extends Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(500, 0, 0, 0);

    const titleText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 20,
      '云深不知剑',
      {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }
    );
    titleText.setOrigin(0.5);

    const subtitleText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 10,
      '按任意键开始',
      {
        fontSize: '8px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      }
    );
    subtitleText.setOrigin(0.5);

    // Blink animation for subtitle
    this.tweens.add({
      targets: subtitleText,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      yoyo: true,
      repeat: -1,
    });

    const startGame = () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('OverworldScene');
      });
    };

    this.input.keyboard?.once('keydown', startGame);
    this.input.once('pointerdown', startGame);
  }
}
