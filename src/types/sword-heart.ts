export interface SwordHeartMilestone {
  level: number;
  expRequired: number;
  name: string;
  description: string;
  unlockedSkill?: string;
  passiveEffect?: string;
  statBonus?: {
    attack?: number;
    critRate?: number;
    critDamage?: number;
  };
}

export interface SwordHeart {
  level: number;
  exp: number;
  expToNextLevel: number;
  alignment: 'righteous' | 'neutral' | 'demonic';
  milestones: SwordHeartMilestone[];
}

export interface SwordHeartEvent {
  type: 'moral_choice' | 'combat_victory' | 'story_event' | 'meditation';
  alignment: 'righteous' | 'neutral' | 'demonic';
  expGain: number;
  description: string;
}
