export interface PlayerSaveData {
  name: string;
  level: number;
  exp: number;
  stats: {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    attack: number;
    defense: number;
    speed: number;
    critRate: number;
    critDamage: number;
    element: string;
  };
  position: {
    scene: string;
    x: number;
    y: number;
  };
}

export interface InventorySaveData {
  slots: { itemId: string | null; quantity: number }[];
  equipped: Record<string, string | null>;
}

export interface QuestSaveData {
  active: {
    questId: string;
    currentStageIndex: number;
    objectiveProgress: Record<string, number>;
    acceptedAt: number;
  }[];
  completed: string[];
}

export interface WorldSaveData {
  unlockedAreas: string[];
  currentTime: number;
  currentPhase: string;
}

export interface StorySaveData {
  flags: Record<string, boolean | number | string>;
  choices: string[];
  charactersHelped: string[];
  itemsCollected: string[];
  morality: number;
  swordHeart: number;
  affection: Record<string, number>;
}

export interface GameSaveData {
  version: string;
  timestamp: number;
  player: PlayerSaveData;
  inventory: InventorySaveData;
  quests: QuestSaveData;
  world: WorldSaveData;
  story: StorySaveData;
}
