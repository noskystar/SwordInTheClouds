import { Scene } from 'phaser';
import { QuestSystem } from '../systems/quest-system';
import { GAME_WIDTH } from '../config';
import { uiTextStyle } from './text-style';
import type { ActiveQuest } from '../types/quest';

export interface QuestDisplayInfo {
  name: string;
  description: string;
  statusText: string;
}

export function getQuestDisplayInfo(
  questSystem: QuestSystem,
  trackedQuestId: string | null,
  targetInCurrentMap?: boolean
): QuestDisplayInfo | null {
  if (trackedQuestId === null) {
    return null;
  }

  const questData = questSystem.getQuestData(trackedQuestId);
  if (!questData) {
    return null;
  }

  const activeQuests = questSystem.getActiveQuests();
  const activeQuest = activeQuests.find((q) => q.questId === trackedQuestId);

  let description = '';
  if (activeQuest) {
    const stage = questData.stages[activeQuest.currentStageIndex];
    description = stage?.description ?? '';
  }

  const statusText = targetInCurrentMap === false ? '目标在其它区域' : '';

  return {
    name: questData.name,
    description,
    statusText,
  };
}

export function getNextTrackedQuestId(
  activeQuests: ActiveQuest[],
  questSystem: QuestSystem,
  currentTrackedId?: string | null
): string | null {
  if (activeQuests.length === 0) {
    return null;
  }

  const sorted = [...activeQuests].sort((a, b) => {
    const questA = questSystem.getQuestData(a.questId);
    const questB = questSystem.getQuestData(b.questId);
    const isMainA = questA?.type === 'main' ? 1 : 0;
    const isMainB = questB?.type === 'main' ? 1 : 0;
    return isMainB - isMainA;
  });

  if (currentTrackedId === null || currentTrackedId === undefined) {
    return sorted[0].questId;
  }

  const currentIndex = sorted.findIndex((q) => q.questId === currentTrackedId);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % sorted.length : 0;
  return sorted[nextIndex].questId;
}

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
