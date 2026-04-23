import { EventEmitter } from '../utils/event-emitter';
import type { RealmName, RealmStage, RealmData, RealmBreakthroughResult } from '../types/realm';

export const REALM_ORDER: RealmName[] = ['lienqi', 'zhuji', 'jindan', 'yuanying', 'huashen'];

export const REALM_DATA: Record<RealmName, RealmData> = {
  lienqi: {
    id: 'lienqi',
    name: '炼气',
    displayName: '炼气期',
    stages: 3,
    expRequired: 100,
    statBonus: { maxHp: 20, maxMp: 10, attack: 5, defense: 3, speed: 2 },
  },
  zhuji: {
    id: 'zhuji',
    name: '筑基',
    displayName: '筑基期',
    stages: 3,
    expRequired: 300,
    statBonus: { maxHp: 50, maxMp: 25, attack: 12, defense: 8, speed: 5 },
  },
  jindan: {
    id: 'jindan',
    name: '金丹',
    displayName: '金丹期',
    stages: 3,
    expRequired: 800,
    statBonus: { maxHp: 100, maxMp: 50, attack: 25, defense: 15, speed: 10 },
  },
  yuanying: {
    id: 'yuanying',
    name: '元婴',
    displayName: '元婴期',
    stages: 3,
    expRequired: 2000,
    statBonus: { maxHp: 200, maxMp: 100, attack: 50, defense: 30, speed: 20 },
  },
  huashen: {
    id: 'huashen',
    name: '化神',
    displayName: '化神期',
    stages: 3,
    expRequired: 5000,
    statBonus: { maxHp: 400, maxMp: 200, attack: 100, defense: 60, speed: 40 },
  },
};

const STAGE_NAMES = ['初期', '中期', '后期'];

export class RealmSystem {
  private eventEmitter = new EventEmitter();
  private currentRealm: RealmStage;
  private cultivationExp = 0;

  constructor(initialRealm: RealmName = 'lienqi', initialStage = 1) {
    this.currentRealm = {
      realm: initialRealm,
      stage: initialStage,
      name: REALM_DATA[initialRealm].name,
      displayName: `${REALM_DATA[initialRealm].displayName}·${STAGE_NAMES[initialStage - 1]}`,
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

  getCurrentRealm(): RealmStage {
    return { ...this.currentRealm };
  }

  getCultivationExp(): number {
    return this.cultivationExp;
  }

  getExpRequired(): number {
    return REALM_DATA[this.currentRealm.realm].expRequired;
  }

  getProgress(): number {
    const required = this.getExpRequired();
    return Math.min(1, this.cultivationExp / required);
  }

  gainCultivationExp(amount: number): void {
    this.cultivationExp += amount;
    this.emit('cultivation_exp_gained', { amount, current: this.cultivationExp, required: this.getExpRequired() });

    while (this.canBreakthrough()) {
      this.attemptBreakthrough();
    }
  }

  canBreakthrough(): boolean {
    return !this.isMaxRealm() && this.cultivationExp >= this.getExpRequired();
  }

  attemptBreakthrough(): RealmBreakthroughResult {
    if (this.isMaxRealm()) {
      return {
        success: false,
        reason: 'max_realm',
        previousRealm: this.currentRealm,
        previousStage: this.currentRealm.stage,
        expRequired: 0,
      };
    }

    const oldRealm = { ...this.currentRealm };
    const data = REALM_DATA[this.currentRealm.realm];

    this.cultivationExp -= data.expRequired;

    if (this.currentRealm.stage < data.stages) {
      // Advance stage within realm
      this.currentRealm.stage += 1;
    } else {
      // Advance to next realm
      const nextIndex = REALM_ORDER.indexOf(this.currentRealm.realm) + 1;
      if (nextIndex < REALM_ORDER.length) {
        this.currentRealm.realm = REALM_ORDER[nextIndex];
        this.currentRealm.stage = 1;
        this.currentRealm.name = REALM_DATA[this.currentRealm.realm].name;
      }
    }

    this.currentRealm.displayName = `${REALM_DATA[this.currentRealm.realm].displayName}·${STAGE_NAMES[this.currentRealm.stage - 1]}`;

    const result: RealmBreakthroughResult = {
      success: true,
      oldRealm,
      newRealm: { ...this.currentRealm },
      statBonuses: data.statBonus,
    };

    this.emit('realm_breakthrough', result);
    return result;
  }

  getStatBonuses(): { maxHp: number; maxMp: number; attack: number; defense: number; speed: number } {
    const totalBonuses = { maxHp: 0, maxMp: 0, attack: 0, defense: 0, speed: 0 };

    for (const realmName of REALM_ORDER) {
      const data = REALM_DATA[realmName];
      const realmIndex = REALM_ORDER.indexOf(realmName);
      const currentIndex = REALM_ORDER.indexOf(this.currentRealm.realm);

      if (realmIndex < currentIndex) {
        // Fully completed realm
        totalBonuses.maxHp += data.statBonus.maxHp * data.stages;
        totalBonuses.maxMp += data.statBonus.maxMp * data.stages;
        totalBonuses.attack += data.statBonus.attack * data.stages;
        totalBonuses.defense += data.statBonus.defense * data.stages;
        totalBonuses.speed += data.statBonus.speed * data.stages;
      } else if (realmIndex === currentIndex) {
        // Current realm - only completed stages
        totalBonuses.maxHp += data.statBonus.maxHp * (this.currentRealm.stage - 1);
        totalBonuses.maxMp += data.statBonus.maxMp * (this.currentRealm.stage - 1);
        totalBonuses.attack += data.statBonus.attack * (this.currentRealm.stage - 1);
        totalBonuses.defense += data.statBonus.defense * (this.currentRealm.stage - 1);
        totalBonuses.speed += data.statBonus.speed * (this.currentRealm.stage - 1);
      }
    }

    return totalBonuses;
  }

  isMaxRealm(): boolean {
    return this.currentRealm.realm === 'huashen' && this.currentRealm.stage === 3;
  }
}
