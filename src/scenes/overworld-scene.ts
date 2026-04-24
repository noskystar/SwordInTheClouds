import { Scene } from 'phaser';
import { Player } from '../entities/player';
import { NPC, type NPCConfig } from '../entities/npc';
import { DialogueSystem } from '../systems/dialogue-system';
import { DialoguePanel } from '../ui/dialogue-panel';
import demoDialogueData from '../data/dialogues/demo-dialogue.json';
import chapter1Dialogue from '../data/dialogues/chapter1.json';
import type { DialogueData } from '../types/dialogue';
import type { PlayerBattleStats } from '../systems/battle-system';
import { MapLoader, type MapData, type MapObject } from './map-loader';
import { DayNightSystem } from '../systems/day-night-system';
import { QuestSystem } from '../systems/quest-system';
import { WorldSystem } from '../systems/world-system';
import { SaveSystem } from '../systems/save-system';
import questsData from '../data/quests.json';
import gateMap from '../data/maps/gate.json';
import mainHallMap from '../data/maps/main_hall.json';
import disciplesHousingMap from '../data/maps/disciples_housing.json';
import meditationRoomMap from '../data/maps/meditation_room.json';
import backMountainMap from '../data/maps/back_mountain.json';

interface SceneTransitionData {
  playerX?: number;
  playerY?: number;
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

  constructor() {
    super({ key: 'OverworldScene' });
  }

  preload(): void {
    this.generateTextures();
  }

  create(data: SceneTransitionData): void {
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.saveSystem = new SaveSystem();
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
        unlockCondition: { type: 'flag', value: 'reported_to_guard' },
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

    this.mapLoader = new MapLoader(this);
    this.loadMap(this.currentMapId, data.playerX, data.playerY);
    this.setupDayNightOverlay();
    this.setupFogOverlay();
    this.createPlayer(data.playerX, data.playerY);
    this.createNPCs();
    this.setupCamera();
    this.setupCollisions();
    this.setupHUD();

    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.bKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B);

