import { BootScene } from './scenes/boot-scene';
import { TitleScene } from './scenes/title-scene';
import { OverworldScene } from './scenes/overworld-scene';
import { BattleScene } from './scenes/battle-scene';
import { GameOverScene } from './scenes/gameover-scene';
import { EndingScene } from './scenes/ending-scene';

export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  antialias: false,
  antialiasGL: false,
  roundPixels: true,
  // @ts-ignore - sharpness exists in Phaser 3.80+; ignored safely in 3.70
  sharpness: 1,
  rendererOptions: { antialias: false },
  scale: {
    mode: Phaser.Scale.WIDTH_CONTROLS_HEIGHT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, TitleScene, OverworldScene, BattleScene, GameOverScene, EndingScene],
};
