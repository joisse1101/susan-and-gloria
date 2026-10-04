import { describe, expect, it } from 'vitest';
import { mergePlants, reachZone, solidBounds, standSide } from './plants';

describe('mergePlants', () => {
    it('merges the real map\'s tiles (14,3 on two layers and 15,3) into one plant', () => {
        const plants = mergePlants([{ tx: 14, ty: 3 }, { tx: 15, ty: 3 }, { tx: 14, ty: 3 }], 32);
        expect(plants).toHaveLength(1);
        expect(plants[0].rect).toEqual({ x0: 14, y0: 3, x1: 16, y1: 4 });
    });

    it('keeps apart cells that only touch diagonally or not at all', () => {
        expect(mergePlants([{ tx: 1, ty: 1 }, { tx: 2, ty: 2 }, { tx: 9, ty: 9 }], 32)).toHaveLength(3);
    });

    it('takes a direction from any of its cells', () => {
        const [plant] = mergePlants([{ tx: 4, ty: 4 }, { tx: 4, ty: 5, direction: 'down' }], 32);
        expect(plant.direction).toBe('down');
    });
});

describe('reachZone', () => {
    it('grows the plant by the reach on all sides', () => {
        const [plant] = mergePlants([{ tx: 14, ty: 3 }, { tx: 15, ty: 3 }], 32);
        expect(reachZone(plant, 0.5)).toEqual({ x0: 13.5, y0: 2.5, x1: 16.5, y1: 4.5 });
    });
});

describe('standSide', () => {
    const [plant] = mergePlants([{ tx: 14, ty: 3 }, { tx: 15, ty: 3 }], 32);
    it('picks the side the point is furthest outside of', () => {
        expect(standSide(plant, 15 * 32, 4 * 32 + 10)).toEqual({ dx: 0, dy: 1 });
        expect(standSide(plant, 14 * 32 - 10, 3.5 * 32)).toEqual({ dx: -1, dy: 0 });
        expect(standSide(plant, 16 * 32 + 10, 3.5 * 32)).toEqual({ dx: 1, dy: 0 });
        expect(standSide(plant, 15 * 32, 3 * 32 - 10)).toEqual({ dx: 0, dy: -1 });
    });
    it('prefers the side when the point is beside the plant, even a little below it', () => {
        expect(standSide(plant, 16 * 32 + 8, 4 * 32 + 7)).toEqual({ dx: 1, dy: 0 });
        expect(standSide(plant, 14 * 32 - 8, 4 * 32 + 7)).toEqual({ dx: -1, dy: 0 });
    });
    it('takes the nearest edge from inside the plant\'s tiles, where its narrower solid lets an actor stand', () => {
        // the real log: from (504, 101) the right edge is 8 px away, the front 27, the left 56
        expect(standSide(plant, 504, 101)).toEqual({ dx: 1, dy: 0 });
        expect(standSide(plant, 456, 101)).toEqual({ dx: -1, dy: 0 });
        expect(standSide(plant, 480, 124)).toEqual({ dx: 0, dy: 1 });
    });
    it('uses the plant\'s own direction when it has one', () => {
        expect(standSide({ ...plant, direction: 'left' }, 15 * 32, 4 * 32 + 10)).toEqual({ dx: -1, dy: 0 });
    });
});

describe('solidBounds', () => {
    const [plant] = mergePlants([{ tx: 14, ty: 3 }, { tx: 15, ty: 3 }], 32);
    it('is the union of the bodies in the plant\'s tiles, in tile units (the real map: the pots, 448-496 x 96-120)', () => {
        const bodies = [
            { left: 448, top: 96, right: 472, bottom: 120 },
            { left: 472, top: 100, right: 496, bottom: 112 }
        ];
        expect(solidBounds(plant.rect, 32, bodies)).toEqual({ x0: 14, y0: 3, x1: 15.5, y1: 3.75 });
    });
    it('clips to the plant and ignores bodies that only touch it', () => {
        const wall = { left: 0, top: 64, right: 640, bottom: 96 }; // ends where the plant begins
        const big = { left: 400, top: 90, right: 600, bottom: 110 };
        expect(solidBounds(plant.rect, 32, [wall])).toBeUndefined();
        expect(solidBounds(plant.rect, 32, [big])).toEqual({ x0: 14, y0: 3, x1: 16, y1: 3.4375 });
    });
});
