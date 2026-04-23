export type AffectionLevel = 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'intimate' | 'soulmate';

export interface CharacterData {
  id: string;
  name: string;
  title: string;
  description: string;
  iconColor: number;
  defaultAffection: number;
}

export interface AffectionEvent {
  id: string;
  characterId: string;
  description: string;
  affectionChange: number;
  minAffectionRequired?: number;
  maxAffectionAllowed?: number;
}

export interface AffectionState {
  characterId: string;
  value: number;
  level: AffectionLevel;
}

export const AFFECTION_THRESHOLDS: Record<AffectionLevel, number> = {
  stranger: 0,
  acquaintance: 20,
  friend: 40,
  close_friend: 60,
  intimate: 80,
  soulmate: 100,
};
