import { describe, expect, it } from 'vitest';
import { containsPx, growRect, groupTiles, rectToPx, sideStrip, SIDES, SIDE_DIRS, splitToMax, scanInteractionTiles, tileProperty, tileRect, type GroupCell } from './zones';

const TILE = 32;

describe('rectangles', () => {
    it('converts tile units to px', () => {
        expect(rectToPx({ x0: 1, y0: 2, x1: 3.5, y1: 4 }, TILE)).toEqual({ x0: 32, y0: 64, x1: 112, y1: 128 });
    });

    it('covers a whole tile', () => {
        expect(tileRect(5, 7)).toEqual({ x0: 5, y0: 7, x1: 6, y1: 8 });
    });

    it('contains a point inside, on the edge, and not outside', () => {
        const r = { x0: 1, y0: 1, x1: 2, y1: 2 };
        expect(containsPx(r, TILE, 48, 48)).toBe(true);
        expect(containsPx(r, TILE, 32, 64)).toBe(true);
        expect(containsPx(r, TILE, 31, 48)).toBe(false);
        expect(containsPx(r, TILE, 48, 65)).toBe(false);
    });
});

describe('tileProperty', () => {
    it('reads Phaser\'s {name: value} form', () => {
        const tileset = { firstgid: 1, tileProperties: { 4: { interaction: 'water' } } };
        expect(tileProperty(tileset, 5, 'interaction')).toBe('water');
        expect(tileProperty(tileset, 5, 'direction')).toBeUndefined();
    });

    it('reads Tiled\'s [{name, value}] form', () => {
        const tileset = { firstgid: 1, tileProperties: { 4: [{ name: 'interaction', value: 'work' }, { name: 'direction', value: 'up' }] } };
        expect(tileProperty(tileset, 5, 'interaction')).toBe('work');
        expect(tileProperty(tileset, 5, 'direction')).toBe('up');
    });

    it('is undefined for a tile with no properties', () => {
        expect(tileProperty({ firstgid: 1, tileProperties: {} }, 9, 'interaction')).toBeUndefined();
    });
});

describe('scanInteractionTiles', () => {
    const tiles = [
        { index: 5, x: 2, y: 3, width: TILE },
        { index: 6, x: 4, y: 3, width: TILE },
        { index: -1, x: 0, y: 0, width: TILE }
    ];
    const layer = { forEachTile: (cb: (t: (typeof tiles)[number]) => void) => tiles.forEach(cb) } as never;

    it('finds the tiles of one kind, in either property format', () => {
        const tileset = { firstgid: 1, tileProperties: { 4: { interaction: 'water' }, 5: [{ name: 'interaction', value: 'work' }] } } as never;
        expect(scanInteractionTiles(layer, tileset, 'water').map((t) => [t.tx, t.ty])).toEqual([[2, 3]]);
        expect(scanInteractionTiles(layer, tileset, 'work').map((t) => [t.tx, t.ty, t.tileSize])).toEqual([[4, 3, TILE]]);
    });

    it('lets the caller read another property of the tile', () => {
        const tileset = { firstgid: 1, tileProperties: { 4: { interaction: 'work', direction: 'left' } } } as never;
        expect(scanInteractionTiles(layer, tileset, 'work')[0].property('direction')).toBe('left');
    });

    it('skips empty tiles', () => {
        const tileset = { firstgid: 1, tileProperties: { '-2': { interaction: 'work' } } } as never;
        expect(scanInteractionTiles(layer, tileset, 'work')).toEqual([]);
    });
});

const cells = (...xy: [number, number][]): GroupCell[] => xy.map(([tx, ty]) => ({ tx, ty }));

describe('groupTiles', () => {
    it('makes one group of a single tile, id from its top-left', () => {
        const [g, ...rest] = groupTiles(cells([3, 4]));
        expect(rest).toEqual([]);
        expect(g.id).toBe('3,4');
        expect(g.rect).toEqual({ x0: 3, y0: 4, x1: 4, y1: 5 });
    });

    it('merges a 2x2 block', () => {
        const groups = groupTiles(cells([2, 2], [3, 2], [2, 3], [3, 3]));
        expect(groups).toHaveLength(1);
        expect(groups[0].rect).toEqual({ x0: 2, y0: 2, x1: 4, y1: 4 });
    });

    it('counts the same cell on two layers once', () => {
        const [g] = groupTiles(cells([5, 5], [5, 5]));
        expect(g.cells).toHaveLength(1);
    });

    it('merges an L-shape into its bounding rectangle', () => {
        const groups = groupTiles(cells([0, 0], [0, 1], [0, 2], [1, 2]));
        expect(groups).toHaveLength(1);
        expect(groups[0].rect).toEqual({ x0: 0, y0: 0, x1: 2, y1: 3 });
    });

    it('keeps separate groups apart, including diagonal neighbours', () => {
        expect(groupTiles(cells([0, 0], [1, 1], [9, 9]))).toHaveLength(3);
    });

    it('does not depend on the order of the cells', () => {
        const a = groupTiles(cells([4, 4], [5, 4], [4, 5], [5, 5], [9, 9]));
        const b = groupTiles(cells([9, 9], [5, 5], [4, 5], [5, 4], [4, 4]));
        const rects = (gs: ReturnType<typeof groupTiles>) => gs.map((g) => `${g.id}:${JSON.stringify(g.rect)}`).sort();
        expect(rects(a)).toEqual(rects(b));
    });

    it('takes the first direction found on any cell', () => {
        const [g] = groupTiles([{ tx: 1, ty: 1 }, { tx: 1, ty: 2, direction: 'up' }]);
        expect(g.direction).toBe('up');
    });
});

