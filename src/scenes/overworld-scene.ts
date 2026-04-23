import { Scene } from 'phaser';
import { Player } from '../entities/player';
import { NPC, type NPCConfig } from '../entities/npc';
import { DialogueSystem } from '../systems/dialogue-system';
import { DialoguePanel } from '../ui/dialogue-panel';
import demoDialogueData from '../data/dialogues/demo-dialogue.json';
import type { DialogueData } from '../types/dialogue';
import type { PlayerBattleStats } from '../systems/battle-system';

interface SceneTransitionData {
  playerX?: number;
  playerY?: number;
}

interface TeleportZone {
  x: number;
  y: number;
  width: number;
  height: number;
  targetScene: string;
  targetX: number;
  targetY: number;
}

export class OverworldScene extends Scene {
  private player!: Player;
  private npcs: NPC[] = [];
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private teleportZones: TeleportZone[] = [];
  private worldWidth = 640;
  private worldHeight = 360;
  private eKey!: Phaser.Input.Keyboard.Key;
  private bKey!: Phaser.Input.Keyboard.Key;
  private isDialogueOpen = false;
  private dialogueSystem?: DialogueSystem;
  private dialoguePanel?: DialoguePanel;

  constructor() {
    super({ key: 'OverworldScene' });
  }

  preload(): void {
    this.generateTextures();
  }

  create(data: SceneTransitionData): void {
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.createMap();
    this.createObstacles();
    this.createTeleportZones();
    this.createPlayer(data.playerX, data.playerY);
    this.createNPCs();
    this.setupCamera();
    this.setupCollisions();
    this.setupHUD();

    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.bKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.B);
  }

  update(): void {
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
    this.checkTeleportZones();
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

  private createTeleportZones(): void {
    this.teleportZones = [
      {
        x: this.worldWidth - 32,
        y: this.worldHeight / 2 - 32,
        width: 32,
        height: 64,
        targetScene: 'TitleScene',
        targetX: 160,
        targetY: 90,
      },
    ];

    // Visual indicator for teleport zone
    const zone = this.teleportZones[0];
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffff00, 0.3);
    gfx.fillRect(zone.x, zone.y, zone.width, zone.height);
    gfx.lineStyle(1, 0xffff00, 0.8);
    gfx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    gfx.setDepth(0);

    // Add label
    this.add.text(zone.x + zone.width / 2, zone.y - 8, '→ 出口', {
      fontSize: '6px',
      color: '#ffff00',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private createPlayer(startX?: number, startY?: number): void {
    const x = startX ?? this.worldWidth / 2;
    const y = startY ?? this.worldHeight / 2;

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
        if (config.dialogueId) {
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

    // Player overlaps with NPCs for proximity detection
    for (const npc of this.npcs) {
      this.physics.add.overlap(
        this.player,
        npc,
        () => {
          npc.setPlayerNearby(true);
        },
        undefined,
        this
      );
    }
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

  private checkTeleportZones(): void {
    const px = this.player.x;
    const py = this.player.y;

    for (const zone of this.teleportZones) {
      if (
        px >= zone.x &&
        px <= zone.x + zone.width &&
        py >= zone.y &&
        py <= zone.y + zone.height
      ) {
        this.transitionToScene(zone.targetScene, zone.targetX, zone.targetY);
        break;
      }
    }
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
        battleGroupId: 'demo_mixed',
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
