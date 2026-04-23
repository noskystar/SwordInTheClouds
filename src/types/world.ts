export interface AreaData {
  id: string;
  name: string;
  description: string;
  unlockCondition: {
    type: 'flag' | 'quest' | 'story_progress';
    value: string;
  };
  fogRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  mapFile: string;
}

export interface WorldMapData {
  areas: AreaData[];
}
