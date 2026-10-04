import type { Facing } from '../player/playerSprite';

export interface DeskGeometry {
    tx: number;
    ty: number;
    // The side of the work tile the worker stands on
    dir?: { dx: number; dy: number };
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// Body centre (px) of the spot flush against the work tile, level with it along the edge (`alongX` picks where on
// an up/down tile's edge). A tile with no direction has its centre as the spot.
export function spotFor(desk: DeskGeometry, tileSize: number, halfWidth: number, halfHeight: number, alongX: number) {
    if (!desk.dir) return { x: (desk.tx + 0.5) * tileSize, y: (desk.ty + 0.5) * tileSize };
    const { dx, dy } = desk.dir;
    const x = dx < 0 ? desk.tx * tileSize - halfWidth : dx > 0 ? (desk.tx + 1) * tileSize + halfWidth
        : clamp(alongX, desk.tx * tileSize, (desk.tx + 1) * tileSize);
    const y = dy < 0 ? desk.ty * tileSize - halfHeight : dy > 0 ? (desk.ty + 1) * tileSize + halfHeight
        : (desk.ty + 1) * tileSize - halfHeight; // side tiles: body's bottom edge level with the tile's bottom edge
    return { x, y };
}

// dir is the side of the tile they stand on, so they face the opposite way: left of the tile means facing right, and so on.
// The facing also decides which side of them the chair is parked on. Undefined for a tile with no direction.
export function facingFor(dir?: { dx: number; dy: number }): Facing | undefined {
    if (!dir) return undefined;
    return dir.dx > 0 ? 'left' : dir.dx < 0 ? 'right' : dir.dy > 0 ? 'up' : 'down';
}
