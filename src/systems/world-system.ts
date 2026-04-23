import { EventEmitter } from '../utils/event-emitter';
import type { AreaData } from '../types/world';

export class WorldSystem {
  private eventEmitter = new EventEmitter();
  private areaData = new Map<string, AreaData>();
  private unlockedAreas = new Set<string>();

  constructor(areas: AreaData[] = []) {
    for (const area of areas) {
      this.areaData.set(area.id, area);
    }
  }

  on(event: string, callback: (data: unknown) => void): void {
    this.eventEmitter.on(event, callback);
  }

  off(event: string, callback: (data: unknown) => void): void {
    this.eventEmitter.off(event, callback);
  }

  private emit(event: string, data?: unknown): void {
    this.eventEmitter.emit(event, data);
  }

  getAreaData(areaId: string): AreaData | undefined {
    return this.areaData.get(areaId);
  }

  getAllAreas(): AreaData[] {
    return Array.from(this.areaData.values());
  }

  isAreaUnlocked(areaId: string): boolean {
    return this.unlockedAreas.has(areaId);
  }

  unlockArea(areaId: string): boolean {
    if (this.unlockedAreas.has(areaId)) return false;
    const area = this.areaData.get(areaId);
    if (!area) return false;

    this.unlockedAreas.add(areaId);
    this.emit('area_unlocked', { areaId, areaName: area.name });
    return true;
  }

  checkUnlockConditions(
    flags: Record<string, boolean | number | string>,
    completedQuests: string[]
  ): string[] {
    const newlyUnlocked: string[] = [];

    for (const [areaId, area] of this.areaData) {
      if (this.unlockedAreas.has(areaId)) continue;

      const condition = area.unlockCondition;
      let shouldUnlock = false;

      switch (condition.type) {
        case 'flag':
          shouldUnlock = flags[condition.value] === true;
          break;
        case 'quest':
          shouldUnlock = completedQuests.includes(condition.value);
          break;
        case 'story_progress':
          shouldUnlock = flags[condition.value] === true;
          break;
      }

      if (shouldUnlock) {
        this.unlockArea(areaId);
        newlyUnlocked.push(areaId);
      }
    }

    return newlyUnlocked;
  }

  getUnlockedAreas(): string[] {
    return Array.from(this.unlockedAreas);
  }

  getFogRegions(): { areaId: string; region: AreaData['fogRegion']; isUnlocked: boolean }[] {
    return this.getAllAreas().map((area) => ({
      areaId: area.id,
      region: area.fogRegion,
      isUnlocked: this.unlockedAreas.has(area.id),
    }));
  }

  loadState(unlockedAreas: string[]): void {
    this.unlockedAreas.clear();
    for (const id of unlockedAreas) {
      this.unlockedAreas.add(id);
    }
  }

  getState(): string[] {
    return this.getUnlockedAreas();
  }
}
