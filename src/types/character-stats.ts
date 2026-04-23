import type { FiveElement } from './battle';

export interface CharacterStats {
  level: number;
  exp: number;
  expToNextLevel: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  critRate: number;
  critDamage: number;
  element: FiveElement;
}

export interface StatGrowth {
  hpPerLevel: number;
  mpPerLevel: number;
  attackPerLevel: number;
  defensePerLevel: number;
  speedPerLevel: number;
}

export interface LevelUpResult {
  newLevel: number;
  hpGained: number;
  mpGained: number;
  attackGained: number;
  defenseGained: number;
  speedGained: number;
}

export interface CharacterStatsSnapshot {
  base: CharacterStats;
  modifiers: StatModifier[];
}

export interface StatModifier {
  source: string;
  stat: keyof CharacterStats;
  value: number;
  type: 'add' | 'multiply';
}
