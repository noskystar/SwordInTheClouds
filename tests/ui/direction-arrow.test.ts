import { describe, test, expect } from 'vitest';
import { calculateArrowPosition } from '../../src/ui/direction-arrow';
import type { ArrowPosition } from '../../src/ui/direction-arrow';

describe('calculateArrowPosition', () => {
  const cameraX = 0;
  const cameraY = 0;
  const cameraWidth = 320;
  const cameraHeight = 180;

  test('returns invisible when target is inside viewport', () => {
    const result = calculateArrowPosition(
      cameraX,
      cameraY,
      cameraWidth,
      cameraHeight,
      100,
      100,
      50,
      50
    );
    expect(result.visible).toBe(false);
  });

  test('returns invisible when targetX is null', () => {
    const result = calculateArrowPosition(
      cameraX,
      cameraY,
      cameraWidth,
      cameraHeight,
      null as unknown as number,
      100,
      50,
      50
    );
    expect(result.visible).toBe(false);
  });

  test('returns invisible when targetY is null', () => {
    const result = calculateArrowPosition(
      cameraX,
      cameraY,
      cameraWidth,
      cameraHeight,
      100,
      null as unknown as number,
      50,
      50
    );
    expect(result.visible).toBe(false);
  });

  test('points to right edge when target is off-screen to the right', () => {
    const result = calculateArrowPosition(
      cameraX,
      cameraY,
      cameraWidth,
      cameraHeight,
      500,
      90,
      160,
      90
    );
    expect(result.visible).toBe(true);
    expect(result.x).toBe(cameraX + cameraWidth);
    expect(result.y).toBe(90);
  });

  test('points to top edge when target is off-screen above', () => {
    const result = calculateArrowPosition(
      cameraX,
      cameraY,
      cameraWidth,
      cameraHeight,
      160,
      -100,
      160,
      90
    );
    expect(result.visible).toBe(true);
    expect(result.x).toBe(160);
    expect(result.y).toBe(cameraY);
  });

  test('uses gray color when target is far (>200px from player)', () => {
    const result = calculateArrowPosition(
      cameraX,
      cameraY,
      cameraWidth,
      cameraHeight,
      500,
      90,
      160,
      90
    );
    expect(result.visible).toBe(true);
    expect(result.color).toBe('#888888');
  });

  test('uses main color when target is close (≤200px from player)', () => {
    const result = calculateArrowPosition(
      cameraX,
      cameraY,
      cameraWidth,
      cameraHeight,
      360,
      90,
      160,
      90
    );
    expect(result.visible).toBe(true);
    expect(result.color).toBe('#4a90d9');
  });

  test('correctly calculates rotation angle', () => {
    const result = calculateArrowPosition(
      cameraX,
      cameraY,
      cameraWidth,
      cameraHeight,
      500,
      90,
      160,
      90
    );
    expect(result.visible).toBe(true);
    expect(result.rotation).toBe(0);
  });

  test('rotation is Math.atan2(dy, dx) for off-screen target above', () => {
    const result = calculateArrowPosition(
      cameraX,
      cameraY,
      cameraWidth,
      cameraHeight,
      160,
      -100,
      160,
      90
    );
    expect(result.visible).toBe(true);
    expect(result.rotation).toBeCloseTo(-Math.PI / 2, 5);
  });
});
