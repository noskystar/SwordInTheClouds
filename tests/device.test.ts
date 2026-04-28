import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isTouchDevice } from '../src/utils/device';

describe('isTouchDevice', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', { maxTouchPoints: 0 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when window.ontouchstart exists', () => {
    vi.stubGlobal('window', { ontouchstart: () => {} });
    vi.stubGlobal('navigator', { maxTouchPoints: 0 });
    expect(isTouchDevice()).toBe(true);
  });

  it('returns true when navigator.maxTouchPoints > 0', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', { maxTouchPoints: 5 });
    expect(isTouchDevice()).toBe(true);
  });

  it('returns false when neither exists', () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', { maxTouchPoints: 0 });
    expect(isTouchDevice()).toBe(false);
  });
});
