import { Scene } from 'phaser';
import { Player } from '../entities/player';
import { NPC, type NPCConfig } from '../entities/npc';
import { DialogueSystem } from '../systems/dialogue-system';
import { DialoguePanel } from '../ui/dialogue-panel';
import chapter1Dialogue from '../data/dialogues/chapter1.json';
import type { DialogueData } from '../types/dialogue';
import type { PlayerBattleStats } from '../systems/battle-system';
import { MapLoader, type MapData, type MapObject } from './map-loader';
import { DayNightSystem } from '../systems/day-night-system';
import { QuestSystem } from '../systems/quest-system';
import { WorldSystem } from '../systems/world-system';
import { SaveSystem } from '../systems/save-system';
import { InventorySystem } from '../systems/inventory-system';
import { SettingsSystem } from '../systems/settings-system';
import { PauseMenu } from '../ui/pause-menu';
import { TouchControls } from '../ui/touch-controls';
import { uiTextStyle } from '../ui/text-style';
import questsData from '../data/quests.json';
import itemsData from '../data/items.json';
import gateMap from '../data/maps/gate.json';
import mainHallMap from '../data/maps/main_hall.json';
import disciplesHousingMap from '../data/maps/disciples_housing.json';
import meditationRoomMap from '../data/maps/meditation_room.json';
import backMountainMap from '../data/maps/back_mountain.json';

interface SceneTransitionData {
  mapId?: string;
  playerX?: number;
  playerY?: number;
  battleResult?: {
    battleGroupId: string;
    result: 'victory' | 'defeat';
    rewards?: { exp: number; drops: { itemId: string; quantity: number }[] };
  };
}

interface StoryTrigger {
  id: string;
  sceneId: string;
  objectId?: string;
  zone?: { x: number; y: number; w: number; h: number };
  requiredFlags: Record<string, boolean>;
  blockedFlags?: string[];
  dialogueNodeId: string;
}

export class OverworldScene extends Scene {
  private player!: Player;
  private npcs: NPC[] = [];
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private worldWidth = 640;
  private worldHeight = 360;
  private eKey!: Phaser.Input.Keyboard.Key;
  private bKey!: Phaser.Input.Keyboard.Key;
  private isDialogueOpen = false;
  private dialogueSystem?: DialogueSystem;
  private dialoguePanel?: DialoguePanel;
  private mapLoader!: MapLoader;
  private mapObjects: MapObject[] = [];
  private dayNightSystem!: DayNightSystem;
  private questSystem!: QuestSystem;
  private worldSystem!: WorldSystem;
  private saveSystem!: SaveSystem;
  private nightOverlay?: Phaser.GameObjects.Rectangle;
  private fogGraphics?: Phaser.GameObjects.Graphics;
  private currentMapId = 'gate';
  private inventorySystem!: InventorySystem;
  private settingsSystem!: SettingsSystem;
  private pauseMenu!: PauseMenu;
  private escKey!: Phaser.Input.Keyboard.Key;
  private touchControls?: TouchControls;
  private storyFlags = new Map<string, boolean | number | string>();
  private storyAffinity = new Map<string, number>();
  private storyMorality = 0;
  private storySwordHeart = 0;

  // Teleport zone state machine
  private teleportZones = new Map<string, { status: 'available' | 'locked' | 'conditional'; hint?: string }>();
  private loadedMapIds = new Set<string>();

  private readonly MAP_NAMES: Record<string, string> = {
    gate: '天剑宗山门',
    main_hall: '天剑殿',
    disciples_housing: '弟子居所',
    meditation_room: '静心阁',
    back_mountain: '后山',
    yunlai_town: '云来镇',
    library: '万卷楼',
  };
  private teleportHints: { text: Phaser.GameObjects.Text; cx: number; cy: number }[] = [];

  constructor() {
    super({ key: 'OverworldScene' });
  }

  preload(): void {
    this.generateTextures();
  }

  create(data: SceneTransitionData = {}): void {
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.saveSystem = new SaveSystem();
    const saved = this.saveSystem.load();
    if (saved?.story) {
      this.storyFlags = new Map(Object.entries(saved.story.flags ?? {}));
      this.storyAffinity = new Map(Object.entries(saved.story.affinity ?? {}));
      this.storyMorality = saved.story.morality ?? 0;
      this.storySwordHeart = saved.story.swordHeart ?? 0;
    }
    // 处理战斗返回
    if (data?.battleResult) {
      this.onBattleReturn(data.battleResult);
    }
    this.dayNightSystem = new DayNightSystem(360);
    this.questSystem = new QuestSystem(questsData as import('../types/quest').QuestData[]);
    this.worldSystem = new WorldSystem([
      {
        id: 'gate', name: '天剑宗山门', description: '宗门入口',
        unlockCondition: { type: 'flag', value: 'always_unlocked' },
        fogRegion: { x: 0, y: 0, width: 640, height: 352 }, mapFile: 'gate.json',
      },
      {
        id: 'main_hall', name: '大殿', description: '长老议事之处',
        unlockCondition: { type: 'flag', value: 'always_unlocked' },
        fogRegion: { x: 0, y: 0, width: 640, height: 352 }, mapFile: 'main_hall.json',
      },
      {
        id: 'disciples_housing', name: '弟子居所', description: '弟子休息之处',
        unlockCondition: { type: 'flag', value: 'met_elder' },
        fogRegion: { x: 0, y: 0, width: 480, height: 320 }, mapFile: 'disciples_housing.json',
      },
      {
        id: 'meditation_room', name: '修炼静室', description: '静心修炼之所',
        unlockCondition: { type: 'flag', value: 'knows_rules' },
        fogRegion: { x: 0, y: 0, width: 320, height: 256 }, mapFile: 'meditation_room.json',
      },
      {
        id: 'back_mountain', name: '后山', description: '灵兽出没之地',
        unlockCondition: { type: 'quest', value: 'main_chapter1' },
        fogRegion: { x: 0, y: 0, width: 800, height: 480 }, mapFile: 'back_mountain.json',
      },
    ]);
    this.worldSystem.unlockArea('gate');

    // Initialize known maps
    this.loadedMapIds.add('gate');
    this.loadedMapIds.add('main_hall');
    this.loadedMapIds.add('disciples_housing');
    this.loadedMapIds.add('back_mountain');

    this.mapLoader = new MapLoader(this);
    const targetMapId = data?.mapId ?? saved?.player?.position?.scene ?? this.currentMapId;
    this.currentMapId = targetMapId;
    this.loadMap(this.currentMapId, data?.playerX, data?.playerY);
    this.setupDayNightOverlay();
    this.setupFogOverlay();
    this.createPlayer(data?.playerX, data?.playerY);
    this.setupCamera();
    this.setupCollisions();
    this.setupHUD();

    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.bKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.escKey.on('down', () => this.pauseMenu.toggle());

    this.inventorySystem = new InventorySystem(itemsData as import('../types/inventory').ItemData[]);
    this.settingsSystem = new SettingsSystem();
    this.pauseMenu = new PauseMenu(
      this,
      this.inventorySystem,
      this.questSystem,
      this.dayNightSystem,
      this.settingsSystem,
      () => ({ x: this.player.x, y: this.player.y }),
      () => this.worldSystem.getAreaData(this.currentMapId)?.name ?? this.currentMapId,
    );

    this.touchControls = TouchControls.createIfTouch(this, {
      onInteract: () => {
        this.touchInteractWasDown = true;
        this.checkInteractions();
      },
      onBattle: () => this.checkBattleTrigger(),
      onMenu: () => this.pauseMenu.toggle(),
      onDialogueAdvance: () => {
        if (this.dialoguePanel?.isVisible()) {
          this.dialoguePanel.handleInputTouch();
        }
      },
    });

    this.dayNightSystem.on('phase_changed', () => {
      this.updateDayNightOverlay();
    });
  }

