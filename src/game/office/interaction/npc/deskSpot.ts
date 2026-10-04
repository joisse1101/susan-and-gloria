import type { Facing } from '../player/playerSprite';
import { tileRect, type Rect } from '../zones';

export interface DeskGeometry {
    tx: number;
    ty: number;
    // The side of the work tile the worker stands on
    dir?: { dx: number; dy: number };
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// Body centre (px) of the spot flush against a rectangle (tile units) on the side `dir` of it, level with it along the
// edge (`alongX` picks where on an up/down edge). With no side, the rectangle's centre is the spot.
export function spotAgainst(rect: Rect, dir: { dx: number; dy: number } | undefined, tileSize: number, halfWidth: number, halfHeight: number, alongX: number) {
    if (!dir) return { x: ((rect.x0 + rect.x1) / 2) * tileSize, y: ((rect.y0 + rect.y1) / 2) * tileSize };
    const { dx, dy } = dir;
    const x = dx < 0 ? rect.x0 * tileSize - halfWidth : dx > 0 ? rect.x1 * tileSize + halfWidth
        : clamp(alongX, rect.x0 * tileSize, rect.x1 * tileSize);
    const y = dy < 0 ? rect.y0 * tileSize - halfHeight : dy > 0 ? rect.y1 * tileSize + halfHeight
        : rect.y1 * tileSize - halfHeight; // side edges: body's bottom edge level with the rectangle's bottom edge
    return { x, y };
}

// Body centre (px) of the spot flush against the work tile, level with it along the edge (`alongX` picks where on
// an up/down tile's edge). A tile with no direction has its centre as the spot.
export function spotFor(desk: DeskGeometry, tileSize: number, halfWidth: number, halfHeight: number, alongX: number) {
    return spotAgainst(tileRect(desk.tx, desk.ty), desk.dir, tileSize, halfWidth, halfHeight, alongX);
}

// dir is the side of the tile they stand on, so they face the opposite way: left of the tile means facing right, and so on.
// The facing also decides which side of them the chair is parked on. Undefined for a tile with no direction.
export function facingFor(dir?: { dx: number; dy: number }): Facing | undefined {
    if (!dir) return undefined;
    return dir.dx > 0 ? 'left' : dir.dx < 0 ? 'right' : dir.dy > 0 ? 'up' : 'down';
}
