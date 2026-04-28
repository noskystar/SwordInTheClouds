import { Scene } from 'phaser';

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
    // Pixel art map backgrounds (replacing solid color tiles)
    this.load.image('bg_gate', 'assets/images/backgrounds/bg_gate.png');
    this.load.image('bg_main_hall', 'assets/images/backgrounds/bg_main_hall.png');
    this.load.image('bg_disciples_housing', 'assets/images/backgrounds/bg_disciples_housing.png');
    this.load.image('bg_back_mountain', 'assets/images/backgrounds/bg_back_mountain.png');
    this.load.image('bg_meditation_room', 'assets/images/backgrounds/bg_meditation_room.png');
    this.load.image('bg_yunlai_town', 'assets/images/backgrounds/bg_yunlai_town.png');
    this.load.image('bg_library', 'assets/images/backgrounds/bg_library.png');

    // === Player ===
    this.load.image('player_idle', 'assets/images/characters/player/player_idle.png');
    this.load.image('player_portrait', 'assets/images/characters/player/player_portrait.png');
    // Pixel art sprites (16x24 overworld sprites, 4-frame walk cycle 64x24)
    this.load.image('player_sprite', 'assets/images/characters/player/player_sprite.png');
    this.load.spritesheet('player_walk_spritesheet', 'assets/images/characters/player/player_walk_spritesheet.png', { frameWidth: 16, frameHeight: 24 });

    // === NPC overworld sprites (16x24 pixel art) ===
    this.load.image('npc_master', 'assets/images/characters/npcs/npc_master_sprite.png');
    this.load.image('npc_senior_brother', 'assets/images/characters/npcs/npc_senior_brother_sprite.png');
    this.load.image('npc_second_sister', 'assets/images/characters/npcs/npc_junior_sister_sprite.png');
    this.load.image('npc_third_brother', 'assets/images/characters/npcs/npc_senior_brother_sprite.png');
    this.load.image('npc_junior_sister', 'assets/images/characters/npcs/npc_junior_sister_sprite.png');
    this.load.image('npc_spirit_pet', 'assets/images/characters/npcs/npc_spirit_pet_sprite.png');
    this.load.image('npc_xiaohan', 'assets/images/characters/npcs/npc_xiaohan_sprite.png');
    this.load.image('npc_hongxiao', 'assets/images/characters/npcs/npc_junior_sister_sprite.png');
    this.load.image('npc_moyan', 'assets/images/characters/npcs/npc_senior_brother_sprite.png');
    this.load.image('npc_baizhi', 'assets/images/characters/npcs/npc_junior_sister_sprite.png');
    this.load.image('npc_xuetuan', 'assets/images/characters/npcs/npc_spirit_pet_sprite.png');
    this.load.image('npc_disciple', 'assets/images/characters/npcs/npc_junior_sister_sprite.png');
    this.load.image('npc_town_merchant_sprite', 'assets/images/characters/npcs/npc_town_merchant_sprite.png');
    // Walk cycle spritesheets
    this.load.spritesheet('npc_master_walk', 'assets/images/characters/npcs/walk/npc_master_walk.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('npc_junior_sister_walk', 'assets/images/characters/npcs/walk/npc_junior_sister_walk.png', { frameWidth: 512, frameHeight: 512 });

    // === NPC Portraits (for dialogue panels) ===
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
    // Missing enemy sprites (will fall back to colored rectangle until generated)
    this.load.image('enemy_stone_golem', 'assets/images/characters/enemies/enemy_stone_golem.png');
    this.load.image('enemy_flame_fox', 'assets/images/characters/enemies/enemy_flame_fox.png');
    this.load.image('enemy_water_serpent', 'assets/images/characters/enemies/enemy_water_serpent.png');
    this.load.image('enemy_metal_blade', 'assets/images/characters/enemies/enemy_metal_blade.png');

    // === UI ===
    this.load.image('ui_frame_9patch', 'assets/images/ui/ui_frame_9patch.png');
    this.load.image('ui_bars_and_icons', 'assets/images/ui/ui_bars_and_icons.png');
    this.load.image('ui_dialogue_bg', 'assets/images/ui/ui_dialogue_bg.png');
    this.load.image('ui_dialogue_box', 'assets/images/ui/dialogue_box.png');
    this.load.image('ui_panel_inventory', 'assets/images/ui/ui_panel_inventory.png');
    this.load.image('ui_element_icons_grid', 'assets/images/ui/ui_element_icons_grid.png');

    // === Objects ===
    this.load.image('teleport_marker', 'assets/images/objects/teleport_marker.png');

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
    const canvas = this.game.canvas;
    const ctx = this.game.context;
    if (ctx && 'imageSmoothingEnabled' in ctx) {
      (ctx as CanvasRenderingContext2D).imageSmoothingEnabled = false;
    }
    canvas.style.imageRendering = 'pixelated';

    this.scale.on('resize', this.onResize, this);

    // Validate player_walk texture dimensions
    const playerWalkTexture = this.textures.get('player_walk');
    if (playerWalkTexture) {
      const source = playerWalkTexture.getSourceImage() as HTMLImageElement;
      if (source) {
        const w = source.width;
        const h = source.height;
        if (w !== 1024 || h !== 1024) {
          console.warn(`[BootScene] player_walk.png is ${w}x${h}, expected 1024x1024. Walk animation may be broken.`);
        }
      }
    }

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scale.off('resize', this.onResize, this);
      this.scene.start('TitleScene');
    });
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    const width = 100;
    const height = 10;
    const _x = gameSize.width / 2 - width / 2;
    const _y = gameSize.height / 2 - height / 2;

    // Recenter the loading bar if it still exists
    // The progress bar graphics are destroyed on load complete
    // This method exists to demonstrate proper resize handling pattern
    void _x;
    void _y;
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
