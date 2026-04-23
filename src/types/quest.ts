export type QuestType = 'main' | 'side' | 'daily';
export type ObjectiveType = 'kill' | 'talk' | 'reach' | 'collect';

export interface QuestObjective {
  id: string;
  type: ObjectiveType;
  description: string;
  targetId: string;
  requiredCount: number;
}

export interface QuestStage {
  id: string;
  description: string;
  objectives: QuestObjective[];
}

export interface QuestReward {
  exp: number;
  items: { itemId: string; quantity: number }[];
  flags?: Record<string, boolean | number | string>;
}

export interface QuestData {
  id: string;
  name: string;
  description: string;
  type: QuestType;
  stages: QuestStage[];
  rewards: QuestReward;
}

export interface ActiveQuest {
  questId: string;
  currentStageIndex: number;
  objectiveProgress: Record<string, number>;
  acceptedAt: number;
}
