import { describe, expect, it } from 'vitest';
import { mergePlants, reachZone, standSide } from './plants';

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
    it('uses the plant\'s own direction when it has one', () => {
        expect(standSide({ ...plant, direction: 'left' }, 15 * 32, 4 * 32 + 10)).toEqual({ dx: -1, dy: 0 });
    });
});
