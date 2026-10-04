import { describe, expect, it } from 'vitest';
import { makeGrid } from './testGrid';
import { routeCells } from './route';

const TILE = 32;
// A 2x1 tile rectangle at tiles 8-9 (px 256-320), row 4
const rect = { x0: 8, y0: 4, x1: 10, y1: 5 };

describe('routeCells', () => {
    it('routes to the cell nearest the rectangle\'s centre', () => {
        const grid = makeGrid(50, 20);
        const route = routeCells(grid, { x: 20, y: 140 }, rect, TILE, 4)!;
        expect(route).not.toBeNull();
        expect(route.path[route.path.length - 1]).toEqual({ cx: Math.floor(9 * TILE / 8), cy: Math.floor(4.5 * TILE / 8) });
    });

    it('settles for a reachable cell near a blocked goal', () => {
        // a solid under the centre blocks the goal cell and the ones around it
        const grid = makeGrid(50, 20, [{ x: 272, y: 136, w: 32, h: 16 }]);
        const route = routeCells(grid, { x: 20, y: 140 }, rect, TILE, 4)!;
        expect(route).not.toBeNull();
        const goal = route.path[route.path.length - 1];
        expect(grid.isWalkable(goal.cx, goal.cy)).toBe(true);
    });

    it('is null when even the nearest reachable cell is too far', () => {
        const grid = makeGrid(50, 20, [{ x: 240, y: 0, w: 96, h: 160 }]); // walls the rectangle off from the left
        expect(routeCells(grid, { x: 20, y: 80 }, rect, TILE, 1)).toBeNull();
    });

    it('is null when there is no walkable start', () => {
        const grid = makeGrid(6, 6);
        expect(routeCells(grid, { x: 1000, y: 1000 }, rect, TILE, 4)).toBeNull();
    });
});
