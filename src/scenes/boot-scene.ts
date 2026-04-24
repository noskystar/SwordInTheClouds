import { Scene } from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

export class BootScene extends Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createLoadingBar();

    // Load any initial assets here
    // Example: this.load.image('logo', 'assets/images/ui/logo.png');
  }

  create(): void {
    this.setupPixelPerfectScaling();

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('TitleScene');
    });
  }

  private setupPixelPerfectScaling(): void {
    const canvas = this.game.canvas;
    const applyIntegerScale = () => {
      const parent = canvas.parentElement;
      const availableWidth = parent?.clientWidth || window.innerWidth;
      const availableHeight = parent?.clientHeight || window.innerHeight;
      const scaleX = availableWidth / GAME_WIDTH;
      const scaleY = availableHeight / GAME_HEIGHT;
      const scale = Math.max(1, Math.floor(Math.min(scaleX, scaleY)));

      this.scale.setZoom(scale);
      this.scale.refresh();
      canvas.style.imageRendering = 'pixelated';
      // On HiDPI screens, force canvas internal resolution to match display for crisp pixels
      const dpr = window.devicePixelRatio || 1;
      const effectiveScale = this.scale.zoom;
      canvas.width = Math.floor(GAME_WIDTH * effectiveScale * dpr);
      canvas.height = Math.floor(GAME_HEIGHT * effectiveScale * dpr);
      canvas.style.width = `${GAME_WIDTH * effectiveScale}px`;
      canvas.style.height = `${GAME_HEIGHT * effectiveScale}px`;
    };

    applyIntegerScale();
    window.addEventListener('resize', applyIntegerScale);
  }

  private createLoadingBar(): void {
    const width = 100;
    const height = 10;
    const x = this.cameras.main.width / 2 - width / 2;
    const y = this.cameras.main.height / 2 - height / 2;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(x, y, width, height);

    const progressBar = this.add.graphics();

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(x + 2, y + 2, (width - 4) * value, height - 4);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
    });
  }
}
