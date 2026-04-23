import type { FiveElement } from './battle';

export interface CultivationArt {
  id: string;
  name: string;
  description: string;
  element: FiveElement;
  levelRequirement: number;
  realmRequirement?: string;
  statGrowth: {
    hpPerLevel: number;
    mpPerLevel: number;
    attackPerLevel: number;
    defensePerLevel: number;
    speedPerLevel: number;
  };
  bonusStats: {
    attack?: number;
    defense?: number;
    speed?: number;
    maxHp?: number;
    maxMp?: number;
    critRate?: number;
    critDamage?: number;
  };
  skills: string[];
  passiveEffects: string[];
}

export interface CultivationArtEffect {
  type: 'stat_bonus' | 'skill_unlock' | 'passive';
  description: string;
  value?: number;
}
