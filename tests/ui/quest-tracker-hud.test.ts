import { describe, test, expect } from 'vitest';
import { QuestSystem } from '../../src/systems/quest-system';
import type { QuestData, ActiveQuest } from '../../src/types/quest';
import {
  getQuestDisplayInfo,
  getNextTrackedQuestId,
} from '../../src/ui/quest-tracker-hud-logic';

const mockQuests: QuestData[] = [
  {
    id: 'main_chapter1',
    name: '初入天剑宗',
    description: '入门试炼',
    type: 'main',
    stages: [
      { id: 's1', description: '前往山门拜见长老', objectives: [] },
      { id: 's2', description: '清除后山骚扰灵兽', objectives: [] },
    ],
    rewards: { exp: 200, items: [] },
  },
  {
    id: 'side_brother_secret',
    name: '大师兄的秘密',
    description: '调查大师兄',
    type: 'side',
    stages: [
      { id: 's1', description: '在后山找到大师兄', objectives: [] },
    ],
    rewards: { exp: 150, items: [] },
  },
  {
    id: 'side_missing_cat',
    name: '寻找灵猫',
    description: '找猫',
    type: 'side',
    stages: [
      { id: 's1', description: '在大殿附近找到灵猫', objectives: [] },
    ],
    rewards: { exp: 80, items: [] },
  },
];

function createQuestSystem(activeQuests: ActiveQuest[] = []): QuestSystem {
  const qs = new QuestSystem(mockQuests);
  qs.loadState(activeQuests, []);
  return qs;
}

describe('getQuestDisplayInfo', () => {
  test('returns null when trackedQuestId is null', () => {
    const qs = createQuestSystem([
      { questId: 'main_chapter1', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 1 },
    ]);
    const result = getQuestDisplayInfo(qs, null);
    expect(result).toBeNull();
  });

  test('returns null when quest not found in questSystem', () => {
    const qs = createQuestSystem([
      { questId: 'main_chapter1', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 1 },
    ]);
    const result = getQuestDisplayInfo(qs, 'nonexistent_quest');
    expect(result).toBeNull();
  });

  test('returns correct name and description for tracked quest at stage 0', () => {
    const qs = createQuestSystem([
      { questId: 'main_chapter1', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 1 },
    ]);
    const result = getQuestDisplayInfo(qs, 'main_chapter1');
    expect(result).toEqual({
      name: '初入天剑宗',
      description: '前往山门拜见长老',
      statusText: '',
    });
  });

  test('returns correct description for tracked quest at later stage', () => {
    const qs = createQuestSystem([
      { questId: 'main_chapter1', currentStageIndex: 1, objectiveProgress: {}, acceptedAt: 1 },
    ]);
    const result = getQuestDisplayInfo(qs, 'main_chapter1');
    expect(result).toEqual({
      name: '初入天剑宗',
      description: '清除后山骚扰灵兽',
      statusText: '',
    });
  });

  test('returns empty description when currentStageIndex is out of bounds', () => {
    const qs = createQuestSystem([
      { questId: 'main_chapter1', currentStageIndex: 99, objectiveProgress: {}, acceptedAt: 1 },
    ]);
    const result = getQuestDisplayInfo(qs, 'main_chapter1');
    expect(result).toEqual({
      name: '初入天剑宗',
      description: '',
      statusText: '',
    });
  });

  test('shows status text when target is not in current map', () => {
    const qs = createQuestSystem([
      { questId: 'main_chapter1', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 1 },
    ]);
    const result = getQuestDisplayInfo(qs, 'main_chapter1', false);
    expect(result).toEqual({
      name: '初入天剑宗',
      description: '前往山门拜见长老',
      statusText: '目标在其它区域',
    });
  });

  test('status text is empty when target is in current map', () => {
    const qs = createQuestSystem([
      { questId: 'main_chapter1', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 1 },
    ]);
    const result = getQuestDisplayInfo(qs, 'main_chapter1', true);
    expect(result).toEqual({
      name: '初入天剑宗',
      description: '前往山门拜见长老',
      statusText: '',
    });
  });
});

describe('getNextTrackedQuestId', () => {
  test('returns null when no active quests', () => {
    const qs = createQuestSystem([]);
    const result = getNextTrackedQuestId(qs.getActiveQuests(), qs);
    expect(result).toBeNull();
  });

  test('returns first quest id when currentTrackedId is null', () => {
    const qs = createQuestSystem([
      { questId: 'side_brother_secret', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 1 },
      { questId: 'main_chapter1', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 2 },
    ]);
    const result = getNextTrackedQuestId(qs.getActiveQuests(), qs, null);
    expect(result).toBe('main_chapter1');
  });

  test('prefers main quests over side quests when selecting first', () => {
    const qs = createQuestSystem([
      { questId: 'side_brother_secret', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 1 },
      { questId: 'main_chapter1', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 2 },
    ]);
    const result = getNextTrackedQuestId(qs.getActiveQuests(), qs, null);
    expect(result).toBe('main_chapter1');
  });

  test('cycles to the next quest in sorted order', () => {
    const qs = createQuestSystem([
      { questId: 'main_chapter1', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 1 },
      { questId: 'side_brother_secret', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 2 },
    ]);
    const result = getNextTrackedQuestId(qs.getActiveQuests(), qs, 'main_chapter1');
    expect(result).toBe('side_brother_secret');
  });

  test('wraps around to the first quest when at the end', () => {
    const qs = createQuestSystem([
      { questId: 'main_chapter1', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 1 },
      { questId: 'side_brother_secret', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 2 },
    ]);
    const result = getNextTrackedQuestId(qs.getActiveQuests(), qs, 'side_brother_secret');
    expect(result).toBe('main_chapter1');
  });

  test('cycles through multiple side quests correctly', () => {
    const qs = createQuestSystem([
      { questId: 'side_brother_secret', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 1 },
      { questId: 'side_missing_cat', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 2 },
    ]);
    const first = getNextTrackedQuestId(qs.getActiveQuests(), qs, null);
    expect(first).toBe('side_brother_secret');
    const second = getNextTrackedQuestId(qs.getActiveQuests(), qs, first);
    expect(second).toBe('side_missing_cat');
    const third = getNextTrackedQuestId(qs.getActiveQuests(), qs, second);
    expect(third).toBe('side_brother_secret');
  });

  test('sorts main quests first then side quests by original order', () => {
    const qs = createQuestSystem([
      { questId: 'side_brother_secret', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 1 },
      { questId: 'main_chapter1', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 2 },
      { questId: 'side_missing_cat', currentStageIndex: 0, objectiveProgress: {}, acceptedAt: 3 },
    ]);
    const result = getNextTrackedQuestId(qs.getActiveQuests(), qs, 'main_chapter1');
    expect(result).toBe('side_brother_secret');
    const result2 = getNextTrackedQuestId(qs.getActiveQuests(), qs, 'side_brother_secret');
    expect(result2).toBe('side_missing_cat');
    const result3 = getNextTrackedQuestId(qs.getActiveQuests(), qs, 'side_missing_cat');
    expect(result3).toBe('main_chapter1');
  });
});
