import { describe, expect, it } from 'vitest';
import { clipAboveCut, easeAlpha, findWalkBehindObjects, isBehind, openStripPx, splitAtColumns } from './walkBehind';

describe('openStripPx', () => {
    it('is 16 for 32 and 48 px objects', () => {
        expect(openStripPx(32)).toBe(16);
        expect(openStripPx(48)).toBe(16);
    });
    it('is 10 for a 16 px object', () => {
        expect(openStripPx(16)).toBe(10);
    });
});

describe('findWalkBehindObjects (8 px cells)', () => {
    const find = (solid: boolean[][]) => findWalkBehindObjects(solid, 8, 8);

    it('opens 16, 8 and 0 px for runs of 4, 2 and 1 cells', () => {
        expect(find([[true], [true], [true], [true]])[0].openDepth).toBe(16);
        expect(find([[true], [true]])[0].openDepth).toBe(8);
        expect(find([[true]])[0].openDepth).toBe(0);
    });

    it('opens 16 px for a run of 3 cells', () => {
        expect(find([[true], [true], [true]])[0].openDepth).toBe(16);
    });

    it('treats a column run as one object based at the bottom cell', () => {
        expect(find([[false], [true], [true], [true], [true], [false]])).toEqual([
            { bounds: { x: 0, y: 8, w: 8, h: 32 }, baseY: 40, openDepth: 16 }
        ]);
    });

    it('keeps separate columns separate', () => {
        const objects = find([[true, true], [true, false]]);
        expect(objects).toHaveLength(2);
        expect(objects.map((o) => o.baseY).sort((a, b) => a - b)).toEqual([8, 16]);
    });

    it('splits a column at a one-cell gap', () => {
        const objects = find([[true], [true], [false], [true], [true]]);
        expect(objects.map((o) => [o.bounds.y, o.baseY])).toEqual([[0, 16], [24, 40]]);
    });

    it('finds nothing in an empty grid', () => {
        expect(find([[false, false]])).toEqual([]);
    });
});

describe('splitAtColumns', () => {
    it('splits at multiples of the cell size', () => {
        expect(splitAtColumns({ x: 4, y: 2, w: 16, h: 3 }, 8)).toEqual([
            { x: 4, y: 2, w: 4, h: 3 },
            { x: 8, y: 2, w: 8, h: 3 },
            { x: 16, y: 2, w: 4, h: 3 }
        ]);
    });
    it('keeps a rect inside one column whole', () => {
        expect(splitAtColumns({ x: 8, y: 0, w: 8, h: 8 }, 8)).toEqual([{ x: 8, y: 0, w: 8, h: 8 }]);
    });
});

describe('clipAboveCut', () => {
    // tile at y 32..48, cut at map y 42 -> tile-local y 10
    const clip = (rects: { x: number; y: number; w: number; h: number }[]) => clipAboveCut(rects, 32, 42);

    it('drops a rect fully above the cut', () => {
        expect(clip([{ x: 0, y: 0, w: 16, h: 10 }])).toEqual([]);
    });
    it('trims a rect straddling the cut', () => {
        expect(clip([{ x: 2, y: 4, w: 8, h: 10 }])).toEqual([{ x: 2, y: 10, w: 8, h: 4 }]);
    });
    it('keeps a rect below the cut', () => {
        expect(clip([{ x: 0, y: 12, w: 16, h: 4 }])).toEqual([{ x: 0, y: 12, w: 16, h: 4 }]);
    });
    it('changes nothing when the cut is at or above the tile top', () => {
        expect(clipAboveCut([{ x: 0, y: 0, w: 16, h: 16 }], 32, 32)).toEqual([{ x: 0, y: 0, w: 16, h: 16 }]);
    });
});

describe('isBehind', () => {
    const object = { bounds: { x: 32, y: 32, w: 16, h: 32 }, baseY: 64, openDepth: 16 };
    const walker = (feetY: number, x = 36, y = feetY - 40) => ({ feetY, bounds: { x, y, w: 20, h: 44 } });

    it('is true with feet above the base line and the sprite overlapping', () => {
        expect(isBehind(object, [walker(50)])).toBe(true);
    });
    it('is false once the feet pass the base line', () => {
        expect(isBehind(object, [walker(64)])).toBe(false);
        expect(isBehind(object, [walker(80)])).toBe(false);
    });
    it('is false beside the object', () => {
        expect(isBehind(object, [walker(50, 100)])).toBe(false);
    });
    it('is false when the sprite is entirely above', () => {
        expect(isBehind(object, [{ feetY: 20, bounds: { x: 36, y: -24, w: 20, h: 44 } }])).toBe(false);
    });
    it('is true if any walker is behind', () => {
        expect(isBehind(object, [walker(80), walker(50)])).toBe(true);
    });
});

describe('easeAlpha', () => {
    it('moves towards the target without overshooting', () => {
        expect(easeAlpha(1, 0.45, 15, 150)).toBeCloseTo(0.9);
        expect(easeAlpha(0.5, 0.45, 150, 150)).toBe(0.45);
        expect(easeAlpha(0.45, 1, 15, 150)).toBeCloseTo(0.55);
        expect(easeAlpha(0.95, 1, 150, 150)).toBe(1);
    });
    it('jumps at fadeMs 0', () => {
        expect(easeAlpha(1, 0.4, 16, 0)).toBe(0.4);
    });
});
