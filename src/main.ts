import Phaser from 'phaser';
import { gameConfig } from './config';

const config: Phaser.Types.Core.GameConfig = {
  ...gameConfig,
  parent: 'game-container',
};

new Phaser.Game(config);
