import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { CELL, WalkGrid } from './WalkGrid';
import { findPath, reachableCells, toWaypoints } from './pathfinding';

// Builds a grid of `cols` x `rows` cells whose solids are given as px rects {x, y, w, h}
function makeGrid(cols: number, rows: number, solids: { x: number; y: number; w: number; h: number }[] = []) {
    const world = { x: 0, y: 0, right: cols * CELL, bottom: rows * CELL } as Phaser.Geom.Rectangle;
    const children = solids.map((s) => ({ body: { left: s.x, top: s.y, right: s.x + s.w, bottom: s.y + s.h } }));
    return new WalkGrid(world, { getChildren: () => children } as unknown as Phaser.Physics.Arcade.StaticGroup);
}

const cell = (cx: number, cy: number) => ({ cx, cy });

describe('WalkGrid', () => {
    it('blocks cells under a solid, and one cell either side of it', () => {
        const grid = makeGrid(20, 5, [{ x: 80, y: 16, w: 16, h: 8 }]); // cells 10-11, row 2
        expect(grid.isBlocked(10, 2)).toBe(true);
        expect(grid.isWalkable(9, 2)).toBe(false);
        expect(grid.isWalkable(12, 2)).toBe(false);
        expect(grid.isWalkable(8, 2)).toBe(true);
        expect(grid.isWalkable(13, 2)).toBe(true);
    });

    it('does not widen a solid vertically', () => {
        const grid = makeGrid(20, 5, [{ x: 80, y: 16, w: 16, h: 8 }]);
        expect(grid.isWalkable(10, 1)).toBe(true);
        expect(grid.isWalkable(10, 3)).toBe(true);
    });

    it('marks gaps narrower than the 24 px body as blocked', () => {
        // walls at cells 8-9 and 12-13 leave a 16 px gap (cells 10-11)
        const grid = makeGrid(24, 5, [{ x: 64, y: 0, w: 16, h: 40 }, { x: 96, y: 0, w: 16, h: 40 }]);
        expect(grid.isWalkable(10, 2)).toBe(false);
        expect(grid.isWalkable(11, 2)).toBe(false);
    });

    it('lets a 24 px gap through', () => {
        const grid = makeGrid(24, 5, [{ x: 64, y: 0, w: 16, h: 40 }, { x: 104, y: 0, w: 16, h: 40 }]); // cells 10-12 free
        expect(grid.isWalkable(11, 2)).toBe(true);
        expect(grid.isWalkable(10, 2)).toBe(false);
    });

    it('treats the map edge as blocked', () => {
        const grid = makeGrid(10, 5);
        expect(grid.isWalkable(0, 2)).toBe(false);
        expect(grid.isWalkable(1, 2)).toBe(true);
        expect(grid.isWalkable(-1, 2)).toBe(false);
    });
});

describe('reachableCells', () => {
    it('never returns cells in a walled-off area', () => {
        // full-height wall at cells 10-12 splits the room
        const grid = makeGrid(24, 5, [{ x: 80, y: 0, w: 24, h: 40 }]);
        const found = reachableCells(grid, cell(3, 2));
        expect(found.length).toBeGreaterThan(0);
        expect(found.every((c) => c.cx < 10)).toBe(true);
    });
});

describe('findPath', () => {
    it('walks around a block between start and goal and stays on walkable cells', () => {
        const grid = makeGrid(30, 12, [{ x: 96, y: 24, w: 32, h: 48 }]);
        const path = findPath(grid, cell(3, 6), cell(25, 6));
        expect(path).not.toBeNull();
        expect(path!.every((c) => grid.isWalkable(c.cx, c.cy))).toBe(true);
        expect(path![path!.length - 1]).toEqual(cell(25, 6));
    });

    it('returns null when the goal is walled off', () => {
        const grid = makeGrid(24, 5, [{ x: 80, y: 0, w: 24, h: 40 }]);
        expect(findPath(grid, cell(3, 2), cell(20, 2))).toBeNull();
    });

    it('never cuts a corner', () => {
        const grid = makeGrid(30, 12, [{ x: 96, y: 24, w: 32, h: 48 }, { x: 40, y: 40, w: 8, h: 8 }]);
        const start = cell(3, 6);
        const path = findPath(grid, start, cell(25, 3))!;
        let prev = start;
        for (const c of path) {
            if (c.cx !== prev.cx && c.cy !== prev.cy) {
                expect(grid.isWalkable(c.cx, prev.cy)).toBe(true);
                expect(grid.isWalkable(prev.cx, c.cy)).toBe(true);
            }
            prev = c;
        }
    });

    it('takes the diagonal when it is shorter', () => {
        const grid = makeGrid(30, 12);
        const path = findPath(grid, cell(3, 3), cell(8, 8))!;
        expect(path).toHaveLength(5);
    });
});

describe('toWaypoints', () => {
    it('gives one waypoint for a straight corridor', () => {
        const grid = makeGrid(30, 5);
        const path = findPath(grid, cell(3, 2), cell(20, 2))!;
        expect(toWaypoints(cell(3, 2), path)).toEqual([cell(20, 2)]);
    });

    it('keeps a waypoint at every turn', () => {
        const waypoints = toWaypoints(cell(0, 0), [cell(1, 0), cell(2, 0), cell(2, 1), cell(2, 2)]);
        expect(waypoints).toEqual([cell(2, 0), cell(2, 2)]);
    });
});
