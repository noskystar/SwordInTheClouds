import { EventEmitter } from '../utils/event-emitter';
import type { CharacterStats, StatGrowth, LevelUpResult, StatModifier } from '../types/character-stats';
import type { PlayerBattleStats } from '../systems/battle-system';

export const BASE_EXP = 50;
export const EXP_MULTIPLIER = 1.5;

export class Character {
  private eventEmitter = new EventEmitter();
  private stats: CharacterStats;
  private growth: StatGrowth;
  private modifiers: StatModifier[] = [];
  private name: string;
  private id: string;
  private color: number;
  private skills: string[] = [];

  constructor(
    id: string,
    name: string,
    color: number,
    baseStats: Omit<CharacterStats, 'level' | 'exp' | 'expToNextLevel'>,
    growth: StatGrowth,
    initialLevel = 1
  ) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.growth = growth;
    this.stats = {
      ...baseStats,
      level: initialLevel,
      exp: 0,
      expToNextLevel: this.calculateExpForLevel(initialLevel),
    };
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

  private calculateExpForLevel(level: number): number {
    return Math.floor(BASE_EXP * Math.pow(EXP_MULTIPLIER, level - 1));
  }

  getStats(): CharacterStats {
    return { ...this.stats };
  }

  getEffectiveStats(): CharacterStats {
    const effective = { ...this.stats };
    const addModifiers: Partial<Record<keyof CharacterStats, number>> = {};
    const mulModifiers: Partial<Record<keyof CharacterStats, number>> = {};

    for (const mod of this.modifiers) {
      if (mod.type === 'add') {
        addModifiers[mod.stat] = (addModifiers[mod.stat] ?? 0) + mod.value;
      } else {
        mulModifiers[mod.stat] = (mulModifiers[mod.stat] ?? 0) + mod.value;
      }
    }

    for (const [stat, value] of Object.entries(addModifiers)) {
      const key = stat as keyof CharacterStats;
      if (key === 'element') continue;
      (effective[key] as number) += value;
    }

    for (const [stat, value] of Object.entries(mulModifiers)) {
      const key = stat as keyof CharacterStats;
      if (key === 'element') continue;
      (effective[key] as number) *= 1 + value;
    }

    effective.maxHp = Math.max(1, Math.floor(effective.maxHp));
    effective.maxMp = Math.max(0, Math.floor(effective.maxMp));
    effective.attack = Math.max(1, Math.floor(effective.attack));
    effective.defense = Math.max(0, Math.floor(effective.defense));
    effective.speed = Math.max(1, Math.floor(effective.speed));
    effective.critRate = Math.max(0, Math.min(1, effective.critRate));
    effective.critDamage = Math.max(1, effective.critDamage);

    effective.hp = Math.min(effective.hp, effective.maxHp);
    effective.mp = Math.min(effective.mp, effective.maxMp);

    return effective;
  }

  addModifier(modifier: StatModifier): void {
    this.modifiers.push(modifier);
    this.emit('stats_changed', { stats: this.getEffectiveStats() });
  }

  removeModifier(source: string): void {
    this.modifiers = this.modifiers.filter((m) => m.source !== source);
    this.emit('stats_changed', { stats: this.getEffectiveStats() });
  }

  getModifiers(): StatModifier[] {
    return [...this.modifiers];
  }

  gainExp(amount: number): LevelUpResult | null {
    this.stats.exp += amount;
    let result: LevelUpResult | null = null;

    while (this.stats.exp >= this.stats.expToNextLevel) {
      this.stats.exp -= this.stats.expToNextLevel;
      result = this.levelUp();
    }

    this.emit('exp_gained', { amount, currentExp: this.stats.exp, expToNext: this.stats.expToNextLevel });
    return result;
  }

  private levelUp(): LevelUpResult {
    const oldMaxHp = this.stats.maxHp;
    const oldMaxMp = this.stats.maxMp;
    const oldAttack = this.stats.attack;
    const oldDefense = this.stats.defense;
    const oldSpeed = this.stats.speed;

    this.stats.level += 1;
    this.stats.maxHp += this.growth.hpPerLevel;
    this.stats.maxMp += this.growth.mpPerLevel;
    this.stats.attack += this.growth.attackPerLevel;
    this.stats.defense += this.growth.defensePerLevel;
    this.stats.speed += this.growth.speedPerLevel;
    this.stats.expToNextLevel = this.calculateExpForLevel(this.stats.level);

    // Heal on level up
    this.stats.hp = this.stats.maxHp;
    this.stats.mp = this.stats.maxMp;

    const result: LevelUpResult = {
      newLevel: this.stats.level,
      hpGained: this.stats.maxHp - oldMaxHp,
      mpGained: this.stats.maxMp - oldMaxMp,
      attackGained: this.stats.attack - oldAttack,
      defenseGained: this.stats.defense - oldDefense,
      speedGained: this.stats.speed - oldSpeed,
    };

    this.emit('level_up', result);
    this.emit('stats_changed', { stats: this.getEffectiveStats() });
    return result;
  }

  healHp(amount: number): number {
    const actualHeal = Math.min(amount, this.stats.maxHp - this.stats.hp);
    this.stats.hp += actualHeal;
    this.emit('hp_changed', { current: this.stats.hp, max: this.stats.maxHp, delta: actualHeal });
    return actualHeal;
  }

  healMp(amount: number): number {
    const actualHeal = Math.min(amount, this.stats.maxMp - this.stats.mp);
    this.stats.mp += actualHeal;
    this.emit('mp_changed', { current: this.stats.mp, max: this.stats.maxMp, delta: actualHeal });
    return actualHeal;
  }

  consumeHp(amount: number): void {
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.emit('hp_changed', { current: this.stats.hp, max: this.stats.maxHp, delta: -amount });
  }

  consumeMp(amount: number): void {
    this.stats.mp = Math.max(0, this.stats.mp - amount);
    this.emit('mp_changed', { current: this.stats.mp, max: this.stats.maxMp, delta: -amount });
  }

  setHp(value: number): void {
    this.stats.hp = Math.max(0, Math.min(this.stats.maxHp, value));
    this.emit('hp_changed', { current: this.stats.hp, max: this.stats.maxHp, delta: 0 });
  }

  setMp(value: number): void {
    this.stats.mp = Math.max(0, Math.min(this.stats.maxMp, value));
    this.emit('mp_changed', { current: this.stats.mp, max: this.stats.maxMp, delta: 0 });
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getColor(): number {
    return this.color;
  }

  getSkills(): string[] {
    return [...this.skills];
  }

  setSkills(skills: string[]): void {
    this.skills = [...skills];
  }

  addSkill(skillId: string): void {
    if (!this.skills.includes(skillId)) {
      this.skills.push(skillId);
      this.emit('skill_unlocked', { skillId });
    }
  }

  toPlayerBattleStats(): PlayerBattleStats {
    const stats = this.getEffectiveStats();
    return {
      id: this.id,
      name: this.name,
      level: stats.level,
      maxHp: stats.maxHp,
      maxMp: stats.maxMp,
      attack: stats.attack,
      defense: stats.defense,
      speed: stats.speed,
      element: stats.element,
      skills: this.getSkills(),
      color: this.color,
    };
  }
}
