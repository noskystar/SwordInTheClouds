import { Scene } from 'phaser';

export interface NPCConfig {
  id: string;
  name: string;
  x: number;
  y: number;
  texture: string;
  dialogues?: string[];
  dialogueId?: string;
  color?: number;
}

export class NPC extends Phaser.GameObjects.Sprite {
  private config: NPCConfig;
  private isPlayerNearby = false;
  private interactionCallback?: (npc: NPC) => void;

  constructor(scene: Scene, config: NPCConfig) {
    super(scene, config.x, config.y, config.texture);
    this.config = config;

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(12, 12);
    body.setOffset(2, 8);

    this.setupAnimations();
    this.createInteractPrompt();
  }

  private setupAnimations(): void {
    const anims = this.scene.anims;
    const animKey = `npc-${this.config.id}-idle`;

    if (!anims.exists(animKey)) {
      anims.create({
        key: animKey,
        frames: [{ key: this.config.texture, frame: 0 }],
        frameRate: 1,
        repeat: -1,
      });
    }

    this.play(animKey);
  }

  private createInteractPrompt(): void {
    const prompt = this.scene.add.text(this.x, this.y - 18, 'E', {
      fontSize: '6px',
      color: '#ffff00',
      fontFamily: 'monospace',
      backgroundColor: '#00000088',
      padding: { x: 2, y: 1 },
    });
    prompt.setOrigin(0.5);
    prompt.setVisible(false);
    prompt.setName(`interact-prompt-${this.config.id}`);
  }

  setPlayerNearby(nearby: boolean): void {
    if (this.isPlayerNearby === nearby) return;
    this.isPlayerNearby = nearby;

    const prompt = this.scene.children.getByName(`interact-prompt-${this.config.id}`) as Phaser.GameObjects.Text;
    if (prompt) {
      prompt.setVisible(nearby);
    }
  }

  interact(): void {
    if (this.isPlayerNearby && this.interactionCallback) {
      this.interactionCallback(this);
    }
  }

  onInteract(callback: (npc: NPC) => void): void {
    this.interactionCallback = callback;
  }

  getNPCId(): string {
    return this.config.id;
  }

  getNPCName(): string {
    return this.config.name;
  }

  destroy(fromScene?: boolean): void {
    const prompt = this.scene?.children.getByName(`interact-prompt-${this.config.id}`) as Phaser.GameObjects.Text;
    if (prompt) {
      prompt.destroy();
    }
    super.destroy(fromScene);
  }
}
