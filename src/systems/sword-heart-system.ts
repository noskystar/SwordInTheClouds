import { EventEmitter } from '../utils/event-emitter';
import type { SwordHeartMilestone, SwordHeartEvent } from '../types/sword-heart';

export const SWORD_HEART_BASE_EXP = 100;
export const SWORD_HEART_EXP_MULTIPLIER = 1.4;
export const SWORD_HEART_MAX_LEVEL = 10;

export const DEFAULT_MILESTONES: SwordHeartMilestone[] = [
  {
    level: 1,
    expRequired: 0,
    name: '剑心初萌',
    description: '剑道之心刚刚萌芽，对剑诀有初步领悟',
    passiveEffect: '剑诀伤害+5%',
  },
  {
    level: 3,
    expRequired: 0,
    name: '剑意通明',
    description: '剑意初成，剑招更加凌厉',
    statBonus: { attack: 5 },
    passiveEffect: '暴击率+3%',
  },
  {
    level: 5,
    expRequired: 0,
    name: '剑气化形',
    description: '剑气可离体而出，隔空伤敌',
    unlockedSkill: 'remote_sword_qi',
    statBonus: { attack: 10, critRate: 0.05 },
    passiveEffect: '剑意积累速度+20%',
  },
  {
    level: 7,
    expRequired: 0,
    name: '人剑合一',
    description: '人与剑融为一体，攻防一体',
    statBonus: { attack: 15, critDamage: 0.2 },
    passiveEffect: '受到攻击时20%概率反弹30%伤害',
  },
  {
    level: 10,
    expRequired: 0,
    name: '剑心通明',
    description: '剑心圆满，万剑臣服',
    unlockedSkill: 'sword_domain',
    statBonus: { attack: 25, critRate: 0.1, critDamage: 0.3 },
    passiveEffect: '剑诀伤害+30%，剑意上限+50',
  },
];

export class SwordHeartSystem {
  private eventEmitter = new EventEmitter();
  private level = 1;
  private exp = 0;
  private alignment: 'righteous' | 'neutral' | 'demonic' = 'neutral';
  private milestones: SwordHeartMilestone[];

  constructor(milestones: SwordHeartMilestone[] = DEFAULT_MILESTONES) {
    this.milestones = milestones.map((m) => ({
      ...m,
      expRequired: this.calculateExpForLevel(m.level),
    }));
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
    if (level <= 1) return 0;
    return Math.floor(SWORD_HEART_BASE_EXP * Math.pow(SWORD_HEART_EXP_MULTIPLIER, level - 2));
  }

  getExpToNextLevel(): number {
    if (this.level >= SWORD_HEART_MAX_LEVEL) return 0;
    return this.calculateExpForLevel(this.level + 1);
  }

  getLevel(): number {
    return this.level;
  }

  getExp(): number {
    return this.exp;
  }

  getAlignment(): 'righteous' | 'neutral' | 'demonic' {
    return this.alignment;
  }

  getProgress(): number {
    if (this.level >= SWORD_HEART_MAX_LEVEL) return 1;
    const currentLevelExp = this.calculateExpForLevel(this.level);
    const nextLevelExp = this.calculateExpForLevel(this.level + 1);
    return (this.exp - currentLevelExp) / (nextLevelExp - currentLevelExp);
  }

  gainExp(amount: number, sourceAlignment?: 'righteous' | 'neutral' | 'demonic'): void {
    if (this.level >= SWORD_HEART_MAX_LEVEL) return;

    // Alignment drift
    if (sourceAlignment) {
      this.updateAlignment(sourceAlignment);
    }

    this.exp += amount;
    this.emit('sword_heart_exp_gained', { amount, currentExp: this.exp, level: this.level });

    while (this.level < SWORD_HEART_MAX_LEVEL && this.exp >= this.getExpToNextLevel() + this.calculateExpForLevel(this.level)) {
      this.levelUp();
    }
  }

  private levelUp(): void {
    if (this.level >= SWORD_HEART_MAX_LEVEL) return;

    this.level += 1;
    const milestone = this.getMilestoneForLevel(this.level);

    this.emit('sword_heart_level_up', {
      newLevel: this.level,
      milestone,
    });
  }

  private updateAlignment(newAlignment: 'righteous' | 'neutral' | 'demonic'): void {
    if (this.alignment === newAlignment) return;

    const driftMap: Record<string, Record<string, string>> = {
      righteous: { neutral: 'righteous', demonic: 'neutral' },
      neutral: { righteous: 'righteous', demonic: 'demonic' },
      demonic: { neutral: 'demonic', righteous: 'neutral' },
    };

    const newState = driftMap[this.alignment]?.[newAlignment];
    if (newState && newState !== this.alignment) {
      this.alignment = newState as 'righteous' | 'neutral' | 'demonic';
      this.emit('alignment_changed', { alignment: this.alignment });
    }
  }

  getMilestoneForLevel(level: number): SwordHeartMilestone | undefined {
    return this.milestones
      .filter((m) => m.level <= level)
      .sort((a, b) => b.level - a.level)[0];
  }

  getCurrentMilestone(): SwordHeartMilestone | undefined {
    return this.getMilestoneForLevel(this.level);
  }

  getUnlockedSkills(): string[] {
    const skills: string[] = [];
    for (const milestone of this.milestones) {
      if (milestone.level <= this.level && milestone.unlockedSkill) {
        skills.push(milestone.unlockedSkill);
      }
    }
    return skills;
  }

  getStatBonuses(): { attack?: number; critRate?: number; critDamage?: number } {
    const bonuses: { attack?: number; critRate?: number; critDamage?: number } = {};
    for (const milestone of this.milestones) {
      if (milestone.level <= this.level && milestone.statBonus) {
        bonuses.attack = (bonuses.attack ?? 0) + (milestone.statBonus.attack ?? 0);
        bonuses.critRate = (bonuses.critRate ?? 0) + (milestone.statBonus.critRate ?? 0);
        bonuses.critDamage = (bonuses.critDamage ?? 0) + (milestone.statBonus.critDamage ?? 0);
      }
    }
    return bonuses;
  }

  processEvent(event: SwordHeartEvent): void {
    this.gainExp(event.expGain, event.alignment);
    this.emit('sword_heart_event', { event });
  }
}
