export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  avatar?: string;
  emotion?: 'neutral' | 'happy' | 'angry' | 'sad' | 'surprised';
  options: DialogueOption[];
  autoAdvance?: boolean;
  autoAdvanceDelay?: number;
}

export interface DialogueOption {
  id: string;
  text: string;
  condition?: DialogueCondition;
  effects: DialogueEffect[];
  nextNodeId?: string;
  timeLimit?: number;
}

export type DialogueCondition =
  | { type: 'stat_check'; stat: string; minValue: number }
  | { type: 'affinity_check'; npcId: string; minValue: number }
  | { type: 'item_check'; itemId: string; quantity?: number }
  | { type: 'flag_check'; flag: string; value: boolean }
  | { type: 'morality_check'; min?: number; max?: number }
  | { type: 'realm_check'; realm: string; stage?: string }
  | { type: 'compound'; operator: 'and' | 'or'; conditions: DialogueCondition[] };

export type DialogueEffect =
  | { type: 'set_flag'; flag: string; value: boolean | number | string }
  | { type: 'change_affinity'; npcId: string; delta: number }
  | { type: 'change_morality'; delta: number }
  | { type: 'change_sword_heart'; delta: number }
  | { type: 'add_item'; itemId: string; quantity: number }
  | { type: 'remove_item'; itemId: string; quantity: number }
  | { type: 'start_battle'; enemyGroupId: string }
  | { type: 'start_quest'; questId: string }
  | { type: 'advance_quest'; questId: string; stage: string }
  | { type: 'complete_quest'; questId: string }
  | { type: 'teleport'; scene: string; x: number; y: number }
  | { type: 'unlock_skill'; skillId: string }
  | { type: 'play_sound'; soundId: string }
  | { type: 'show_animation'; animationId: string }
  | { type: 'delay'; ms: number };

export interface DialogueData {
  id: string;
  title: string;
  startNodeId: string;
  nodes: Record<string, DialogueNode>;
}

export interface DialogueState {
  dialogueId: string;
  currentNodeId: string;
  history: DialogueHistoryEntry[];
}

export interface DialogueHistoryEntry {
  nodeId: string;
  speaker: string;
  text: string;
  selectedOptionId?: string;
  timestamp: number;
}
