import { EventEmitter } from '../utils/event-emitter';
import type { CharacterData, AffectionEvent, AffectionState, AffectionLevel } from '../types/affection';
import { AFFECTION_THRESHOLDS } from '../types/affection';

export const MAX_AFFECTION = 100;
export const MIN_AFFECTION = 0;

export class AffectionSystem {
  private eventEmitter = new EventEmitter();
  private characters = new Map<string, CharacterData>();
  private states = new Map<string, AffectionState>();
  private events = new Map<string, AffectionEvent[]>();

  constructor(characters: CharacterData[] = []) {
    for (const character of characters) {
      this.characters.set(character.id, character);
      this.states.set(character.id, {
        characterId: character.id,
        value: character.defaultAffection,
        level: this.calculateLevel(character.defaultAffection),
      });
      this.events.set(character.id, []);
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

  loadCharacters(characters: CharacterData[]): void {
    for (const character of characters) {
      if (!this.characters.has(character.id)) {
        this.characters.set(character.id, character);
        this.states.set(character.id, {
          characterId: character.id,
          value: character.defaultAffection,
          level: this.calculateLevel(character.defaultAffection),
        });
        this.events.set(character.id, []);
      }
    }
  }

  getCharacter(characterId: string): CharacterData | undefined {
    return this.characters.get(characterId);
  }

  getAllCharacters(): CharacterData[] {
    return Array.from(this.characters.values());
  }

  getAffection(characterId: string): AffectionState | undefined {
    return this.states.get(characterId);
  }

  getAffectionValue(characterId: string): number {
    return this.states.get(characterId)?.value ?? 0;
  }

  getAffectionLevel(characterId: string): AffectionLevel {
    return this.states.get(characterId)?.level ?? 'stranger';
  }

  changeAffection(characterId: string, delta: number): AffectionState | undefined {
    const state = this.states.get(characterId);
    if (!state) return undefined;

    const oldLevel = state.level;
    state.value = Math.max(MIN_AFFECTION, Math.min(MAX_AFFECTION, state.value + delta));
    state.level = this.calculateLevel(state.value);

    this.emit('affection_changed', {
      characterId,
      oldValue: state.value - delta,
      newValue: state.value,
      delta,
    });

    if (state.level !== oldLevel) {
      this.emit('affection_level_changed', {
        characterId,
        oldLevel,
        newLevel: state.level,
      });
    }

    return { ...state };
  }

  processEvent(event: AffectionEvent): boolean {
    const state = this.states.get(event.characterId);
    if (!state) return false;

    if (event.minAffectionRequired !== undefined && state.value < event.minAffectionRequired) {
      return false;
    }
    if (event.maxAffectionAllowed !== undefined && state.value > event.maxAffectionAllowed) {
      return false;
    }

    this.changeAffection(event.characterId, event.affectionChange);

    const characterEvents = this.events.get(event.characterId);
    if (characterEvents) {
      characterEvents.push(event);
    }

    this.emit('affection_event_triggered', { event, state: this.states.get(event.characterId) });
    return true;
  }

  getEventHistory(characterId: string): AffectionEvent[] {
    return [...(this.events.get(characterId) ?? [])];
  }

  isLevelAtLeast(characterId: string, level: AffectionLevel): boolean {
    const currentLevel = this.getAffectionLevel(characterId);
    const levels = Object.keys(AFFECTION_THRESHOLDS) as AffectionLevel[];
    return levels.indexOf(currentLevel) >= levels.indexOf(level);
  }

  private calculateLevel(value: number): AffectionLevel {
    const levels = Object.keys(AFFECTION_THRESHOLDS) as AffectionLevel[];
    let currentLevel: AffectionLevel = 'stranger';

    for (const level of levels) {
      if (value >= AFFECTION_THRESHOLDS[level]) {
        currentLevel = level;
      }
    }

    return currentLevel;
  }
}
