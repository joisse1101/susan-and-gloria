import type { InteractionTile } from './zones';
import type { Rect } from './zones';

// A plant is one or more touching `interaction = water` tiles (the pot and its leaves are on separate layers or tiles)
export interface Plant {
    id: string;
    // Bounding rectangle of its tiles, in tile units
    rect: Rect;
    // Optional fixed side to water from (the tiles' `direction` property); absent: the nearest open side
    direction?: string;
    tileSize: number;
    // The part of the rectangle that is actually solid (the pots), in tile units, from the map's collision bodies.
    // A plant's solid can be smaller than its tiles; actors stand against this, so the water lands on the plant.
    solid?: Rect;
}

// The union of the collision bodies (px) that overlap the plant's rectangle, clipped to it, in tile units. Undefined
// when nothing overlaps (the plant has no collision).
export function solidBounds(rect: Rect, tileSize: number, bodies: { left: number; top: number; right: number; bottom: number }[]): Rect | undefined {
    const box = { x0: rect.x0 * tileSize, y0: rect.y0 * tileSize, x1: rect.x1 * tileSize, y1: rect.y1 * tileSize };
    let found: Rect | undefined;
    for (const b of bodies) {
        const x0 = Math.max(b.left, box.x0), y0 = Math.max(b.top, box.y0);
        const x1 = Math.min(b.right, box.x1), y1 = Math.min(b.bottom, box.y1);
        if (x1 <= x0 || y1 <= y0) continue; // touching or apart, not overlapping
        found = found
            ? { x0: Math.min(found.x0, x0), y0: Math.min(found.y0, y0), x1: Math.max(found.x1, x1), y1: Math.max(found.y1, y1) }
            : { x0, y0, x1, y1 };
    }
    return found && { x0: found.x0 / tileSize, y0: found.y0 / tileSize, x1: found.x1 / tileSize, y1: found.y1 / tileSize };
}

export interface PlantCell { tx: number; ty: number; direction?: string }

export function plantCells(tiles: InteractionTile[]): PlantCell[] {
    return tiles.map((t) => {
        const d = t.property('direction');
        return { tx: t.tx, ty: t.ty, direction: typeof d === 'string' ? d : undefined };
    });
}

// Dedupes cells (the same cell on two layers), then merges 4-neighbours into plants
export function mergePlants(cells: PlantCell[], tileSize: number): Plant[] {
    const byKey = new Map<string, PlantCell>();
    for (const c of cells) {
        const key = `${c.tx},${c.ty}`;
        const seen = byKey.get(key);
        if (!seen) byKey.set(key, { ...c });
        else seen.direction ??= c.direction;
    }
    const plants: Plant[] = [];
    const left = new Set(byKey.keys());
    for (const start of [...byKey.keys()]) {
        if (!left.delete(start)) continue;
        const group: PlantCell[] = [];
        const queue = [byKey.get(start)!];
        while (queue.length) {
            const c = queue.pop()!;
            group.push(c);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const key = `${c.tx + dx},${c.ty + dy}`;
                if (left.delete(key)) queue.push(byKey.get(key)!);
            }
        }
        const xs = group.map((c) => c.tx);
        const ys = group.map((c) => c.ty);
        const x0 = Math.min(...xs), y0 = Math.min(...ys);
        plants.push({
            id: `${x0},${y0}`,
            rect: { x0, y0, x1: Math.max(...xs) + 1, y1: Math.max(...ys) + 1 },
            direction: group.find((c) => c.direction)?.direction,
            tileSize
        });
    }
    return plants;
}

// The area an actor must be in to water: the plant grown by `reach` tiles on every side
export function reachZone(plant: Plant, reach: number): Rect {
    const { x0, y0, x1, y1 } = plant.rect;
    return { x0: x0 - reach, y0: y0 - reach, x1: x1 + reach, y1: y1 + reach };
}

const DIRECTIONS: Record<string, { dx: number; dy: number }> = {
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 }
};

// The side of the plant an actor at (x, y) px stands on, as for a desk (`dir` is the side of the tile they stand on):
// the plant's own `direction` when it has one. Otherwise a point beside the plant (past its left or right edge) takes
// that side, even when it is also a little below it, so coming in from the corner of the reach zone does not send
// the actor round to the front; a point in line with the plant takes the side it is outside of.
export function standSide(plant: Plant, x: number, y: number): { dx: number; dy: number } {
    const fixed = plant.direction ? DIRECTIONS[plant.direction] : undefined;
    if (fixed) return fixed;
    const s = plant.tileSize;
    const r = plant.solid ?? plant.rect;
    const left = r.x0 * s - x;
    const right = x - r.x1 * s;
    const above = r.y0 * s - y;
    const below = y - r.y1 * s;
    if (left > 0 || right > 0) return left > right ? { dx: -1, dy: 0 } : { dx: 1, dy: 0 };
    if (above > 0 && above > below) return { dx: 0, dy: -1 };
    if (below > 0) return { dx: 0, dy: 1 };
    // Inside the plant's tile area (a plant's solid body can be narrower than its tile, so an actor can stand there):
    // the nearest edge it can be on, the wall side excluded
    const toLeft = x - r.x0 * s;
    const toRight = r.x1 * s - x;
    const toBelow = r.y1 * s - y;
    const nearest = Math.min(toLeft, toRight, toBelow);
    if (nearest === toBelow) return { dx: 0, dy: 1 };
    return nearest === toLeft ? { dx: -1, dy: 0 } : { dx: 1, dy: 0 };
}
