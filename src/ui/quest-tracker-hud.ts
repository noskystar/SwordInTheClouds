import { Scene } from 'phaser';
import { QuestSystem } from '../systems/quest-system';
import { GAME_WIDTH } from '../config';
import { uiTextStyle } from './text-style';
import {
  getQuestDisplayInfo,
  getNextTrackedQuestId,
} from './quest-tracker-hud-logic';
export type { QuestDisplayInfo } from './quest-tracker-hud-logic';

export class QuestTrackerHUD {
  private scene: Scene;
  private questSystem: QuestSystem;
  private trackedQuestId: string | null = null;
  private container!: Phaser.GameObjects.Container;
  private bg!: Phaser.GameObjects.Rectangle;
  private nameText!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private lastSwitchTime = 0;
  private lastInfoJson = '';
  private lastTargetInMap = true;

  constructor(scene: Scene, questSystem: QuestSystem) {
    this.scene = scene;
    this.questSystem = questSystem;
    this.createElements();
  }

  private createElements(): void {
    this.container = this.scene.add.container(GAME_WIDTH - 8, 8);
    this.container.setScrollFactor(0);
    this.container.setDepth(90);

    this.bg = this.scene.add.rectangle(0, 0, 180, 48, 0x000000, 0.75);
    this.bg.setOrigin(1, 0);
    this.bg.setStrokeStyle(1, 0x4a90d9);
    this.container.add(this.bg);

    this.nameText = this.scene.add.text(-172, 4, '', uiTextStyle({
      fontSize: '10px',
      color: '#4a90d9',
    }));
    this.container.add(this.nameText);

    this.descText = this.scene.add.text(-172, 18, '', uiTextStyle({
      fontSize: '8px',
      color: '#cccccc',
    }));
    this.container.add(this.descText);

    this.statusText = this.scene.add.text(-172, 32, '', uiTextStyle({
      fontSize: '7px',
      color: '#888888',
    }));
    this.container.add(this.statusText);
  }

  update(targetInCurrentMap: boolean = true): void {
    const info = getQuestDisplayInfo(this.questSystem, this.trackedQuestId, targetInCurrentMap);
    const infoJson = JSON.stringify(info);
    if (infoJson === this.lastInfoJson && targetInCurrentMap === this.lastTargetInMap) {
      return;
    }
    this.lastInfoJson = infoJson;
    this.lastTargetInMap = targetInCurrentMap;

    if (!info) {
      this.nameText.setText('暂无追踪任务');
      this.descText.setText('');
      this.statusText.setText('');
      this.bg.setStrokeStyle(1, 0x666666);
      return;
    }

    this.nameText.setText(info.name);
    this.descText.setText(info.description);
    this.statusText.setText(info.statusText);
    this.bg.setStrokeStyle(1, 0x4a90d9);
  }

  cycleTrackedQuest(): void {
    const now = Date.now();
    if (now - this.lastSwitchTime < 200) return;
    this.lastSwitchTime = now;

    this.trackedQuestId = getNextTrackedQuestId(
      this.questSystem.getActiveQuests(),
      this.questSystem,
      this.trackedQuestId
    );

    // Flash border to indicate switch
    this.bg.setStrokeStyle(2, 0xffffff);
    this.scene.time.delayedCall(150, () => {
      this.bg.setStrokeStyle(1, 0x4a90d9);
    });
  }

  getTrackedQuestId(): string | null {
    return this.trackedQuestId;
  }

  setTrackedQuestId(id: string | null): void {
    this.trackedQuestId = id;
  }

  destroy(): void {
    this.container.destroy();
  }
}
