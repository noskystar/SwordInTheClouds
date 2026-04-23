import { Scene } from 'phaser';

export type Direction = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

export class Player extends Phaser.GameObjects.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private speed = 80;
  private currentDirection: Direction = 'down';
  private isMoving = false;

  constructor(scene: Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 10);
    body.setOffset(3, 10);
    body.setCollideWorldBounds(true);

    this.setupInput();
    this.setupAnimations();
  }

  private setupInput(): void {
    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    this.wasdKeys = this.scene.input.keyboard!.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    }) as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
    };
  }

  private setupAnimations(): void {
    const anims = this.scene.anims;

    if (!anims.exists('player-idle')) {
      anims.create({
        key: 'player-idle',
        frames: [{ key: 'player', frame: 0 }],
        frameRate: 1,
        repeat: -1,
      });
    }

    if (!anims.exists('player-walk')) {
      anims.create({
        key: 'player-walk',
        frames: [
          { key: 'player', frame: 0 },
          { key: 'player', frame: 1 },
        ],
        frameRate: 8,
        repeat: -1,
      });
    }

    this.play('player-idle');
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.handleMovement();
  }

  private handleMovement(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);

    const up = this.cursors.up?.isDown || this.wasdKeys.W.isDown;
    const down = this.cursors.down?.isDown || this.wasdKeys.S.isDown;
    const left = this.cursors.left?.isDown || this.wasdKeys.A.isDown;
    const right = this.cursors.right?.isDown || this.wasdKeys.D.isDown;

    let vx = 0;
    let vy = 0;

    if (up) vy -= 1;
    if (down) vy += 1;
    if (left) vx -= 1;
    if (right) vx += 1;

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len;
      vy /= len;
    }

    body.setVelocity(vx * this.speed, vy * this.speed);

    // Determine direction
    if (vx !== 0 || vy !== 0) {
      this.isMoving = true;

      if (vy < 0 && vx < 0) this.currentDirection = 'up-left';
      else if (vy < 0 && vx > 0) this.currentDirection = 'up-right';
      else if (vy > 0 && vx < 0) this.currentDirection = 'down-left';
      else if (vy > 0 && vx > 0) this.currentDirection = 'down-right';
      else if (vy < 0) this.currentDirection = 'up';
      else if (vy > 0) this.currentDirection = 'down';
      else if (vx < 0) this.currentDirection = 'left';
      else if (vx > 0) this.currentDirection = 'right';

      // Flip sprite for left directions
      this.setFlipX(vx < 0);

      if (this.anims.currentAnim?.key !== 'player-walk') {
        this.play('player-walk', true);
      }
    } else {
      this.isMoving = false;
      if (this.anims.currentAnim?.key !== 'player-idle') {
        this.play('player-idle', true);
      }
    }
  }

  getDirection(): Direction {
    return this.currentDirection;
  }

  isPlayerMoving(): boolean {
    return this.isMoving;
  }

  setPlayerPosition(x: number, y: number): void {
    this.setPosition(x, y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
  }
}
