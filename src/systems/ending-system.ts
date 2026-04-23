import { EventEmitter } from '../utils/event-emitter';
import type { EndingType, EndingData } from '../types/ending';

export const ENDINGS: EndingData[] = [
  {
    id: 'good',
    name: '剑心通明',
    description: '你以正途证得大道，守护了天剑宗与苍生。',
    condition: { minMorality: 30, requiredFlags: { chapter1_complete: true } },
  },
  {
    id: 'neutral',
    name: '归隐山林',
    description: '你看破红尘，选择远离修仙界的纷争。',
    condition: { minMorality: -10, maxMorality: 29, requiredFlags: { chapter1_complete: true } },
  },
  {
    id: 'bad',
    name: '堕入魔道',
    description: '你为求力量不择手段，最终沦为魔道中人。',
    condition: { maxMorality: -11, requiredFlags: { chapter1_complete: true } },
  },
  {
    id: 'hidden_true',
    name: '真相之剑',
    description: '你揭开了天剑宗千年的秘密，改写了修仙界的命运。',
    condition: {
      hidden: true,
      requiredFlags: { knows_master_truth: true, chapter1_complete: true },
      requiredItems: ['ancient_scroll'],
      requiredCharacters: ['elder', 'brother'],
    },
  },
  {
    id: 'hidden_ironic',
    name: '云深不知处',
    description: '你成为了新的谜团，无人知晓你的下落。',
    condition: {
      hidden: true,
      requiredFlags: { elusive_ending: true },
    },
  },
];

export interface StoryFlags {
  flags: Record<string, boolean | number | string>;
  choices: string[];
  charactersHelped: string[];
  itemsCollected: string[];
  morality: number;
}

export class EndingSystem {
  private eventEmitter = new EventEmitter();

  on(event: string, callback: (data: unknown) => void): void {
    this.eventEmitter.on(event, callback);
  }

  private emit(event: string, data?: unknown): void {
    this.eventEmitter.emit(event, data);
  }

  calculateEnding(flags: StoryFlags): EndingType {
    // Check hidden endings first (highest priority)
    for (const ending of ENDINGS) {
      if (!ending.condition.hidden) continue;
      if (this.matchesCondition(ending, flags)) {
        this.emit('ending_calculated', { ending: ending.id, name: ending.name });
        return ending.id;
      }
    }

    // Then check standard endings
    for (const ending of ENDINGS) {
      if (ending.condition.hidden) continue;
      if (this.matchesCondition(ending, flags)) {
        this.emit('ending_calculated', { ending: ending.id, name: ending.name });
        return ending.id;
      }
    }

    return 'neutral';
  }

  private matchesCondition(ending: EndingData, flags: StoryFlags): boolean {
    const cond = ending.condition;

    if (cond.minMorality !== undefined && flags.morality < cond.minMorality) return false;
    if (cond.maxMorality !== undefined && flags.morality > cond.maxMorality) return false;

    if (cond.requiredFlags) {
      for (const [key, value] of Object.entries(cond.requiredFlags)) {
        if (flags.flags[key] !== value) return false;
      }
    }

    if (cond.requiredCharacters) {
      for (const char of cond.requiredCharacters) {
        if (!flags.charactersHelped.includes(char)) return false;
      }
    }

    if (cond.requiredItems) {
      for (const item of cond.requiredItems) {
        if (!flags.itemsCollected.includes(item)) return false;
      }
    }

    return true;
  }

  getEndingData(endingId: EndingType): EndingData | undefined {
    return ENDINGS.find((e) => e.id === endingId);
  }

  getAllEndings(): EndingData[] {
    return [...ENDINGS];
  }
}
