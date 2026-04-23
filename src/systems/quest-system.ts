import { EventEmitter } from '../utils/event-emitter';
import type { QuestData, QuestType, ActiveQuest } from '../types/quest';

export interface QuestAcceptResult {
  success: boolean;
  message: string;
}

export class QuestSystem {
  private eventEmitter = new EventEmitter();
  private questData = new Map<string, QuestData>();
  private activeQuests = new Map<string, ActiveQuest>();
  private completedQuests = new Set<string>();

  constructor(questDataList: QuestData[] = []) {
    for (const quest of questDataList) {
      this.questData.set(quest.id, quest);
    }
  }

  on(event: string, callback: (data: unknown) => void): void {
    this.eventEmitter.on(event, callback);
  }

  off(event: string, callback: (data: unknown) => void): void {
    this.eventEmitter.off(event, callback);
  }

  private emit(event: string, data?: unknown): void {
    this.eventEmitter.emit(event, data);
  }

  getQuestData(questId: string): QuestData | undefined {
    return this.questData.get(questId);
  }

  getAllQuests(): QuestData[] {
    return Array.from(this.questData.values());
  }

  getQuestsByType(type: QuestType): QuestData[] {
    return this.getAllQuests().filter((q) => q.type === type);
  }

  acceptQuest(questId: string): QuestAcceptResult {
    if (this.activeQuests.has(questId)) {
      return { success: false, message: '任务已在进行中' };
    }
    if (this.completedQuests.has(questId)) {
      return { success: false, message: '任务已完成' };
    }
    const quest = this.questData.get(questId);
    if (!quest) {
      return { success: false, message: '任务不存在' };
    }

    const activeQuest: ActiveQuest = {
      questId,
      currentStageIndex: 0,
      objectiveProgress: {},
      acceptedAt: Date.now(),
    };

    this.activeQuests.set(questId, activeQuest);
    this.emit('quest_accepted', { questId, questName: quest.name });
    return { success: true, message: `接受任务：${quest.name}` };
  }

  advanceObjective(questId: string, objectiveId: string, amount = 1): void {
    const active = this.activeQuests.get(questId);
    if (!active) return;

    const quest = this.questData.get(questId);
    if (!quest) return;

    const currentProgress = active.objectiveProgress[objectiveId] ?? 0;
    active.objectiveProgress[objectiveId] = currentProgress + amount;

    this.emit('objective_advanced', {
      questId,
      objectiveId,
      progress: active.objectiveProgress[objectiveId],
    });

    this.checkStageCompletion(active, quest);
  }

  private checkStageCompletion(active: ActiveQuest, quest: QuestData): void {
    const stage = quest.stages[active.currentStageIndex];
    if (!stage) return;

    const allComplete = stage.objectives.every((obj) => {
      const progress = active.objectiveProgress[obj.id] ?? 0;
      return progress >= obj.requiredCount;
    });

    if (allComplete) {
      active.currentStageIndex++;
      this.emit('stage_advanced', {
        questId: active.questId,
        stageIndex: active.currentStageIndex,
      });

      if (active.currentStageIndex >= quest.stages.length) {
        this.completeQuest(active.questId);
      }
    }
  }

  private completeQuest(questId: string): void {
    const quest = this.questData.get(questId);
    if (!quest) return;

    this.activeQuests.delete(questId);
    this.completedQuests.add(questId);

    this.emit('quest_completed', {
      questId,
      questName: quest.name,
      rewards: quest.rewards,
    });
  }

  getActiveQuests(): ActiveQuest[] {
    return Array.from(this.activeQuests.values()).map((q) => ({ ...q }));
  }

  getCompletedQuests(): string[] {
    return Array.from(this.completedQuests);
  }

  isQuestActive(questId: string): boolean {
    return this.activeQuests.has(questId);
  }

  isQuestCompleted(questId: string): boolean {
    return this.completedQuests.has(questId);
  }

  getCurrentStageDescription(questId: string): string | null {
    const active = this.activeQuests.get(questId);
    if (!active) return null;
    const quest = this.questData.get(questId);
    if (!quest) return null;
    const stage = quest.stages[active.currentStageIndex];
    return stage?.description ?? null;
  }

  getActiveQuestObjectives(
    questId: string
  ): { objectiveId: string; description: string; progress: number; required: number }[] | null {
    const active = this.activeQuests.get(questId);
    if (!active) return null;
    const quest = this.questData.get(questId);
    if (!quest) return null;

    const stage = quest.stages[active.currentStageIndex];
    if (!stage) return null;

    return stage.objectives.map((obj) => ({
      objectiveId: obj.id,
      description: obj.description,
      progress: active.objectiveProgress[obj.id] ?? 0,
      required: obj.requiredCount,
    }));
  }

  loadState(active: ActiveQuest[], completed: string[]): void {
    this.activeQuests.clear();
    this.completedQuests.clear();
    for (const q of active) {
      this.activeQuests.set(q.questId, { ...q });
    }
    for (const qid of completed) {
      this.completedQuests.add(qid);
    }
  }

  getState(): { active: ActiveQuest[]; completed: string[] } {
    return {
      active: this.getActiveQuests(),
      completed: this.getCompletedQuests(),
    };
  }
}
