import { EventEmitter } from '../utils/event-emitter';

export const SETTINGS_KEY = 'sword_in_the_clouds_settings';

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  textSpeed: number; // 0=slow, 1=normal, 2=fast
  battleSpeed: number; // 0=slow, 1=normal, 2=fast
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 1.0,
  textSpeed: 1,
  battleSpeed: 1,
};

export class SettingsSystem {
  private eventEmitter = new EventEmitter();
  private settings: GameSettings;

  constructor() {
    this.settings = this.loadFromStorage();
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

  getSettings(): GameSettings {
    return { ...this.settings };
  }

  get<K extends keyof GameSettings>(key: K): GameSettings[K] {
    return this.settings[key];
  }

  set<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
    this.settings[key] = value;
    this.saveToStorage();
    this.emit('changed', { key, value });
    this.emit(`changed:${key as string}`, value);
  }

  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveToStorage();
    this.emit('changed', { settings: this.settings });
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore storage errors
    }
  }

  private loadFromStorage(): GameSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GameSettings>;
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // ignore parse errors
    }
    return { ...DEFAULT_SETTINGS };
  }
}
