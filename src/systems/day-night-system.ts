import { EventEmitter } from '../utils/event-emitter';

export type TimePhase = 'dawn' | 'day' | 'dusk' | 'night';

export const PHASE_CONFIG: Record<
  TimePhase,
  { start: number; end: number; tint: number; alpha: number; name: string }
> = {
  dawn: { start: 300, end: 480, tint: 0xffaa66, alpha: 0.2, name: '黎明' },
  day: { start: 480, end: 1020, tint: 0xffffff, alpha: 0, name: '白昼' },
  dusk: { start: 1020, end: 1200, tint: 0xff8844, alpha: 0.25, name: '黄昏' },
  night: { start: 1200, end: 1500, tint: 0x222255, alpha: 0.45, name: '夜晚' },
};

export const DAY_LENGTH_MINUTES = 24 * 60;
export const TIME_SCALE = 1;

export class DayNightSystem {
  private eventEmitter = new EventEmitter();
  private time = 360;
  private currentPhase: TimePhase = 'dawn';
  private dayCount = 1;

  constructor(initialTime = 360) {
    this.time = initialTime;
    this.currentPhase = this.calculatePhase();
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

  tick(deltaMs: number): void {
    const prevPhase = this.currentPhase;
    const deltaMinutes = (deltaMs / 1000) * TIME_SCALE;
    this.time += deltaMinutes;

    if (this.time >= DAY_LENGTH_MINUTES) {
      this.time -= DAY_LENGTH_MINUTES;
      this.dayCount++;
      this.emit('day_advanced', { dayCount: this.dayCount });
    }

    this.currentPhase = this.calculatePhase();
    if (this.currentPhase !== prevPhase) {
      this.emit('phase_changed', {
        phase: this.currentPhase,
        prevPhase,
        time: this.time,
        dayCount: this.dayCount,
      });
    }
  }

  getTime(): number {
    return Math.floor(this.time);
  }

  setTime(time: number): void {
    const prevPhase = this.currentPhase;
    this.time = Math.max(0, time % DAY_LENGTH_MINUTES);
    this.currentPhase = this.calculatePhase();
    if (this.currentPhase !== prevPhase) {
      this.emit('phase_changed', {
        phase: this.currentPhase,
        prevPhase,
        time: this.time,
        dayCount: this.dayCount,
      });
    }
  }

  getCurrentPhase(): TimePhase {
    return this.currentPhase;
  }

  getDayCount(): number {
    return this.dayCount;
  }

  getTintColor(): number {
    return PHASE_CONFIG[this.currentPhase].tint;
  }

  getTintAlpha(): number {
    return PHASE_CONFIG[this.currentPhase].alpha;
  }

  getPhaseName(): string {
    return PHASE_CONFIG[this.currentPhase].name;
  }

  getTimeString(): string {
    const hours = Math.floor(this.time / 60);
    const minutes = Math.floor(this.time % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private calculatePhase(): TimePhase {
    const t = this.time;
    if (t >= PHASE_CONFIG.night.start || t < PHASE_CONFIG.dawn.start) return 'night';
    if (t >= PHASE_CONFIG.dusk.start) return 'dusk';
    if (t >= PHASE_CONFIG.day.start) return 'day';
    return 'dawn';
  }
}
