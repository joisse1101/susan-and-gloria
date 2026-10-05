// Placing maps side by side by their join tiles. Pure: works on the parsed Tiled JSON, no Phaser.

// Tiled tile property marking the wall tile where two maps meet
export const JOIN_PROPERTY = 'isJoin';
// The top bits of a Tiled gid carry the flip/rotate flags
const GID_MASK = 0x1fffffff;

export type Cell = { col: number; row: number };

export type TiledMapData = {
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    layers: { data?: number[] }[];
    tilesets: { firstgid: number; tiles?: { id: number; properties?: { name: string; value: unknown }[] }[] }[];
};

// The cells of every tile (on any layer) whose tileset entry has isJoin = true
export function joinCells(map: TiledMapData): Cell[] {
    const ids = new Set<number>();
    for (const ts of map.tilesets) {
        for (const t of ts.tiles ?? []) {
            if (t.properties?.some((p) => p.name === JOIN_PROPERTY && p.value === true)) ids.add(ts.firstgid + t.id);
        }
    }
    const cells: Cell[] = [];
    for (const layer of map.layers) {
        layer.data?.forEach((gid, i) => {
            if (ids.has(gid & GID_MASK)) cells.push({ col: i % map.width, row: Math.floor(i / map.width) });
        });
    }
    return cells;
}

// The offset (px) that puts `ownJoin` in the cell directly left of `neighbourJoin`, on the same row, so the two maps
// share no cell. Assumes the own map is left of the neighbour (the keep-out in Chairs.ts relies on it too).
export function placeBeside(neighbourJoin: Cell, ownJoin: Cell, tile: { w: number; h: number }): { x: number; y: number } {
    return { x: (neighbourJoin.col - 1 - ownJoin.col) * tile.w, y: (neighbourJoin.row - ownJoin.row) * tile.h };
}

// The join a map shows its right-hand neighbour (the rightmost one), or its left-hand neighbour (the leftmost)
export function rightmostJoin(cells: Cell[], mapName: string): Cell {
    if (cells.length === 0) throw new Error(`${mapName} map has no ${JOIN_PROPERTY} tile`);
    return cells.reduce((a, b) => (b.col > a.col ? b : a));
}
export function leftmostJoin(cells: Cell[], mapName: string): Cell {
    if (cells.length === 0) throw new Error(`${mapName} map has no ${JOIN_PROPERTY} tile`);
    return cells.reduce((a, b) => (b.col < a.col ? b : a));
}
