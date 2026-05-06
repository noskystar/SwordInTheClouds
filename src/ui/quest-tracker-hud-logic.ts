import type { QuestSystem } from '../systems/quest-system';
import type { ActiveQuest } from '../types/quest';

export interface QuestDisplayInfo {
  name: string;
  description: string;
  statusText: string;
}

export function getQuestDisplayInfo(
  questSystem: QuestSystem,
  trackedQuestId: string | null,
  targetInCurrentMap?: boolean
): QuestDisplayInfo | null {
  if (trackedQuestId === null) {
    return null;
  }

  const questData = questSystem.getQuestData(trackedQuestId);
  if (!questData) {
    return null;
  }

  const activeQuests = questSystem.getActiveQuests();
  const activeQuest = activeQuests.find((q) => q.questId === trackedQuestId);

  let description = '';
  if (activeQuest) {
    const stage = questData.stages[activeQuest.currentStageIndex];
    description = stage?.description ?? '';
  }

  const statusText = targetInCurrentMap === false ? '目标在其它区域' : '';

  return {
    name: questData.name,
    description,
    statusText,
  };
}

export function getNextTrackedQuestId(
  activeQuests: ActiveQuest[],
  questSystem: QuestSystem,
  currentTrackedId?: string | null
): string | null {
  if (activeQuests.length === 0) {
    return null;
  }

  const sorted = [...activeQuests].sort((a, b) => {
    const questA = questSystem.getQuestData(a.questId);
    const questB = questSystem.getQuestData(b.questId);
    const isMainA = questA?.type === 'main' ? 1 : 0;
    const isMainB = questB?.type === 'main' ? 1 : 0;
    return isMainB - isMainA;
  });

  if (currentTrackedId === null || currentTrackedId === undefined) {
    return sorted[0].questId;
  }

  const currentIndex = sorted.findIndex((q) => q.questId === currentTrackedId);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % sorted.length : 0;
  return sorted[nextIndex].questId;
}
