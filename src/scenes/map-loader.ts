import { Scene } from 'phaser';

export interface MapObject {
  id: string;
  type: 'teleport' | 'interactable' | 'encounter' | 'story_trigger';
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
  bg?: string; // background image key, e.g. 'bg_gate'
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
  stone: 0x8b7355,
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
    const groundSprites: Phaser.GameObjects.Image[] = [];

    if (!mapData.bg) {
      const canvas = document.createElement('canvas');
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext('2d')!;

      const r = (groundColor >> 16) & 0xff;
      const g = (groundColor >> 8) & 0xff;
      const b = groundColor & 0xff;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, tw, th);

      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, 0, Math.floor(tw / 2), Math.floor(th / 2));
      ctx.fillRect(Math.floor(tw / 2), Math.floor(th / 2), Math.ceil(tw / 2), Math.ceil(th / 2));

      this.scene.textures.addCanvas(groundKey, canvas);
    }

    // Background image (pixel art replaces solid color tiles)
    if (mapData.bg && this.scene.textures.exists(mapData.bg)) {
      const cam = this.scene.cameras.main;
      const bgImg = this.scene.add.image(cam.centerX, cam.centerY, mapData.bg);
      bgImg.setOrigin(0.5);
      bgImg.setDisplaySize(cam.width, cam.height);
      bgImg.setScrollFactor(0);
      bgImg.setDepth(-1);
      bgImg.setName('map-bg');
      groundSprites.push(bgImg);
    }

    // Tiled ground sprites (only if no background image)
    if (!mapData.bg) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const img = this.scene.add.image(x * tw + tw / 2, y * th + th / 2, groundKey);
          img.setDepth(0);
          img.setName('ground-tile');
          groundSprites.push(img);
        }
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

  createVisualObjects(objects: MapObject[]): Phaser.GameObjects.GameObject[] {
    const visuals: Phaser.GameObjects.GameObject[] = [];
    for (const obj of objects) {
      if (obj.type === 'teleport') {
        const cx = obj.x + obj.w / 2;
        const cy = obj.y + obj.h / 2;

        // Base ellipse
        const ellipse = this.scene.add.ellipse(cx, cy, 20, 12, 0x4a90d9, 0.4);
        ellipse.setDepth(0.5);
        ellipse.setName('teleport-visual');
        visuals.push(ellipse);

        // Diamond
        const diamond = this.scene.add.rectangle(cx, cy - 4, 8, 8, 0x88ccff, 0.8);
        diamond.setAngle(45);
        diamond.setDepth(0.6);
        diamond.setName('teleport-visual');
        visuals.push(diamond);

        // Breathing tween
        this.scene.tweens.add({
          targets: diamond,
          y: cy - 6,
          duration: 750,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        // Decorative marker if texture exists
        if (this.scene.textures.exists('teleport_marker')) {
          const marker = this.scene.add.image(cx, cy, 'teleport_marker');
          marker.setDisplaySize(obj.w, obj.h);
          marker.setAlpha(0.3);
          marker.setDepth(0.4);
          marker.setName('teleport-visual');
          visuals.push(marker);
        }
      } else if (obj.type === 'interactable') {
        // NPC interaction zones - use subtle indicator sprite if available
        const rect = this.scene.add.rectangle(
          obj.x + obj.w / 2,
          obj.y + obj.h / 2,
          obj.w,
          obj.h,
          0x00aaff,
          0.15
        );
        rect.setDepth(0.5);
        rect.setName('map-object');
        visuals.push(rect);
      } else {
        let color = 0xffff00;
        if (obj.type === 'encounter') color = 0xff0000;

        const rect = this.scene.add.rectangle(obj.x + obj.w / 2, obj.y + obj.h / 2, obj.w, obj.h, color, 0.3);
        rect.setDepth(0.5);
        rect.setName('map-object');
        visuals.push(rect);
      }
    }
    return visuals;
  }
}
