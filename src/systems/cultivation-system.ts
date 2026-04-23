import { EventEmitter } from '../utils/event-emitter';
import type { CultivationArt } from '../types/cultivation';

export class CultivationSystem {
  private eventEmitter = new EventEmitter();
  private arts = new Map<string, CultivationArt>();
  private unlockedArts = new Set<string>();
  private activeArtId: string | null = null;

  constructor(arts: CultivationArt[] = []) {
    for (const art of arts) {
      this.arts.set(art.id, art);
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

  loadArts(arts: CultivationArt[]): void {
    for (const art of arts) {
      this.arts.set(art.id, art);
    }
  }

  getArt(id: string): CultivationArt | undefined {
    return this.arts.get(id);
  }

  getAllArts(): CultivationArt[] {
    return Array.from(this.arts.values());
  }

  getUnlockedArts(): CultivationArt[] {
    return Array.from(this.unlockedArts)
      .map((id) => this.arts.get(id))
      .filter((a): a is CultivationArt => a !== undefined);
  }

  unlockArt(artId: string): boolean {
    const art = this.arts.get(artId);
    if (!art) return false;
    if (this.unlockedArts.has(artId)) return false;

    this.unlockedArts.add(artId);
    this.emit('art_unlocked', { artId, art });
    return true;
  }

  equipArt(artId: string): boolean {
    const art = this.arts.get(artId);
    if (!art) return false;
    if (!this.unlockedArts.has(artId)) return false;

    const oldArt = this.activeArtId;
    this.activeArtId = artId;
    this.emit('art_equipped', { artId, oldArtId: oldArt, art });
    return true;
  }

  unequipArt(): void {
    if (this.activeArtId) {
      const oldArt = this.activeArtId;
      this.activeArtId = null;
      this.emit('art_unequipped', { oldArtId: oldArt });
    }
  }

  getActiveArt(): CultivationArt | null {
    return this.activeArtId ? this.arts.get(this.activeArtId) ?? null : null;
  }

  getActiveArtId(): string | null {
    return this.activeArtId;
  }

  getGrowthBonus(): {
    hpPerLevel: number;
    mpPerLevel: number;
    attackPerLevel: number;
    defensePerLevel: number;
    speedPerLevel: number;
  } {
    const art = this.getActiveArt();
    if (!art) {
      return { hpPerLevel: 0, mpPerLevel: 0, attackPerLevel: 0, defensePerLevel: 0, speedPerLevel: 0 };
    }
    return { ...art.statGrowth };
  }

  getStatBonus(): Partial<Record<'attack' | 'defense' | 'speed' | 'maxHp' | 'maxMp' | 'critRate' | 'critDamage', number>> {
    const art = this.getActiveArt();
    if (!art) return {};
    return { ...art.bonusStats };
  }

  getActiveSkills(): string[] {
    const art = this.getActiveArt();
    return art ? [...art.skills] : [];
  }

  isArtUnlocked(artId: string): boolean {
    return this.unlockedArts.has(artId);
  }
}
