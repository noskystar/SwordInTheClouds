import { describe, it, expect } from 'vitest';

describe('touch controls layout', () => {
  it('button gap must be >= 2 * radius + padding', () => {
    const H = 180;
    const W = 320;
    const btnR = Math.round(H * 0.04);
    const btnGap = Math.round(W * 0.065);
    const padding = 4;
    expect(btnGap).toBeGreaterThanOrEqual(2 * btnR + padding);
  });

  it('buttons fit within right margin with new sizing', () => {
    const W = 320;
    const H = 180;
    const btnR = Math.round(H * 0.04);
    const btnGap = Math.round(W * 0.065);
    const btnBaseX = W * 0.82;
    const leftEdge = btnBaseX - btnGap - btnR;
    const rightEdge = btnBaseX + btnGap + btnR;
    expect(leftEdge).toBeGreaterThanOrEqual(W * 0.5);
    expect(rightEdge).toBeLessThanOrEqual(W);
  });
});
