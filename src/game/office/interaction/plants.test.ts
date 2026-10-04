import { describe, expect, it } from 'vitest';
import { mergePlants, reachZone } from './plants';

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
