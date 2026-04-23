type EventCallback<T = unknown> = (data: T) => void;

export class EventEmitter {
  private listeners: Map<string, EventCallback[]> = new Map();

  on<T>(event: string, callback: EventCallback<T>): void {
    const existing = this.listeners.get(event) ?? [];
    existing.push(callback as EventCallback);
    this.listeners.set(event, existing);
  }

  off<T>(event: string, callback: EventCallback<T>): void {
    const existing = this.listeners.get(event);
    if (!existing) return;
    const filtered = existing.filter((cb) => cb !== callback);
    this.listeners.set(event, filtered);
  }

  emit<T>(event: string, data?: T): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    for (const cb of callbacks) {
      cb(data);
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
