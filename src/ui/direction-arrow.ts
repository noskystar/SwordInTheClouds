export interface ArrowPosition {
  x: number;
  y: number;
  rotation: number;
  visible: boolean;
  color: string;
}

/**
 * Calculate the on-screen position, rotation, and visibility of a direction arrow
 * pointing toward an off-screen target.
 *
 * @param cameraX      Camera viewport top-left X
 * @param cameraY      Camera viewport top-left Y
 * @param cameraWidth  Camera viewport width
 * @param cameraHeight Camera viewport height
 * @param targetX      Target world X coordinate
 * @param targetY      Target world Y coordinate
 * @param playerX      Player world X coordinate
 * @param playerY      Player world Y coordinate
 */
export function calculateArrowPosition(
  cameraX: number,
  cameraY: number,
  cameraWidth: number,
  cameraHeight: number,
  targetX: number | null,
  targetY: number | null,
  playerX: number,
  playerY: number
): ArrowPosition {
  // Rule 1: null target coordinates
  if (targetX === null || targetY === null) {
    return {
      x: 0,
      y: 0,
      rotation: 0,
      visible: false,
      color: '#888888',
    };
  }

  // Rule 2: target inside viewport
  const insideX = targetX >= cameraX && targetX <= cameraX + cameraWidth;
  const insideY = targetY >= cameraY && targetY <= cameraY + cameraHeight;
  if (insideX && insideY) {
    return {
      x: 0,
      y: 0,
      rotation: 0,
      visible: false,
      color: '#888888',
    };
  }

  // Rule 3: target outside viewport
  const centerX = cameraX + cameraWidth / 2;
  const centerY = cameraY + cameraHeight / 2;

  const dx = targetX - centerX;
  const dy = targetY - centerY;

  const intersection = rayIntersectRectangle(
    centerX,
    centerY,
    dx,
    dy,
    cameraX,
    cameraY,
    cameraX + cameraWidth,
    cameraY + cameraHeight
  );

  const rotation = Math.atan2(dy, dx);

  const distance = Math.hypot(targetX - playerX, targetY - playerY);
  const color = distance > 200 ? '#888888' : '#4a90d9';

  return {
    x: intersection.x,
    y: intersection.y,
    rotation,
    visible: true,
    color,
  };
}

/**
 * Find where a ray from (originX, originY) in direction (dirX, dirY)
 * intersects the boundary of a rectangle [minX, maxX] x [minY, maxY].
 */
function rayIntersectRectangle(
  originX: number,
  originY: number,
  dirX: number,
  dirY: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): { x: number; y: number } {
  let tMin = Infinity;

  // Intersect with left edge (x = minX)
  if (dirX !== 0) {
    const t = (minX - originX) / dirX;
    if (t >= 0) {
      const y = originY + t * dirY;
      if (y >= minY && y <= maxY) {
        tMin = Math.min(tMin, t);
      }
    }
  }

  // Intersect with right edge (x = maxX)
  if (dirX !== 0) {
    const t = (maxX - originX) / dirX;
    if (t >= 0) {
      const y = originY + t * dirY;
      if (y >= minY && y <= maxY) {
        tMin = Math.min(tMin, t);
      }
    }
  }

  // Intersect with top edge (y = minY)
  if (dirY !== 0) {
    const t = (minY - originY) / dirY;
    if (t >= 0) {
      const x = originX + t * dirX;
      if (x >= minX && x <= maxX) {
        tMin = Math.min(tMin, t);
      }
    }
  }

  // Intersect with bottom edge (y = maxY)
  if (dirY !== 0) {
    const t = (maxY - originY) / dirY;
    if (t >= 0) {
      const x = originX + t * dirX;
      if (x >= minX && x <= maxX) {
        tMin = Math.min(tMin, t);
      }
    }
  }

  if (tMin === Infinity) {
    // Should not happen for targets outside the rectangle,
    // but return origin as fallback.
    return { x: originX, y: originY };
  }

  return {
    x: originX + tMin * dirX,
    y: originY + tMin * dirY,
  };
}
