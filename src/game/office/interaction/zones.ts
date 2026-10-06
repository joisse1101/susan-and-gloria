import type Phaser from 'phaser';

// A rectangle, in tile units (or px, where a name says so): x0,y0 is the top-left, x1,y1 the bottom-right
export interface Rect { x0: number; y0: number; x1: number; y1: number }

export function rectToPx(r: Rect, tileSize: number): Rect {
    return { x0: r.x0 * tileSize, y0: r.y0 * tileSize, x1: r.x1 * tileSize, y1: r.y1 * tileSize };
}

// The rectangle a tile covers, in tile units
export function tileRect(tx: number, ty: number): Rect {
    return { x0: tx, y0: ty, x1: tx + 1, y1: ty + 1 };
}

// True when the point (px) is inside the rectangle (tile units) given the tile size, edges included
export function containsPx(r: Rect, tileSize: number, x: number, y: number) {
    const tx = x / tileSize;
    const ty = y / tileSize;
    return tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1;
}

// A side of a rectangle, as the direction a person stands in from it
export type Dir = { dx: number; dy: number };
export const SIDE_DIRS: Record<'left' | 'right' | 'up' | 'down', Dir> = {
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 }
};
export const SIDES: Dir[] = [SIDE_DIRS.left, SIDE_DIRS.right, SIDE_DIRS.up, SIDE_DIRS.down];

// The rectangle grown by `px` on every side; px is converted to tile units with the tile size
export function growRect(r: Rect, px: number, tileSize: number): Rect {
    const g = px / tileSize;
    return { x0: r.x0 - g, y0: r.y0 - g, x1: r.x1 + g, y1: r.y1 + g };
}

// The strip against the rectangle's edge on side `dir`, as long as that edge and `px` deep
export function sideStrip(r: Rect, dir: Dir, px: number, tileSize: number): Rect {
    const d = px / tileSize;
    if (dir.dx < 0) return { x0: r.x0 - d, y0: r.y0, x1: r.x0, y1: r.y1 };
    if (dir.dx > 0) return { x0: r.x1, y0: r.y0, x1: r.x1 + d, y1: r.y1 };
    if (dir.dy < 0) return { x0: r.x0, y0: r.y0 - d, x1: r.x1, y1: r.y0 };
    return { x0: r.x0, y0: r.y1, x1: r.x1, y1: r.y1 + d };
}

export interface GroupCell { tx: number; ty: number; direction?: string }

// A run of touching tiles: its bounding rectangle (tile units), the first `direction` found on its cells, the id
// "x0,y0" of its top-left corner and its cells
export interface TileGroup {
    id: string;
    rect: Rect;
    direction?: string;
    cells: GroupCell[];
}

function toGroup(cells: GroupCell[]): TileGroup {
    const xs = cells.map((c) => c.tx);
    const ys = cells.map((c) => c.ty);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    return {
        id: `${x0},${y0}`,
        rect: { x0, y0, x1: Math.max(...xs) + 1, y1: Math.max(...ys) + 1 },
        direction: cells.find((c) => c.direction)?.direction,
        cells
    };
}

// Dedupes cells (the same cell on two layers), then merges 4-neighbours into groups
export function groupTiles(cells: GroupCell[]): TileGroup[] {
    const byKey = new Map<string, GroupCell>();
    for (const c of cells) {
        const key = `${c.tx},${c.ty}`;
        const seen = byKey.get(key);
        if (!seen) byKey.set(key, { ...c });
        else seen.direction ??= c.direction;
    }
    const groups: TileGroup[] = [];
    const left = new Set(byKey.keys());
    for (const start of [...byKey.keys()]) {
        if (!left.delete(start)) continue;
        const members: GroupCell[] = [];
        const queue = [byKey.get(start)!];
        while (queue.length) {
            const c = queue.pop()!;
            members.push(c);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const key = `${c.tx + dx},${c.ty + dy}`;
                if (left.delete(key)) queue.push(byKey.get(key)!);
            }
        }
        groups.push(toGroup(members));
    }
    return groups;
}

// Cuts a group from its top-left into chunks at most `maxPx` across on each axis. Cut relative to the group, not the
// world grid, so the result depends only on the group's shape.
export function splitToMax(group: TileGroup, maxPx: number, tileSize: number): TileGroup[] {
    const chunks = new Map<string, GroupCell[]>();
    for (const c of group.cells) {
        const key = `${Math.floor((c.tx - group.rect.x0) * tileSize / maxPx)},${Math.floor((c.ty - group.rect.y0) * tileSize / maxPx)}`;
        const chunk = chunks.get(key);
        if (chunk) chunk.push(c);
        else chunks.set(key, [c]);
    }
    return [...chunks.values()].map(toGroup);
}

// Phaser exposes tile properties as {name: value}, but accept Tiled's [{name, value}] list too
export function tileProperty(tileset: Pick<Phaser.Tilemaps.Tileset, 'firstgid' | 'tileProperties'>, index: number, key: string): unknown {
    const props = (tileset.tileProperties as Record<number, unknown> | undefined)?.[index - tileset.firstgid];
    if (Array.isArray(props)) return (props as { name: string; value: unknown }[]).find((p) => p.name === key)?.value;
    return (props as Record<string, unknown> | undefined)?.[key];
}

export interface InteractionTile {
    tx: number;
    ty: number;
    tileSize: number;
    // Another property of the same tile, e.g. its "direction"
    property(key: string): unknown;
}

type Layer = Pick<Phaser.Tilemaps.TilemapLayer, 'forEachTile'>;
type Tileset = Pick<Phaser.Tilemaps.Tileset, 'firstgid' | 'tileProperties'>;

// The layer's tiles whose Tiled tile property `interaction` equals `kind` ("work", "water")
export function scanInteractionTiles(layer: Layer, tileset: Tileset, kind: string): InteractionTile[] {
    const found: InteractionTile[] = [];
    layer.forEachTile((tile) => {
        if (tile.index < 0 || tileProperty(tileset, tile.index, 'interaction') !== kind) return;
        found.push({ tx: tile.x, ty: tile.y, tileSize: tile.width, property: (key) => tileProperty(tileset, tile.index, key) });
    });
    return found;
}
