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
