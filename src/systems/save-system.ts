import { EventEmitter } from '../utils/event-emitter';
import type { GameSaveData } from '../types/save';

export const SAVE_KEY = 'sword_in_the_clouds_save';
export const SAVE_VERSION = '1.0';

export class SaveSystem {
  private eventEmitter = new EventEmitter();
  private cache: GameSaveData | null = null;

  constructor() {
    this.loadFromStorage();
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

  hasSave(): boolean {
    return this.cache !== null;
  }

  getSaveData(): GameSaveData | null {
    return this.cache ? (JSON.parse(JSON.stringify(this.cache)) as GameSaveData) : null;
  }

  save(data: GameSaveData): boolean {
    try {
      const saveData: GameSaveData = {
        ...data,
        version: SAVE_VERSION,
        timestamp: Date.now(),
      };
      const serialized = JSON.stringify(saveData);
      localStorage.setItem(SAVE_KEY, serialized);
      this.cache = saveData;
      this.emit('saved', { timestamp: saveData.timestamp });
      return true;
    } catch {
      return false;
    }
  }

  load(): GameSaveData | null {
    this.loadFromStorage();
    if (this.cache) {
      this.emit('loaded', { data: this.cache });
    }
    return this.cache;
  }

  delete(): boolean {
    try {
      localStorage.removeItem(SAVE_KEY);
      this.cache = null;
      this.emit('deleted', {});
      return true;
    } catch {
      return false;
    }
  }

  exportToJSON(): string | null {
    if (!this.cache) return null;
    return JSON.stringify(this.cache, null, 2);
  }

  importFromJSON(json: string): boolean {
    try {
      const data = JSON.parse(json) as GameSaveData;
      if (!data.version || !data.player) return false;
      return this.save(data);
    } catch {
      return false;
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        this.cache = JSON.parse(raw) as GameSaveData;
      }
    } catch {
      this.cache = null;
    }
  }
}
