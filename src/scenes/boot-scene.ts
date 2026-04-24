import { Scene } from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

export class BootScene extends Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createLoadingBar();

    // === Backgrounds ===
    this.load.image('bg_title', 'assets/images/backgrounds/bg_title.png');
    this.load.image('bg_battle_forest', 'assets/images/backgrounds/bg_battle_forest.png');
    this.load.image('bg_battle_hall', 'assets/images/backgrounds/bg_battle_hall.png');
    this.load.image('bg_battle_cave', 'assets/images/backgrounds/bg_battle_cave.png');

    // === Player ===
    this.load.image('player_portrait', 'assets/images/characters/player/player_portrait.png');
    this.load.image('player_sprite_sheet', 'assets/images/characters/player/player_sprite_sheet.png');

    // === NPCs ===
    this.load.image('npc_master_portrait', 'assets/images/characters/npcs/npc_master_portrait.png');
    this.load.image('npc_senior_brother_portrait', 'assets/images/characters/npcs/npc_senior_brother_portrait.png');
    this.load.image('npc_second_sister_portrait', 'assets/images/characters/npcs/npc_second_sister_portrait.png');
    this.load.image('npc_third_brother_portrait', 'assets/images/characters/npcs/npc_third_brother_portrait.png');
    this.load.image('npc_junior_sister_portrait', 'assets/images/characters/npcs/npc_junior_sister_portrait.png');
    this.load.image('npc_spirit_pet_portrait', 'assets/images/characters/npcs/npc_spirit_pet_portrait.png');

    // === Enemies ===
    this.load.image('enemy_wolf', 'assets/images/characters/enemies/enemy_wolf.png');
    this.load.image('enemy_bandit', 'assets/images/characters/enemies/enemy_bandit.png');
    this.load.image('enemy_spirit', 'assets/images/characters/enemies/enemy_spirit.png');
    this.load.image('enemy_elder_1', 'assets/images/characters/enemies/enemy_elder_1.png');
    this.load.image('enemy_shadow_clone', 'assets/images/characters/enemies/enemy_shadow_clone.png');

    // === UI ===
    this.load.image('ui_frame_9patch', 'assets/images/ui/ui_frame_9patch.png');
    this.load.image('ui_bars_and_icons', 'assets/images/ui/ui_bars_and_icons.png');
    this.load.image('ui_dialogue_bg', 'assets/images/ui/ui_dialogue_bg.png');
    this.load.image('ui_panel_inventory', 'assets/images/ui/ui_panel_inventory.png');
    this.load.image('ui_element_icons_grid', 'assets/images/ui/ui_element_icons_grid.png');

    // === Tilesets ===
    this.load.image('tileset_ground', 'assets/images/tilesets/tileset_ground.png');
    this.load.image('tileset_building', 'assets/images/tilesets/tileset_building.png');
    this.load.image('tileset_props', 'assets/images/tilesets/tileset_props.png');

    // === Effects ===
    this.load.image('fx_slash', 'assets/images/effects/fx_slash.png');
    this.load.image('fx_fire', 'assets/images/effects/fx_fire.png');
    this.load.image('fx_ice', 'assets/images/effects/fx_ice.png');
    this.load.image('fx_thunder', 'assets/images/effects/fx_thunder.png');
    this.load.image('fx_heal', 'assets/images/effects/fx_heal.png');
    this.load.image('fx_buff', 'assets/images/effects/fx_buff.png');
    this.load.image('fx_levelup', 'assets/images/effects/fx_levelup.png');
    this.load.image('fx_hit', 'assets/images/effects/fx_hit.png');
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
    // Fit the game resolution to the full viewport with an integer zoom cap for crisp pixels.
    const applyIntegerScale = () => {
      const parent = canvas.parentElement;
      const availableWidth = parent?.clientWidth || window.innerWidth;
      const availableHeight = parent?.clientHeight || window.innerHeight;
      const scaleX = availableWidth / GAME_WIDTH;
      const scaleY = availableHeight / GAME_HEIGHT;
      // Cap zoom at 3 so the game stays playable on small screens
      const zoom = Math.max(1, Math.min(Math.floor(Math.min(scaleX, scaleY)), 3));

      this.scale.setZoom(zoom);
      this.scale.refresh();
      canvas.style.imageRendering = 'pixelated';
      // Force HiDPI canvas resolution so pixels stay sharp
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(GAME_WIDTH * zoom * dpr);
      canvas.height = Math.floor(GAME_HEIGHT * zoom * dpr);
      canvas.style.width = `${GAME_WIDTH * zoom}px`;
      canvas.style.height = `${GAME_HEIGHT * zoom}px`;
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
