import { describe, expect, it } from 'vitest';
import { mainRegion } from './reachable';
import { makeGrid } from './testGrid';

describe('mainRegion', () => {
    it('picks the larger of two separate areas', () => {
        // a full-height wall at x 160..168 splits the floor; the left side is bigger
        const grid = makeGrid(40, 20, [{ x: 160, y: 0, w: 8, h: 160 }]);
        const region = mainRegion(grid);
        expect(region.size).toBeGreaterThan(0);
        for (const i of region) expect(i % grid.cols).toBeLessThan(20);
    });

    it('leaves out a sealed pocket', () => {
        // a closed box of walls 8px thick, with open floor inside, in the middle of a big room
        const box = [
            { x: 160, y: 80, w: 80, h: 8 }, { x: 160, y: 152, w: 80, h: 8 },
            { x: 160, y: 80, w: 8, h: 80 }, { x: 232, y: 80, w: 8, h: 80 }
        ];
        const grid = makeGrid(50, 30, box);
        const inside = grid.isWalkable(25, 15);
        expect(inside).toBe(true);
        expect(mainRegion(grid).has(15 * grid.cols + 25)).toBe(false);
        expect(mainRegion(grid).has(5 * grid.cols + 5)).toBe(true);
    });

    it('is empty when nothing is walkable', () => {
        expect(mainRegion(makeGrid(10, 10, [{ x: 0, y: 0, w: 80, h: 80 }])).size).toBe(0);
    });
});
