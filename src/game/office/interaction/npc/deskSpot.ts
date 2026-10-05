import type { Facing } from '../player/playerSprite';
import type { Rect } from '../zones';

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// Body centre (px) of the spot flush against a rectangle (tile units) on the side `dir` of it, level with it along the
// edge (`alongX` picks where on an up/down edge). A side edge is levelled with the rectangle's bottom (a desk), unless
// `alongY` is given: then the spot is where on the edge that is nearest to it (a plant, where nothing needs lining up).
// With no side, the rectangle's centre is the spot.
export function spotAgainst(rect: Rect, dir: { dx: number; dy: number } | undefined, tileSize: number, halfWidth: number, halfHeight: number, alongX: number, alongY?: number) {
    if (!dir) return { x: ((rect.x0 + rect.x1) / 2) * tileSize, y: ((rect.y0 + rect.y1) / 2) * tileSize };
    const { dx, dy } = dir;
    const x = dx < 0 ? rect.x0 * tileSize - halfWidth : dx > 0 ? rect.x1 * tileSize + halfWidth
        : clamp(alongX, rect.x0 * tileSize, rect.x1 * tileSize);
    const y = dy < 0 ? rect.y0 * tileSize - halfHeight : dy > 0 ? rect.y1 * tileSize + halfHeight
        : alongY === undefined ? rect.y1 * tileSize - halfHeight // side edges: body's bottom edge level with the rectangle's bottom edge
            : clamp(alongY, Math.min(rect.y0 * tileSize + halfHeight, rect.y1 * tileSize - halfHeight), rect.y1 * tileSize - halfHeight);
    return { x, y };
}

// Body centre (px) of the spot flush against a desk rectangle (tile units), level with it along the edge (`alongX`
// picks where on an up/down edge). A desk with no side has its centre as the spot.
export function spotFor(desk: Rect, dir: { dx: number; dy: number } | undefined, tileSize: number, halfWidth: number, halfHeight: number, alongX: number) {
    return spotAgainst(desk, dir, tileSize, halfWidth, halfHeight, alongX);
}

// dir is the side of the tile they stand on, so they face the opposite way: left of the tile means facing right, and so on.
// The facing also decides which side of them the chair is parked on. Undefined for a tile with no direction.
export function facingFor(dir?: { dx: number; dy: number }): Facing | undefined {
    if (!dir) return undefined;
    return dir.dx > 0 ? 'left' : dir.dx < 0 ? 'right' : dir.dy > 0 ? 'up' : 'down';
}

// Half the size (px) of a feet body of `width` x `height` unscaled px on a sprite scaled by `scale`. Worked out rather
// than read from the Arcade body, which only takes on the sprite's scale at its first physics step.
export function scaledHalfSize(width: number, height: number, scale: number) {
    return { halfWidth: (width * scale) / 2, halfHeight: (height * scale) / 2 };
}