    this.dayNightSystem.on('phase_changed', () => {
      this.updateDayNightOverlay();
    });
  }

  update(_time: number, delta: number): void {
    if (this.dialoguePanel?.isVisible()) {
      this.dialoguePanel.handleInput();
      this.eKeyWasDown = this.eKey.isDown;
      return;
    }
    if (this.isDialogueOpen) {
      this.checkDialogueClose();
      this.eKeyWasDown = this.eKey.isDown;
      return;
    }

    this.dayNightSystem.tick(delta);
    this.updateDayNightOverlay();

    this.checkMapObjects();
    this.checkNPCProximity();
    this.checkInteractions();
    this.checkBattleTrigger();
    this.eKeyWasDown = this.eKey.isDown;
  }

  private generateTextures(): void {
    // Generate player texture (simple colored rectangle with head)
    const playerGfx = this.make.graphics({ x: 0, y: 0 });
    playerGfx.fillStyle(0x4a90d9, 1);
    playerGfx.fillRect(0, 0, 16, 16);
    playerGfx.fillStyle(0xffccaa, 1);
    playerGfx.fillRect(4, 2, 8, 6);
    playerGfx.generateTexture('player', 16, 16);

    // Generate NPC texture
    const npcGfx = this.make.graphics({ x: 0, y: 0 });
    npcGfx.fillStyle(0xcc6666, 1);
    npcGfx.fillRect(0, 0, 16, 16);
    npcGfx.fillStyle(0xffccaa, 1);
    npcGfx.fillRect(4, 2, 8, 6);
    npcGfx.generateTexture('npc-1', 16, 16);

    // Generate ground tile
    const groundGfx = this.make.graphics({ x: 0, y: 0 });
    groundGfx.fillStyle(0x3d7a3d, 1);
    groundGfx.fillRect(0, 0, 16, 16);
    groundGfx.fillStyle(0x4a8f4a, 1);
    groundGfx.fillRect(0, 0, 8, 8);
    groundGfx.fillRect(8, 8, 8, 8);
    groundGfx.generateTexture('ground', 16, 16);

    // Generate wall/tree obstacle texture
    const wallGfx = this.make.graphics({ x: 0, y: 0 });
    wallGfx.fillStyle(0x5c4033, 1);
    wallGfx.fillRect(2, 0, 12, 16);
    wallGfx.fillStyle(0x2d5a2d, 1);
    wallGfx.fillRect(0, 0, 16, 6);
    wallGfx.generateTexture('tree', 16, 16);
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

  private createNPCs(): void {
    const npcConfigs: NPCConfig[] = [
      {
        id: 'elder',
        name: '长老',
        x: 200,
        y: 120,
        texture: 'npc-1',
        dialogueId: 'demo-elder',
      },
      {
        id: 'disciple',
        name: '弟子',
        x: 400,
        y: 200,
        texture: 'npc-1',
        dialogues: ['听说大师兄最近行为有些奇怪……'],
      },
    ];

    for (const config of npcConfigs) {
      const npc = new NPC(this, config);
      npc.setDepth(2);

      npc.onInteract(() => {
        if (config.id === 'elder') {
          this.startDialogue(chapter1Dialogue as DialogueData);
        } else if (config.dialogueId) {
          this.startDialogue(demoDialogueData as DialogueData);
        } else if (config.dialogues && config.dialogues.length > 0) {
          this.showDialogue(npc.getNPCName(), config.dialogues[0]);
        }
      });

      this.npcs.push(npc);
    }
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);
  }

  private setupCollisions(): void {
    // Player collides with obstacles
    this.physics.add.collider(this.player, this.obstacles);

    // Proximity detection is handled by checkNPCProximity() in update()
  }

  private setupHUD(): void {
    const halfW = this.cameras.main.width / 2;
    const halfH = this.cameras.main.height / 2;
    const hintText = this.add.text(4 - halfW, 4 - halfH, 'WASD/方向键移动  E 交互  B 战斗', {
      fontSize: '6px',
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#00000088',
      padding: { x: 2, y: 1 },
    });
    hintText.setScrollFactor(0);
    hintText.setDepth(10);
  }

  private loadMap(mapId: string, playerX?: number, playerY?: number): void {
    this.children.list
      .filter((child) => child.name === 'map-object' || child.name === 'ground-tile')
      .forEach((child) => child.destroy());

    const mapModules: Record<string, MapData> = {
      gate: gateMap as MapData,
      main_hall: mainHallMap as MapData,
      disciples_housing: disciplesHousingMap as MapData,
      meditation_room: meditationRoomMap as MapData,
      back_mountain: backMountainMap as MapData,
    };

    const mapData = mapModules[mapId];
    if (mapData) {
      this.currentMapId = mapId;

      const loaded = this.mapLoader.loadMap(mapData);
      this.obstacles = loaded.obstacles;
      this.mapObjects = loaded.objects;
      this.worldWidth = loaded.width;
      this.worldHeight = loaded.height;

      for (const sprite of loaded.groundSprites) {
        sprite.setName('ground-tile');
      }

      this.mapLoader.createVisualObjects(this.mapObjects);

      if (!playerX || !playerY) {
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
        this.autoSave();
        this.currentMapId = obj.target;
        this.transitionToScene('OverworldScene', obj.targetX, obj.targetY);
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
        position: { scene: this.currentMapId, x: this.player.x, y: this.player.y },
      },
      inventory: { slots: [], equipped: {} },
      quests: this.questSystem.getState(),
      world: {
        unlockedAreas: this.worldSystem.getUnlockedAreas(),
        currentTime: this.dayNightSystem.getTime(),
        currentPhase: this.dayNightSystem.getCurrentPhase(),
      },
      story: {
        flags: {},
        choices: [],
        charactersHelped: [],
        itemsCollected: [],
        morality: 0,
        swordHeart: 0,
        affection: {},
      },
    };
    this.saveSystem.save(saveData);
  }

  private transitionToScene(sceneKey: string, x: number, y: number): void {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(sceneKey, { playerX: x, playerY: y } as SceneTransitionData);
    });
  }

  private checkNPCProximity(): void {
    for (const npc of this.npcs) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      npc.setPlayerNearby(distance < 32);
    }
  }

  private eKeyWasDown = false;

  private checkInteractions(): void {
    const eKeyIsDown = this.eKey.isDown;
    const justPressed = eKeyIsDown && !this.eKeyWasDown;
    this.eKeyWasDown = eKeyIsDown;

    if (!justPressed) return;

    for (const npc of this.npcs) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (distance < 32) {
        npc.interact();
        break;
      }
    }
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
    const dialogueChildren = this.children.list.filter(
      (child) => child.name === 'dialogue-ui'
    );
    dialogueChildren.forEach((child) => child.destroy());
    this.physics.resume();
    this.isDialogueOpen = false;
  }

  private startDialogue(data: DialogueData): void {
    if (this.isDialogueOpen) return;
    this.isDialogueOpen = true;
    this.physics.pause();

    this.dialogueSystem = new DialogueSystem();
    this.dialogueSystem.loadDialogue(data);

    this.dialogueSystem.on('start_quest', (e: unknown) => {
      const evt = e as { questId: string };
      this.questSystem.acceptQuest(evt.questId);
    });
    this.dialogueSystem.on('advance_quest', (e: unknown) => {
      const evt = e as { questId: string; stage: string };
      this.questSystem.advanceObjective(evt.questId, evt.stage, 1);
    });
    this.dialogueSystem.on('complete_quest', (e: unknown) => {
      const evt = e as { questId: string };
      // Completing a quest via dialogue effect - mark all objectives complete
      const quest = this.questSystem.getQuestData(evt.questId);
      if (quest) {
        for (const stage of quest.stages) {
          for (const obj of stage.objectives) {
            this.questSystem.advanceObjective(evt.questId, obj.id, obj.requiredCount);
          }
        }
      }
    });
    this.dialogueSystem.on('start_battle', (e: unknown) => {
      const evt = e as { enemyGroupId: string };
      this.startEncounter(evt.enemyGroupId);
    });
    this.dialogueSystem.on('teleport', (e: unknown) => {
      const evt = e as { scene: string; x: number; y: number };
      this.transitionToScene(evt.scene, evt.x, evt.y);
    });

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
    this.dialoguePanel?.destroy();
    this.dialoguePanel = undefined;
    this.dialogueSystem = undefined;
    this.isDialogueOpen = false;
    this.physics.resume();
  }

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

    const halfW = this.cameras.main.width / 2;
    const halfH = this.cameras.main.height / 2;
    const width = this.cameras.main.width;
    const height = 40;

    const bg = this.add.rectangle(0, halfH - height / 2, width, height, 0x000000, 0.8);
    bg.setName('dialogue-ui');
    bg.setScrollFactor(0);

    const nameText = this.add.text(4 - halfW, halfH - height + 2, speaker, {
      fontSize: '6px',
      color: '#ffff00',
      fontFamily: 'monospace',
    });
    nameText.setName('dialogue-ui');
    nameText.setScrollFactor(0);

    const dialogueText = this.add.text(4 - halfW, halfH - height + 12, text, {
      fontSize: '6px',
      color: '#ffffff',
      fontFamily: 'monospace',
      wordWrap: { width: width - 8 },
    });
    dialogueText.setName('dialogue-ui');
    dialogueText.setScrollFactor(0);

    const closeHint = this.add.text(halfW - 4, halfH - 2, '按 E 关闭', {
      fontSize: '5px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    });
    closeHint.setName('dialogue-ui');
    closeHint.setOrigin(1, 1);
    closeHint.setScrollFactor(0);

    this.physics.pause();
  }
}
