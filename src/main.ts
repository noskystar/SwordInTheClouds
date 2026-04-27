import Phaser from 'phaser';
import { gameConfig } from './config';

const config: Phaser.Types.Core.GameConfig = {
  ...gameConfig,
  parent: 'game-container',
};

const game = new Phaser.Game(config);
(window as unknown as Record<string, unknown>).__game = game;
