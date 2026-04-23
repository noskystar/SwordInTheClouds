export type RealmName = 'lienqi' | 'zhuji' | 'jindan' | 'yuanying' | 'huashen';

export interface RealmStage {
  realm: RealmName;
  stage: number; // 1 = early, 2 = mid, 3 = late
  name: string;
  displayName: string;
}

export interface RealmData {
  id: RealmName;
  name: string;
  displayName: string;
  stages: number;
  expRequired: number; // exp to breakthrough to next realm
  statBonus: {
    maxHp: number;
    maxMp: number;
    attack: number;
    defense: number;
    speed: number;
  };
}

export interface RealmBreakthroughResult {
  success: boolean;
  oldRealm?: RealmStage;
  newRealm?: RealmStage;
  statBonuses?: RealmData['statBonus'];
  reason?: string;
  previousRealm?: RealmStage;
  previousStage?: number;
  expRequired?: number;
}