  update(_time: number, delta: number): void {
    if (this.pauseMenu?.isVisible()) {
      return;
    }
    if (this.dialoguePanel?.isVisible()) {
      this.dialoguePanel.handleInput();
      this.eKeyWasDown = this.eKey.isDown;
      this.bKeyWasDown = this.bKey.isDown;
      return;
    }
    if (this.isDialogueOpen) {
      this.checkDialogueClose();
      this.eKeyWasDown = this.eKey.isDown;
      this.bKeyWasDown = this.bKey.isDown;
      return;
    }

    this.dayNightSystem.tick(delta);
    this.updateDayNightOverlay();

    if (this.touchControls?.isActive()) {
      const dir = this.touchControls.getDirection();
      this.player.setVirtualDirection(dir.x, dir.y);
    }

    this.checkMapObjects();
    this.checkNPCProximity();
    this.checkInteractions();
    this.checkBattleTrigger();
    this.updateTeleportHints();
    this.eKeyWasDown = this.eKey.isDown;
    this.bKeyWasDown = this.bKey.isDown;
  }

  private generateTextures(): void {
    // Player and NPC sprites now loaded from assets/images/characters/
    // Keep procedural textures for environment objects only

    // --- Ground tile (16x16, grassy field with detail) ---
    const groundGfx = this.make.graphics({ x: 0, y: 0 });
    groundGfx.fillStyle(0x2d6b2d, 1);
    groundGfx.fillRect(0, 0, 16, 16);
    // Grass blade details
    groundGfx.fillStyle(0x3d8a3d, 1);
    groundGfx.fillRect(1, 1, 2, 3);
    groundGfx.fillRect(5, 0, 1, 2);
    groundGfx.fillRect(8, 2, 2, 2);
    groundGfx.fillRect(12, 0, 2, 3);
    groundGfx.fillRect(14, 3, 1, 2);
    groundGfx.fillRect(3, 6, 2, 2);
    groundGfx.fillRect(10, 5, 1, 3);
    groundGfx.fillRect(0, 10, 2, 2);
    groundGfx.fillRect(7, 9, 2, 2);
    groundGfx.fillRect(13, 11, 2, 2);
    groundGfx.fillRect(2, 13, 1, 2);
    groundGfx.fillRect(9, 14, 2, 1);
    // Flowers
    groundGfx.fillStyle(0xf0c0e0, 1);
    groundGfx.fillRect(4, 4, 1, 1);
    groundGfx.fillStyle(0xe0e040, 1);
    groundGfx.fillRect(11, 8, 1, 1);
    groundGfx.fillStyle(0xf080c0, 1);
    groundGfx.fillRect(1, 12, 1, 1);
    groundGfx.generateTexture('ground', 16, 16);

    // --- Tree/obstacle (16x16, pine tree) ---
    const treeGfx = this.make.graphics({ x: 0, y: 0 });
    // Trunk
    treeGfx.fillStyle(0x5c4033, 1);
    treeGfx.fillRect(6, 11, 4, 5);
    // Foliage layers (dark green)
    treeGfx.fillStyle(0x1f5f1f, 1);
    treeGfx.fillRect(2, 0, 12, 5);
    treeGfx.fillRect(3, 4, 10, 4);
    treeGfx.fillRect(4, 7, 8, 4);
    // Lighter green accents
    treeGfx.fillStyle(0x2d7a2d, 1);
    treeGfx.fillRect(3, 1, 4, 2);
    treeGfx.fillRect(9, 0, 3, 2);
    treeGfx.fillRect(4, 5, 3, 2);
    treeGfx.fillRect(8, 5, 3, 2);
    treeGfx.fillRect(5, 8, 2, 2);
    treeGfx.fillRect(7, 8, 3, 2);
    treeGfx.generateTexture('tree', 16, 16);

    // --- NPC fallback textures (procedural portraits for missing assets) ---
    const npcColors: Record<string, number> = {
      npc_disciple: 0x888888,
      npc_xiaohan: 0x4a90d9,
      npc_hongxiao: 0xd94a90,
      npc_moyan: 0x4a4a4a,
      npc_baizhi: 0x90d94a,
      npc_xuetuan: 0xffffff,
    };
    for (const [key, color] of Object.entries(npcColors)) {
      if (!this.textures.exists(key)) {
        const gfx = this.make.graphics({ x: 0, y: 0 });
        gfx.fillStyle(color, 1);
        gfx.fillRect(0, 0, 16, 16);
        gfx.lineStyle(1, 0xffffff, 0.3);
        gfx.strokeRect(0, 0, 16, 16);
        gfx.generateTexture(key, 16, 16);
      }
    }
  }