describe('splitToMax', () => {
    const run = (n: number, m = 1) => cells(...Array.from({ length: n * m }, (_, i) => [i % n, Math.floor(i / n)] as [number, number]));
    const split = (c: GroupCell[], max: number, size: number) => groupTiles(c).flatMap((g) => splitToMax(g, max, size)).map((g) => g.rect).sort((a, b) => a.x0 - b.x0 || a.y0 - b.y0);

    it('keeps one 32 px tile as one desk', () => {
        expect(split(run(1), 32, 32)).toEqual([{ x0: 0, y0: 0, x1: 1, y1: 1 }]);
    });

    it('keeps a 2x2 block of 16 px tiles as one desk', () => {
        expect(split(run(2, 2), 32, 16)).toEqual([{ x0: 0, y0: 0, x1: 2, y1: 2 }]);
    });

    it('cuts a 64 px run into two', () => {
        expect(split(run(2), 32, 32)).toEqual([{ x0: 0, y0: 0, x1: 1, y1: 1 }, { x0: 1, y0: 0, x1: 2, y1: 1 }]);
        expect(split(run(4), 32, 16)).toEqual([{ x0: 0, y0: 0, x1: 2, y1: 1 }, { x0: 2, y0: 0, x1: 4, y1: 1 }]);
    });

    it('cuts a 48 px run into 32 + 16', () => {
        expect(split(run(3), 32, 16)).toEqual([{ x0: 0, y0: 0, x1: 2, y1: 1 }, { x0: 2, y0: 0, x1: 3, y1: 1 }]);
    });

    it('cuts both axes of an L-shape', () => {
        const l = cells([0, 0], [0, 1], [0, 2], [1, 2], [2, 2]); // 16 px tiles: 3 wide, 3 tall
        expect(split(l, 32, 16)).toEqual([{ x0: 0, y0: 0, x1: 1, y1: 2 }, { x0: 0, y0: 2, x1: 2, y1: 3 }, { x0: 2, y0: 2, x1: 3, y1: 3 }]);
    });

    it('gives the same shapes wherever the run sits on the map', () => {
        const at = (ox: number, oy: number) => split(run(3).map((c) => ({ tx: c.tx + ox, ty: c.ty + oy })), 32, 16)
            .map((r) => ({ w: r.x1 - r.x0, h: r.y1 - r.y0 }));
        expect(at(7, 3)).toEqual(at(0, 0));
        expect(at(8, 5)).toEqual(at(0, 0));
    });
});

describe('growRect and sideStrip', () => {
    const rect = { x0: 4, y0: 2, x1: 6, y1: 3 };
    it.each([32, 16])('are the same size in px at tile size %i', (size) => {
        const k = 32 / size;
        const r = { x0: 4 * k, y0: 2 * k, x1: 6 * k, y1: 3 * k };
        expect(rectToPx(growRect(r, 16, size), size)).toEqual({ x0: 112, y0: 48, x1: 208, y1: 112 });
        expect(rectToPx(sideStrip(r, SIDE_DIRS.right, 24, size), size)).toEqual({ x0: 192, y0: 64, x1: 216, y1: 96 });
    });

    it('spans the whole edge on each side', () => {
        expect(sideStrip(rect, SIDE_DIRS.left, 16, 32)).toEqual({ x0: 3.5, y0: 2, x1: 4, y1: 3 });
        expect(sideStrip(rect, SIDE_DIRS.right, 16, 32)).toEqual({ x0: 6, y0: 2, x1: 6.5, y1: 3 });
        expect(sideStrip(rect, SIDE_DIRS.up, 16, 32)).toEqual({ x0: 4, y0: 1.5, x1: 6, y1: 2 });
        expect(sideStrip(rect, SIDE_DIRS.down, 16, 32)).toEqual({ x0: 4, y0: 3, x1: 6, y1: 3.5 });
    });

    it('lists the four sides', () => {
        expect(SIDES).toHaveLength(4);
    });
});
