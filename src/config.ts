import { BootScene } from './scenes/boot-scene';
import { TitleScene } from './scenes/title-scene';
import { OverworldScene } from './scenes/overworld-scene';
import { BattleScene } from './scenes/battle-scene';
import { GameOverScene } from './scenes/gameover-scene';
import { EndingScene } from './scenes/ending-scene';

export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 180;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  antialias: false,
  antialiasGL: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
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