  private createMap(): void {
    // Create a simple tiled ground
    const tileWidth = 16;
    const tileHeight = 16;
    const cols = Math.ceil(this.worldWidth / tileWidth);
    const rows = Math.ceil(this.worldHeight / tileHeight);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this.add.image(x * tileWidth + tileWidth / 2, y * tileHeight + tileHeight / 2, 'ground');
      }
    }

    // Add world bounds
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
  }

  private createObstacles(): void {
    this.obstacles = this.physics.add.staticGroup();

    // Place some trees as obstacles
    const treePositions = [
      { x: 100, y: 80 },
      { x: 120, y: 80 },
      { x: 140, y: 80 },
      { x: 100, y: 100 },
      { x: 300, y: 150 },
      { x: 320, y: 150 },
      { x: 300, y: 170 },
      { x: 500, y: 200 },
      { x: 520, y: 200 },
      { x: 500, y: 220 },
      { x: 200, y: 280 },
      { x: 220, y: 280 },
      { x: 400, y: 80 },
      { x: 420, y: 80 },
    ];

    for (const pos of treePositions) {
      const tree = this.obstacles.create(pos.x, pos.y, 'tree') as Phaser.Physics.Arcade.Sprite;
      tree.setDepth(1);
    }
  }

  private createPlayer(startX?: number, startY?: number): void {
    const x = startX ?? this.playerSpawnX ?? this.worldWidth / 2;
    const y = startY ?? this.playerSpawnY ?? this.worldHeight / 2;

    this.player = new Player(this, x, y);
    this.player.setDepth(2);
  }

  private createNPCsForMap(mapId: string): void {
    const npcConfigsByMap: Record<string, NPCConfig[]> = {
      gate: [
        { id: 'yunshen', name: '云深子', x: 160, y: 100, texture: 'npc_master' },
        { id: 'gate_guard', name: '守门弟子', x: 280, y: 120, texture: 'npc_disciple' },
      ],
      main_hall: [
        { id: 'xiaohan', name: '萧寒', x: 200, y: 110, texture: 'npc_xiaohan' },
        { id: 'hongxiao', name: '红绡', x: 360, y: 110, texture: 'npc_hongxiao' },
      ],
      disciples_housing: [
        { id: 'moyan', name: '墨言', x: 120, y: 100, texture: 'npc_moyan' },
        { id: 'baizhi', name: '白芷', x: 280, y: 120, texture: 'npc_baizhi' },
        { id: 'chen_meimei', name: '陈师妹', x: 400, y: 140, texture: 'npc_junior_sister' },
        { id: 'li_shixiong', name: '李师兄', x: 80, y: 160, texture: 'npc_disciple' },
      ],
      yunlai_town: [
        { id: 'merchant', name: '行商', x: 200, y: 120, texture: 'npc_town_merchant_sprite' },
        { id: 'townsfolk_1', name: '镇民', x: 120, y: 144, texture: 'npc_disciple' },
        { id: 'townsfolk_2', name: '镇民', x: 48, y: 96, texture: 'npc_disciple' },
      ],
      library: [
        { id: 'moyan_library', name: '墨言', x: 144, y: 64, texture: 'npc_moyan' },
      ],
      back_mountain: [
        { id: 'xuetuan', name: '雪团', x: 120, y: 200, texture: 'npc_xuetuan' },
        { id: 'xiaohan_deep', name: '萧寒', x: 560, y: 120, texture: 'npc_xiaohan' },
      ],
    };

    const configs = npcConfigsByMap[mapId] ?? [];
    for (const config of configs) {
      const npc = new NPC(this, config);
      npc.setDepth(2);
      npc.onInteract(() => this.onNPCInteract(config.id));
      this.npcs.push(npc);
    }
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(3); // was 2
  }

  private setupCollisions(): void {
    // Player collides with obstacles
    this.physics.add.collider(this.player, this.obstacles);

    // Proximity detection is handled by checkNPCProximity() in update()
  }

  private setupHUD(): void {
    const halfW = this.cameras.main.width / 2;
    const halfH = this.cameras.main.height / 2;
    const hintText = this.add.text(4 - halfW, 4 - halfH, 'WASD/方向键移动  E 交互  B 战斗', uiTextStyle({
      fontSize: '7px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 2, y: 1 },
    }));
    hintText.setScrollFactor(0);
    hintText.setDepth(10);
  }

  private loadMap(mapId: string, playerX?: number, playerY?: number): void {
    this.children.list
      .filter((child) => child.name === 'map-object' || child.name === 'ground-tile' || child.name === 'teleport-hint')
      .forEach((child) => child.destroy());
    this.npcs.forEach((npc) => npc.destroy());
    this.npcs = [];
    this.teleportHints = [];

    const mapModules: Record<string, MapData> = {
      gate: gateMap as MapData,
      main_hall: mainHallMap as MapData,
      disciples_housing: disciplesHousingMap as MapData,
      meditation_room: meditationRoomMap as MapData,
      back_mountain: backMountainMap as MapData,
      yunlai_town: { width: 480, height: 320, spawnPoint: { x: 144, y: 160 }, bg: 'bg_yunlai_town' } as MapData,
      library: { width: 320, height: 256, spawnPoint: { x: 144, y: 112 }, bg: 'bg_library' } as MapData,
    };

    const mapData = mapModules[mapId];
    if (mapData) {
      this.currentMapId = mapId;
      this.loadedMapIds.add(mapId);

      const loaded = this.mapLoader.loadMap(mapData);
      this.obstacles = loaded.obstacles;
      this.mapObjects = loaded.objects;
      this.worldWidth = loaded.width;
      this.worldHeight = loaded.height;

      for (const sprite of loaded.groundSprites) {
        sprite.setName('ground-tile');
      }

      this.mapLoader.createVisualObjects(this.mapObjects);
      this.createNPCsForMap(this.currentMapId);
      this.checkStoryTriggers();

      // Apply teleport zone status and visual feedback
      this.teleportZones.clear();
      for (const obj of this.mapObjects) {
        if (obj.type === 'teleport') {
          const zoneState = this.resolveTeleportStatus(obj);
          const zoneKey = obj.id || `${obj.x}-${obj.y}`;
          this.teleportZones.set(zoneKey, zoneState);

          // Find and tint the portal visuals (match by name + x proximity; y varies due to tween)
          const cx = obj.x + obj.w / 2;
          const portalVisuals = this.children.list.filter(
            (c) => c.name === 'teleport-visual' && Math.abs((c as any).x - cx) < 4
          );
          for (const d of portalVisuals) {
            if (zoneState.status === 'locked') {
              if (typeof (d as any).setTint === 'function') {
                (d as any).setTint(0x888888);
                (d as any).setAlpha(0.5);
              } else if (typeof (d as any).setFillStyle === 'function') {
                (d as any).setFillStyle(0x888888, 0.3);
              }
            } else if (zoneState.status === 'conditional') {
              if (typeof (d as any).setTint === 'function') {
                (d as any).setTint(0xffaa44);
              } else if (typeof (d as any).setFillStyle === 'function') {
                (d as any).setFillStyle(0xffaa44, (d as any).alpha);
              }
            }
          }
        }
      }

      // Create teleport destination hints
      for (const obj of this.mapObjects) {
        if (obj.type === 'teleport' && obj.target) {
          const cx = obj.x + obj.w / 2;
          const cy = obj.y + obj.h / 2;
          const targetName = this.MAP_NAMES[obj.target] ?? obj.target;

          const hintText = this.add.text(
            cx,
            cy - 20,
            `→ ${targetName}`,
            uiTextStyle({
              fontSize: '14px',
              color: '#88ccff',
              stroke: '#000000',
              strokeThickness: 2,
            })
          );
          hintText.setOrigin(0.5);
          hintText.setDepth(10);
          hintText.setAlpha(0);
          hintText.setName('teleport-hint');

          this.teleportHints.push({ text: hintText, cx, cy });
        }
      }

      if (playerX === undefined || playerY === undefined) {
        this.playerSpawnX = loaded.spawnPoint.x;
        this.playerSpawnY = loaded.spawnPoint.y;
      }
    } else {
      this.createFallbackMap();
    }
  }

  private playerSpawnX = 0;
  private playerSpawnY = 0;

  private createFallbackMap(): void {
    this.worldWidth = 640;
    this.worldHeight = 360;
    this.createMap();
    this.createObstacles();
  }

  private setupDayNightOverlay(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.nightOverlay = this.add.rectangle(
      width / 2, height / 2,
      width, height,
      this.dayNightSystem.getTintColor(),
      this.dayNightSystem.getTintAlpha()
    );
    this.nightOverlay.setName('daynight-overlay');
    this.nightOverlay.setScrollFactor(0);
    this.nightOverlay.setDepth(20);
    this.nightOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  private updateDayNightOverlay(): void {
    if (!this.nightOverlay) return;
    this.nightOverlay.setFillStyle(this.dayNightSystem.getTintColor(), this.dayNightSystem.getTintAlpha());
  }

  private setupFogOverlay(): void {
    this.fogGraphics = this.add.graphics();
    this.fogGraphics.setName('fog-overlay');
    this.fogGraphics.setDepth(15);
    this.updateFogOverlay();
  }

  private updateFogOverlay(): void {
    if (!this.fogGraphics) return;
    this.fogGraphics.clear();

    const regions = this.worldSystem.getFogRegions();
    for (const region of regions) {
      if (region.isUnlocked) continue;
      if (region.areaId !== this.currentMapId) continue;
      this.fogGraphics.fillStyle(0x000000, 0.7);
      this.fogGraphics.fillRect(region.region.x, region.region.y, region.region.width, region.region.height);
    }
  }

  private checkMapObjects(): void {
    const px = this.player.x;
    const py = this.player.y;

    for (const obj of this.mapObjects) {
      const inZone =
        px >= obj.x &&
        px <= obj.x + obj.w &&
        py >= obj.y &&
        py <= obj.y + obj.h;

      if (!inZone) continue;

      if (obj.type === 'teleport' && obj.target && obj.targetX !== undefined && obj.targetY !== undefined) {
        const zoneKey = obj.id || `${obj.x}-${obj.y}`;
        const zone = this.teleportZones.get(zoneKey);
        if (zone && zone.status === 'available') {
          this.autoSave();
          this.currentMapId = obj.target;
          this.transitionToScene('OverworldScene', obj.targetX, obj.targetY, obj.target);
        } else {
          this.showFloatingHint(zone?.hint || '灵气阻隔，难以逾越');
        }
        return;
      }

      if (obj.type === 'story_trigger' && obj.id) {
        this.checkStoryTriggers(obj.id);
        return;
      }

      if (obj.type === 'encounter' && obj.battleGroupId) {
        if (Math.random() < 0.01) {
          this.startEncounter(obj.battleGroupId);
          return;
        }
      }
    }
  }

  private autoSave(): void {
    const saveData = {
      version: '1.0',
      timestamp: Date.now(),
      player: {
        name: '主角',
        level: 1,
        exp: 0,
        stats: { hp: 100, maxHp: 100, mp: 50, maxMp: 50, attack: 10, defense: 5, speed: 10, critRate: 0.05, critDamage: 1.5, element: 'metal' },
        position: {
          scene: this.currentMapId,
          x: this.player?.x ?? this.playerSpawnX,
          y: this.player?.y ?? this.playerSpawnY,
        },
      },
      inventory: this.inventorySystem ? { slots: this.inventorySystem.getSlots(), equipped: {} } : { slots: [], equipped: {} },
      quests: this.questSystem?.getState() ?? { active: [], completed: [] },
      world: {
        unlockedAreas: this.worldSystem?.getUnlockedAreas() ?? [],
        currentTime: this.dayNightSystem?.getTime() ?? 360,
        currentPhase: this.dayNightSystem?.getCurrentPhase() ?? 'dawn',
      },
      story: {
        flags: Object.fromEntries(this.storyFlags),
        affinity: Object.fromEntries(this.storyAffinity),
        morality: this.storyMorality,
        swordHeart: this.storySwordHeart,
        choices: [],
        charactersHelped: [],
        itemsCollected: [],
      },
    };
    this.saveSystem.save(saveData);
  }

  private transitionToScene(sceneKey: string, x: number, y: number, targetMapId?: string): void {
    const mapId = targetMapId ?? this.currentMapId;
    if (sceneKey === 'OverworldScene' && !this.loadedMapIds.has(mapId)) {
      this.showFloatingHint('前路隐于迷雾之中，似有大能设下的禁制');
      return;
    }
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(sceneKey, { mapId, playerX: x, playerY: y } as SceneTransitionData);
    });
  }

  private checkNPCProximity(): void {
    for (const npc of this.npcs) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      npc.setPlayerNearby(distance < 32);
    }
  }

  private eKeyWasDown = false;
  private touchInteractWasDown = false;

  private checkInteractions(): void {
    const eKeyIsDown = this.eKey.isDown;
    const justPressed = eKeyIsDown && !this.eKeyWasDown;
    this.eKeyWasDown = eKeyIsDown;

    if (justPressed) {
      for (const npc of this.npcs) {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
        if (distance < 32 && this.isPlayerNearby(npc)) {
          npc.interact();
          break;
        }
      }
    }

    // Touch button: fire immediately without debounce
    if (this.touchInteractWasDown) {
      this.touchInteractWasDown = false;
      // Close simple dialogue on touch interact if open
      if (this.isDialogueOpen && !this.dialoguePanel?.isVisible()) {
        this.closeDialogue();
        return;
      }
      for (const npc of this.npcs) {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
        if (distance < 32 && this.isPlayerNearby(npc)) {
          npc.interact();
          break;
        }
      }
    }
  }

  private isPlayerNearby(npc: NPC): boolean {
    return npc.getNearby();
  }

  private checkDialogueClose(): void {
    const eKeyIsDown = this.eKey.isDown;
    const justPressed = eKeyIsDown && !this.eKeyWasDown;
    this.eKeyWasDown = eKeyIsDown;

    if (justPressed) {
      this.closeDialogue();
    }
  }

  private closeDialogue(): void {
    if (!this.isDialogueOpen) return;
    const dialogueChildren = this.children.list.filter(
      (child) => child.name === 'dialogue-ui'
    );
    dialogueChildren.forEach((child) => child.destroy());
    this.physics.resume();
    this.isDialogueOpen = false;
  }

  private showFloatingHint(text: string): void {
    if (!this.player) return;
    const hint = this.add.text(this.player.x, this.player.y - 24, text, {
      fontSize: '10px',
      color: '#ffaa44',
      stroke: '#000000',
      strokeThickness: 2,
    });
    hint.setOrigin(0.5);
    hint.setDepth(50);

    this.tweens.add({
      targets: hint,
      y: hint.y - 16,
      alpha: 0,
      duration: 2000,
      ease: 'Power1',
      onComplete: () => hint.destroy(),
    });
  }

  private updateTeleportHints(): void {
    const px = this.player.x;
    const py = this.player.y;
    const FADE_DISTANCE = 64;

    for (const hint of this.teleportHints) {
      const distance = Phaser.Math.Distance.Between(px, py, hint.cx, hint.cy);
      const targetAlpha = distance < FADE_DISTANCE ? 1 : 0;
      const deltaAlpha = 0.15;

      if (hint.text.alpha < targetAlpha) {
        hint.text.setAlpha(Math.min(targetAlpha, hint.text.alpha + deltaAlpha));
      } else if (hint.text.alpha > targetAlpha) {
        hint.text.setAlpha(Math.max(targetAlpha, hint.text.alpha - deltaAlpha));
      }
    }
  }

  private startDialogue(data: DialogueData, startNodeId?: string): void {
    if (this.isDialogueOpen) return;
    this.isDialogueOpen = true;
    this.physics.pause();

    this.dialogueSystem = new DialogueSystem({
      flags: Object.fromEntries(this.storyFlags),
      affinity: Object.fromEntries(this.storyAffinity),
      morality: this.storyMorality,
      swordHeart: this.storySwordHeart,
    });
    this.dialogueSystem.loadDialogue(data, startNodeId);

    this.dialogueSystem.on('start_quest', this.onStartQuest);
    this.dialogueSystem.on('advance_quest', this.onAdvanceQuest);
    this.dialogueSystem.on('complete_quest', this.onCompleteQuest);
    this.dialogueSystem.on('start_battle', this.onStartBattle);
    this.dialogueSystem.on('teleport', this.onTeleport);
    this.dialogueSystem.on('effect:set_flag', this.applyDialogueEffect);
    this.dialogueSystem.on('effect:change_affinity', this.applyDialogueEffect);
    this.dialogueSystem.on('effect:change_morality', this.applyDialogueEffect);
    this.dialogueSystem.on('effect:change_sword_heart', this.applyDialogueEffect);
    this.dialogueSystem.on('effect:add_item', this.applyDialogueEffect);
    this.dialogueSystem.on('effect:remove_item', this.applyDialogueEffect);

    this.dialoguePanel = new DialoguePanel(this);
    this.dialoguePanel.setCallbacks(
      (optionIndex) => {
        this.dialogueSystem?.selectOption(optionIndex);
      },
      () => {
        this.endDialogue();
      }
    );

    this.dialogueSystem.setCallbacks(
      (node) => {
        const options = this.dialogueSystem!.getVisibleOptions(node);
        this.dialoguePanel?.showDialogue(node, options);
      },
      () => {
        this.endDialogue();
      }
    );

    this.dialogueSystem.start();
  }

  private endDialogue(): void {
    this.dialogueSystem?.off('start_quest', this.onStartQuest);
    this.dialogueSystem?.off('advance_quest', this.onAdvanceQuest);
    this.dialogueSystem?.off('complete_quest', this.onCompleteQuest);
    this.dialogueSystem?.off('start_battle', this.onStartBattle);
    this.dialogueSystem?.off('teleport', this.onTeleport);
    this.dialogueSystem?.off('effect:set_flag', this.applyDialogueEffect);
    this.dialogueSystem?.off('effect:change_affinity', this.applyDialogueEffect);
    this.dialogueSystem?.off('effect:change_morality', this.applyDialogueEffect);
    this.dialogueSystem?.off('effect:change_sword_heart', this.applyDialogueEffect);
    this.dialogueSystem?.off('effect:add_item', this.applyDialogueEffect);
    this.dialogueSystem?.off('effect:remove_item', this.applyDialogueEffect);
    this.dialoguePanel?.destroy();
    this.dialoguePanel = undefined;
    this.dialogueSystem = undefined;
    this.isDialogueOpen = false;
    this.physics.resume();
  }

  private onStartQuest = (e: unknown): void => {
    const evt = e as { questId: string };
    this.questSystem.acceptQuest(evt.questId);
  };

  private onAdvanceQuest = (e: unknown): void => {
    const evt = e as { questId: string; stage: string };
    this.questSystem.advanceObjective(evt.questId, evt.stage, 1);
  };

  private onCompleteQuest = (e: unknown): void => {
    const evt = e as { questId: string };
    const quest = this.questSystem.getQuestData(evt.questId);
    if (quest) {
      for (const stage of quest.stages) {
        for (const obj of stage.objectives) {
          this.questSystem.advanceObjective(evt.questId, obj.id, obj.requiredCount);
        }
      }
    }
  };

  private onStartBattle = (e: unknown): void => {
    const evt = e as { enemyGroupId: string };
    this.startEncounter(evt.enemyGroupId);
  };

  private onTeleport = (e: unknown): void => {
    const evt = e as { scene: string; x: number; y: number };
    this.transitionToScene(evt.scene, evt.x, evt.y);
  };

  private readonly storyTriggers: StoryTrigger[] = [
    { id: 'c1_gate_opening', sceneId: 'gate', requiredFlags: {}, blockedFlags: ['triggered_c1_gate_opening', 'chapter1_complete'], dialogueNodeId: 'reincarnation' },
    { id: 'c1_hall_ceremony', sceneId: 'main_hall', requiredFlags: { has_token: true }, blockedFlags: ['triggered_c1_hall_ceremony', 'chapter1_complete'], dialogueNodeId: 'main_hall_entry' },
    { id: 'c1_housing_seniors', sceneId: 'disciples_housing', requiredFlags: { met_hongxiao: true }, blockedFlags: ['triggered_c1_housing_seniors', 'chapter1_complete'], dialogueNodeId: 'housing_entry' },
    { id: 'c1_meditation_first', sceneId: 'meditation_room', requiredFlags: { knows_rules: true }, blockedFlags: ['triggered_c1_meditation_first', 'chapter1_complete'], dialogueNodeId: 'meditation_first' },
    { id: 'c1_mountain_xuetuan', sceneId: 'back_mountain', requiredFlags: { met_moyan: true }, blockedFlags: ['triggered_c1_mountain_xuetuan', 'chapter1_complete'], dialogueNodeId: 'mountain_entry' },
    { id: 'c1_dantang_residue', sceneId: 'back_mountain', objectId: 'story_dantang_residue', requiredFlags: { met_xuetuan: true }, blockedFlags: ['triggered_c1_dantang_residue', 'chapter1_complete'], dialogueNodeId: 'dantang_residue' },
    { id: 'c1_xiaohan_forbidden', sceneId: 'back_mountain', objectId: 'story_xiaohan_forbidden', requiredFlags: { investigating_hongxiao: true }, blockedFlags: ['triggered_c1_xiaohan_forbidden', 'chapter1_complete'], dialogueNodeId: 'xiaohan_practicing' },
    { id: 'c1_housing_ending', sceneId: 'disciples_housing', requiredFlags: { boss_done: true }, blockedFlags: ['triggered_c1_housing_ending', 'chapter1_complete'], dialogueNodeId: 'return_housing' },
    { id: 'ch2_yunlai_arrival', sceneId: 'yunlai_town', requiredFlags: { chapter1_complete: true }, blockedFlags: ['triggered_ch2_yunlai'], dialogueNodeId: 'ch2_yunlai_arrival' },
  ];

  private resolveTeleportStatus(obj: MapObject): { status: 'available' | 'locked' | 'conditional'; hint?: string } {
    // 1. Explicitly locked
    if ((obj as any).locked === true) {
      return { status: 'locked', hint: '禁制未解，不可擅入' };
    }

    // 2. Target map not loaded
    const target = (obj as any).target as string;
    if (target && !this.loadedMapIds.has(target)) {
      return { status: 'locked', hint: '此方天地尚未开启' };
    }

    // 3. Condition exists (for now always show as conditional)
    const condition = (obj as any).condition as { type: string; hint: string; itemId?: string; flag?: string } | undefined;
    if (condition && condition.type !== 'none') {
      return { status: 'conditional', hint: condition.hint || '灵气阻隔，难以逾越' };
    }

    // 4. Available
    return { status: 'available' };
  }

  private checkStoryTriggers(objectId?: string): void {
    if (this.isDialogueOpen) return;

    for (const trigger of this.storyTriggers) {
      if (trigger.sceneId !== this.currentMapId) continue;
      if (objectId && trigger.objectId !== objectId) continue;
      if (!objectId && trigger.objectId) continue;

      const blocked = trigger.blockedFlags ?? [];
      if (blocked.some((f) => this.storyFlags.get(f) === true)) continue;

      const required = Object.entries(trigger.requiredFlags);
      if (required.some(([flag, val]) => this.storyFlags.get(flag) !== val)) continue;

      // Trigger matched
      this.storyFlags.set(`triggered_${trigger.id}`, true);
      this.autoSave();
      this.startDialogue(chapter1Dialogue as DialogueData, trigger.dialogueNodeId);
      return; // Only trigger one at a time
    }
  }

  private resolveNPCDialogueNode(npcId: string): string | null {
    const flags = this.storyFlags;
    switch (npcId) {
      case 'xiaohan':
        if (flags.get('met_hongxiao') === true && flags.get('met_xiaohan') !== true) return 'meet_xiaohan_cold';
        break;
      case 'hongxiao':
        if (flags.get('main_hall_entered') === true && flags.get('met_hongxiao') !== true) return 'meet_hongxiao_warm';
        break;
      case 'moyan':
        if (flags.get('met_hongxiao') === true && flags.get('met_moyan') !== true) return 'meet_moyan_hint';
        break;
      case 'baizhi':
        if (flags.get('met_moyan') === true && flags.get('met_baizhi') !== true) return 'meet_baizhi_clingy';
        break;
      case 'xuetuan':
        if (flags.get('met_baizhi') === true && flags.get('met_xuetuan') !== true) return 'meet_xuetuan_talk';
        break;
      case 'merchant':
        if (this.storyFlags.get('chapter1_complete') === true) return 'ch2_yunlai_merchant';
        break;
      case 'moyan_library':
        if (this.storyFlags.get('chapter1_complete') === true) return 'ch2_library_arrival';
        break;
      case 'li_shixiong':
        if (flags.get('met_xuetuan') === true && flags.get('checked_missing_disciple') !== true) return 'disciple_missing';
        break;
      case 'xiaohan_deep':
        if (flags.get('investigating_hongxiao') === true && flags.get('xiaohan_choice_made') !== true) return 'xiaohan_practicing';
        break;
    }
    return null;
  }

  private onNPCInteract(npcId: string): void {
    const nodeId = this.resolveNPCDialogueNode(npcId);
    if (nodeId) {
      this.startDialogue(chapter1Dialogue as DialogueData, nodeId);
    } else {
      const dailyLines: Record<string, string> = {
        yunshen: '去吧，天剑宗的未来在你手中。',
        gate_guard: '令牌在身，方可通行。',
        xiaohan: '修炼不可懈怠。',
        hongxiao: '师妹要不要尝尝我新炼的丹药？',
        moyan: '……（他低头看着阵法书）',
        baizhi: '师姐带你去逛后山吧~',
        chen_meimei: '听说周铁柱好几天没出现了……',
        li_shixiong: '外门弟子的事，少打听为妙。',
        xuetuan: '凡人看不见我，你能看见，很有趣。',
        xiaohan_deep: '……',
        merchant: '这里来来往往的人可多了，什么消息都有。',
        townsfolk_1: '听说了吗？最近山里不太平。',
        townsfolk_2: '镇上来了个奇怪的人，老往那万卷楼跑。',
        moyan_library: '……这里的典籍，或许能找到一些线索。',
      };
      const nameMap: Record<string, string> = {
        yunshen: '云深子',
        gate_guard: '守门弟子',
        xiaohan: '萧寒',
        hongxiao: '红绡',
        moyan: '墨言',
        moyan_library: '墨言',
        baizhi: '白芷',
        chen_meimei: '陈师妹',
        li_shixiong: '李师兄',
        xuetuan: '雪团',
        xiaohan_deep: '萧寒',
        merchant: '行商',
        townsfolk_1: '镇民',
        townsfolk_2: '镇民',
      };
      const text = dailyLines[npcId] ?? '……';
      this.showDialogue(nameMap[npcId] ?? 'NPC', text);
    }
  }

  private onBattleReturn(data: SceneTransitionData['battleResult']): void {
    if (!data) return;
    if (data.battleGroupId === 'ch1_boss_xiaohan_clone') {
      if (data.result === 'victory') {
        this.storyFlags.set('boss_won', true);
      } else {
        this.storyFlags.set('boss_lost', true);
      }
      this.storyFlags.set('boss_done', true);
      this.autoSave();
      // Post-battle dialogue handled by StoryTrigger c1_housing_ending when player returns to housing
      // But if already in housing, trigger immediately
      if (this.currentMapId === 'disciples_housing') {
        this.checkStoryTriggers();
      }
    }
  }

  private applyDialogueEffect = (evt: unknown): void => {
    const e = evt as { effect: { type: string; [k: string]: unknown }; [k: string]: unknown };
    const eff = e.effect;
    switch (eff.type) {
      case 'set_flag': {
        const flagEff = eff as unknown as { flag: string; value: boolean | number | string };
        this.storyFlags.set(flagEff.flag, flagEff.value);
        this.dialogueSystem?.updateContext({ flags: Object.fromEntries(this.storyFlags) });
        break;
      }
      case 'change_affinity': {
        const affEff = eff as unknown as { npcId: string; delta: number };
        const current = this.storyAffinity.get(affEff.npcId) ?? 0;
        this.storyAffinity.set(affEff.npcId, current + affEff.delta);
        this.dialogueSystem?.updateContext({ affinity: Object.fromEntries(this.storyAffinity) });
        break;
      }
      case 'change_morality': {
        this.storyMorality += (eff as unknown as { delta: number }).delta;
        this.dialogueSystem?.updateContext({ morality: this.storyMorality });
        break;
      }
      case 'change_sword_heart': {
        this.storySwordHeart += (eff as unknown as { delta: number }).delta;
        this.dialogueSystem?.updateContext({ swordHeart: this.storySwordHeart });
        break;
      }
      case 'add_item': {
        const addEff = eff as unknown as { itemId: string; quantity: number };
        this.inventorySystem.addItem(addEff.itemId, addEff.quantity);
        break;
      }
      case 'remove_item': {
        const remEff = eff as unknown as { itemId: string; quantity: number };
        this.inventorySystem.removeItem(remEff.itemId, remEff.quantity);
        break;
      }
    }
    this.autoSave();
  };

  private bKeyWasDown = false;

  private checkBattleTrigger(): void {
    const bKeyIsDown = this.bKey.isDown;
    const justPressed = bKeyIsDown && !this.bKeyWasDown;
    this.bKeyWasDown = bKeyIsDown;

    if (justPressed) {
      this.startDemoBattle();
    }
  }

  private startDemoBattle(): void {
    this.startEncounter('demo_mixed');
  }

  private startEncounter(battleGroupId: string): void {
    const playerStats: PlayerBattleStats = {
      id: 'player',
      name: '主角',
      level: 5,
      maxHp: 100,
      maxMp: 50,
      attack: 20,
      defense: 10,
      speed: 100,
      element: 'metal',
      skills: ['slash_metal', 'heal_spring', 'flame_burst'],
      color: 0x4a90d9,
    };

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('BattleScene', {
        battleGroupId,
        playerStats,
        returnScene: 'OverworldScene',
      });
    });
  }

  private showDialogue(speaker: string, text: string): void {
    if (this.isDialogueOpen) return;
    this.isDialogueOpen = true;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const zoom = this.cameras.main.zoom;
    const toWorld = (sx: number) => this.cameras.main.centerX + (sx - this.cameras.main.centerX) / zoom;
    const toWorldY = (sy: number) => this.cameras.main.centerY + (sy - this.cameras.main.centerY) / zoom;
    const sz = (v: number) => v / zoom;

    const panelMargin = Math.max(2, Math.round(height * 0.015));
    const panelH = Math.max(80, Math.round(height * 0.40));
    const panelW = width - panelMargin * 2;
    const panelX = panelMargin;
    const panelY = height - panelH - panelMargin; // always at bottom of screen

    // Background with border — always visible
    const bg = this.add.rectangle(
      toWorld(panelX + panelW / 2),
      toWorldY(panelY + panelH / 2),
      sz(panelW),
      sz(panelH),
      0x1a1a2e,
      0.95
    );
    bg.setStrokeStyle(sz(1), 0x4a4a6a);
    bg.setName('dialogue-ui');
    bg.setScrollFactor(0);
    bg.setDepth(100);

    const nameFontSize = Math.max(10, Math.round(height * 0.038));
    const bodyFontSize = Math.max(9, Math.round(height * 0.034));
    const innerPad = Math.max(4, Math.round(panelH * 0.04));
    const gapNameBody = Math.max(3, Math.round(panelH * 0.03));

    const nameY = panelY + innerPad;
    const bodyY = nameY + nameFontSize + gapNameBody;
    const textBlockW = sz(panelW - innerPad * 2);

    // Adaptive font sizing: shrink until all text fits in available height
    const availableTextH = panelY + panelH - bodyY - innerPad;
    let bestFont = bodyFontSize;
    for (let trySize = bodyFontSize; trySize >= 7; trySize--) {
      const tmp = this.add.text(0, 0, text, uiTextStyle({
        fontSize: trySize + 'px',
        color: '#eeeeee',
        fixedWidth: textBlockW,
        wordWrap: { width: textBlockW, useAdvancedWrap: true },
        lineSpacing: Math.max(2, Math.round(trySize * 0.3)),
        padding: { x: 0, y: 0 },
      }));
      const neededH = tmp.height * zoom;
      tmp.destroy();
      if (neededH <= availableTextH || trySize === 7) {
        bestFont = trySize;
        break;
      }
    }

    const nameText = this.add.text(toWorld(panelX + innerPad), toWorldY(nameY), speaker, uiTextStyle({
      fontSize: nameFontSize + 'px',
      color: '#ffff00',
      padding: { x: 0, y: 0 },
    }));
    nameText.setName('dialogue-ui');
    nameText.setScrollFactor(0);
    nameText.setDepth(101);

    const dialogueText = this.add.text(toWorld(panelX + innerPad), toWorldY(bodyY), text, uiTextStyle({
      fontSize: bestFont + 'px',
      color: '#eeeeee',
      fixedWidth: textBlockW,
      wordWrap: { width: textBlockW, useAdvancedWrap: true },
      lineSpacing: Math.max(2, Math.round(bestFont * 0.3)),
      padding: { x: 0, y: 0 },
    }));
    dialogueText.setName('dialogue-ui');
    dialogueText.setScrollFactor(0);
    dialogueText.setDepth(101);

    const closeHint = this.add.text(toWorld(width - innerPad), toWorldY(panelY + panelH - innerPad), '按 E 关闭', uiTextStyle({
      fontSize: Math.max(8, Math.round(height * 0.030)) + 'px',
      color: '#aaaaaa',
    }));
    closeHint.setOrigin(1, 1);
    closeHint.setName('dialogue-ui');
    closeHint.setScrollFactor(0);
    closeHint.setDepth(101);

    this.physics.pause();
  }
}
