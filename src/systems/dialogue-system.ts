import { EventEmitter } from '../utils/event-emitter';
import type {
  DialogueData,
  DialogueNode,
  DialogueOption,
  DialogueCondition,
  DialogueEffect,
  DialogueState,
  DialogueHistoryEntry,
} from '../types/dialogue';

export type OnNodeChangeCallback = (node: DialogueNode, state: DialogueState) => void;
export type OnDialogueEndCallback = (state: DialogueState) => void;

interface GameContext {
  flags: Record<string, boolean | number | string>;
  stats: Record<string, number>;
  affinity: Record<string, number>;
  morality: number;
  swordHeart: number;
  realm: string;
  realmStage?: string;
  inventory: Record<string, number>;
}

export class DialogueSystem {
  private eventEmitter = new EventEmitter();
  private dialogueData!: DialogueData;
  private state!: DialogueState;
  private context: GameContext;
  private onNodeChange?: OnNodeChangeCallback;
  private onDialogueEnd?: OnDialogueEndCallback;

  constructor(context?: Partial<GameContext>) {
    this.context = {
      flags: {},
      stats: {},
      affinity: {},
      morality: 0,
      swordHeart: 0,
      realm: 'qi_refining',
      realmStage: 'early',
      inventory: {},
      ...context,
    };
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

  loadDialogue(data: DialogueData): void {
    this.dialogueData = data;
    this.state = {
      dialogueId: data.id,
      currentNodeId: data.startNodeId,
      history: [],
    };
  }

  start(): void {
    const node = this.getCurrentNode();
    if (node) {
      this.recordHistory(node);
      this.onNodeChange?.(node, this.state);
    }
  }

  selectOption(optionIndex: number): void {
    const node = this.getCurrentNode();
    if (!node) return;

    const visibleOptions = this.getVisibleOptions(node);
    const option = visibleOptions[optionIndex];
    if (!option) return;

    // Record selection
    const lastEntry = this.state.history[this.state.history.length - 1];
    if (lastEntry) {
      lastEntry.selectedOptionId = option.id;
    }

    // Execute effects
    for (const effect of option.effects) {
      this.executeEffect(effect);
    }

    // Navigate to next node
    if (option.nextNodeId) {
      this.state.currentNodeId = option.nextNodeId;
      const nextNode = this.getCurrentNode();
      if (nextNode) {
        this.recordHistory(nextNode);
        this.onNodeChange?.(nextNode, this.state);
      }
    } else {
      this.endDialogue();
    }
  }

  getCurrentNode(): DialogueNode | null {
    return this.dialogueData?.nodes[this.state.currentNodeId] ?? null;
  }

  getVisibleOptions(node: DialogueNode): DialogueOption[] {
    return node.options.filter((option) => this.checkCondition(option.condition));
  }

  getState(): DialogueState {
    return this.state;
  }

  getHistory(): DialogueHistoryEntry[] {
    return this.state.history;
  }

  setCallbacks(
    onNodeChange: OnNodeChangeCallback,
    onDialogueEnd: OnDialogueEndCallback
  ): void {
    this.onNodeChange = onNodeChange;
    this.onDialogueEnd = onDialogueEnd;
  }

  updateContext(updates: Partial<GameContext>): void {
    this.context = { ...this.context, ...updates };
  }

  private checkCondition(condition?: DialogueCondition): boolean {
    if (!condition) return true;

    switch (condition.type) {
      case 'stat_check':
        return (this.context.stats[condition.stat] ?? 0) >= condition.minValue;

      case 'affinity_check':
        return (this.context.affinity[condition.npcId] ?? 0) >= condition.minValue;

      case 'item_check': {
        const qty = this.context.inventory[condition.itemId] ?? 0;
        return qty >= (condition.quantity ?? 1);
      }

      case 'flag_check':
        return this.context.flags[condition.flag] === condition.value;

      case 'morality_check': {
        const val = this.context.morality;
        if (condition.min !== undefined && val < condition.min) return false;
        if (condition.max !== undefined && val > condition.max) return false;
        return true;
      }

      case 'realm_check': {
        if (this.context.realm !== condition.realm) return false;
        if (condition.stage && this.context.realmStage !== condition.stage) return false;
        return true;
      }

      case 'compound': {
        if (condition.operator === 'and') {
          return condition.conditions.every((c) => this.checkCondition(c));
        } else {
          return condition.conditions.some((c) => this.checkCondition(c));
        }
      }

      default:
        return true;
    }
  }

  private executeEffect(effect: DialogueEffect): void {
    switch (effect.type) {
      case 'set_flag':
        this.context.flags[effect.flag] = effect.value;
        break;

      case 'change_affinity': {
        const current = this.context.affinity[effect.npcId] ?? 0;
        this.context.affinity[effect.npcId] = current + effect.delta;
        break;
      }

      case 'change_morality':
        this.context.morality += effect.delta;
        break;

      case 'change_sword_heart':
        this.context.swordHeart += effect.delta;
        break;

      case 'add_item': {
        const current = this.context.inventory[effect.itemId] ?? 0;
        this.context.inventory[effect.itemId] = current + effect.quantity;
        break;
      }

      case 'remove_item': {
        const current = this.context.inventory[effect.itemId] ?? 0;
        this.context.inventory[effect.itemId] = Math.max(0, current - effect.quantity);
        break;
      }

      case 'start_battle':
        this.emit('start_battle', { enemyGroupId: effect.enemyGroupId });
        break;
      case 'start_quest':
        this.emit('start_quest', { questId: effect.questId });
        break;
      case 'advance_quest':
        this.emit('advance_quest', { questId: effect.questId, stage: effect.stage });
        break;
      case 'complete_quest':
        this.emit('complete_quest', { questId: effect.questId });
        break;
      case 'teleport':
        this.emit('teleport', { scene: effect.scene, x: effect.x, y: effect.y });
        break;
      case 'unlock_skill':
      case 'play_sound':
      case 'show_animation':
      case 'delay':
        // These effects are handled by the scene/scene manager
        break;
    }
  }

  private recordHistory(node: DialogueNode): void {
    this.state.history.push({
      nodeId: node.id,
      speaker: node.speaker,
      text: node.text,
      timestamp: Date.now(),
    });
  }

  private endDialogue(): void {
    this.onDialogueEnd?.(this.state);
  }
}
