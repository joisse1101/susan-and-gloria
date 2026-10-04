import { describe, expect, it } from 'vitest';
import { containsPx, rectToPx, scanInteractionTiles, tileProperty, tileRect } from './zones';

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
