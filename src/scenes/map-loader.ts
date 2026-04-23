import { Scene } from 'phaser';

export interface MapObject {
  id: string;
  type: 'teleport' | 'interactable' | 'encounter';
  x: number;
  y: number;
  w: number;
  h: number;
  target?: string;
  targetX?: number;
  targetY?: number;
  action?: string;
  dialogueId?: string;
  battleGroupId?: string;
}

export interface MapCollisionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MapData {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  spawnPoint: { x: number; y: number };
  layers: {
    ground: { type: string; fill: string };
    collision: { type: string; rects: MapCollisionRect[] };
    objects: { type: string; items: MapObject[] };
  };
}

export interface LoadedMap {
  width: number;
  height: number;
  spawnPoint: { x: number; y: number };
  obstacles: Phaser.Physics.Arcade.StaticGroup;
  objects: MapObject[];
  groundSprites: Phaser.GameObjects.Image[];
}

const GROUND_COLORS: Record<string, number> = {
  stone: 0x888888,
  marble: 0xdddddd,
  wood: 0x8b5a2b,
  tatami: 0xc4a35a,
  forest: 0x2d5a2d,
};

export class MapLoader {
  constructor(private scene: Scene) {}

  loadMap(mapData: MapData): LoadedMap {
    const tw = mapData.tileWidth;
    const th = mapData.tileHeight;
    const cols = mapData.width;
    const rows = mapData.height;
    const mapWidth = cols * tw;
    const mapHeight = rows * th;

    const groundColor = GROUND_COLORS[mapData.layers.ground.fill] ?? 0x444444;

    const groundKey = `ground_${mapData.layers.ground.fill}`;
    if (!this.scene.textures.exists(groundKey)) {
      const gfx = this.scene.make.graphics({ x: 0, y: 0 });
      gfx.fillStyle(groundColor, 1);
      gfx.fillRect(0, 0, tw, th);
      gfx.fillStyle(0xffffff, 0.05);
      gfx.fillRect(0, 0, tw / 2, th / 2);
      gfx.fillRect(tw / 2, th / 2, tw / 2, th / 2);
      gfx.generateTexture(groundKey, tw, th);
    }

    const groundSprites: Phaser.GameObjects.Image[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const img = this.scene.add.image(x * tw + tw / 2, y * th + th / 2, groundKey);
        img.setDepth(0);
        img.setName('ground-tile');
        groundSprites.push(img);
      }
    }

    const obstacles = this.scene.physics.add.staticGroup();
    for (const rect of mapData.layers.collision.rects) {
      const obstacle = obstacles.create(
        rect.x * tw + (rect.w * tw) / 2,
        rect.y * th + (rect.h * th) / 2,
        '__DEFAULT'
      ) as Phaser.Physics.Arcade.Sprite;
      obstacle.setDisplaySize(rect.w * tw, rect.h * th);
      obstacle.setVisible(false);
      obstacle.setDepth(1);
    }

    this.scene.physics.world.setBounds(0, 0, mapWidth, mapHeight);

    return {
      width: mapWidth,
      height: mapHeight,
      spawnPoint: { ...mapData.spawnPoint },
      obstacles,
      objects: [...mapData.layers.objects.items],
      groundSprites,
    };
  }

  createVisualObjects(objects: MapObject[]): Phaser.GameObjects.Rectangle[] {
    const visuals: Phaser.GameObjects.Rectangle[] = [];
    for (const obj of objects) {
      let color = 0xffff00;
      if (obj.type === 'teleport') color = 0x00ff00;
      if (obj.type === 'encounter') color = 0xff0000;
      if (obj.type === 'interactable') color = 0x00aaff;

      const rect = this.scene.add.rectangle(obj.x + obj.w / 2, obj.y + obj.h / 2, obj.w, obj.h, color, 0.3);
      rect.setDepth(0.5);

      this.scene.add.text(obj.x + obj.w / 2, obj.y - 4, obj.id, {
        fontSize: '5px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(1);

      visuals.push(rect);
    }
    return visuals;
  }
}
