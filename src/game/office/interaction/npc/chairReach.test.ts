import { describe, expect, it } from 'vitest';
import { cellOf, chairsInReach, FETCH_RANGE, inReachByRoute, MAX_CHAIR_ROUTE_TILES, pathCells, planChairFetch } from './chairReach';
import { makeGrid } from './testGrid';

const free = (x: number, y: number, claimed = false) => ({ x, y, claimed });

describe('chairsInReach', () => {
    it('gives the route length in tiles for a chair in reach', () => {
        const grid = makeGrid(40, 12);
        const [r] = chairsInReach(grid, { x: 40, y: 48 }, [free(104, 48)]);
        expect(r.reason).toBeUndefined();
        expect(r.routeTiles).toBeGreaterThan(1.5);
        expect(r.routeTiles).toBeLessThan(2.5);
    });

    it('rejects a claimed chair', () => {
        const grid = makeGrid(40, 12);
        expect(chairsInReach(grid, { x: 40, y: 48 }, [free(104, 48, true)])[0].reason).toBe('claimed');
    });

    it('rejects a chair beyond the straight-line range', () => {
        const grid = makeGrid(60, 12);
        const far = 40 + FETCH_RANGE + 8;
        expect(chairsInReach(grid, { x: 40, y: 48 }, [free(far, 48)])[0].reason).toBe('too-far');
    });

    it('rejects a chair close in a straight line but with no route', () => {
        const grid = makeGrid(40, 12, [{ x: 120, y: 0, w: 24, h: 96 }]); // full-height wall
        expect(chairsInReach(grid, { x: 60, y: 48 }, [free(170, 48)])[0].reason).toBe('no-route');
    });

    it('rejects a chair close in a straight line whose route is longer than the cap', () => {
        // wall with its only gap far below: ~35 tiles to walk for a chair 3 tiles away
        const grid = makeGrid(40, 80, [{ x: 120, y: 0, w: 24, h: 600 }]);
        const [r] = chairsInReach(grid, { x: 60, y: 40 }, [free(170, 40)]);
        expect(r.reason).toBe('route-too-long');
        expect(MAX_CHAIR_ROUTE_TILES).toBe(15);
    });

    it('prefers the chair with the shortest route over the nearest in a straight line', () => {
        // chair 0 is just behind a wall (near in a straight line, walk around); chair 1 is farther but direct
        const grid = makeGrid(40, 40, [{ x: 100, y: 0, w: 24, h: 200 }]);
        const results = chairsInReach(grid, { x: 60, y: 40 }, [free(140, 40), free(60, 140)]);
        expect(results[0].routeTiles).toBeDefined(); // in reach, but the long way round
        expect(inReachByRoute(results).map((r) => r.index)).toEqual([1, 0]);
    });

    it('keeps one result per chair, in input order', () => {
        const grid = makeGrid(40, 12);
        const results = chairsInReach(grid, { x: 40, y: 48 }, [free(104, 48), free(104, 48, true)]);
        expect(results.map((r) => r.index)).toEqual([0, 1]);
    });
});

describe('pathCells', () => {
    it('counts diagonals as the square root of two', () => {
        const cell = (cx: number, cy: number) => ({ cx, cy });
        expect(pathCells(cell(0, 0), [cell(1, 0), cell(2, 1)])).toBeCloseTo(1 + Math.SQRT2);
    });
});

describe('planChairFetch', () => {
    const spot = { x: 160, y: 120 };
    const chair = { x: 80, y: 120 };
    const npc = { x: 160, y: 120 };
    const backs = { down: { x: 0, y: -1 }, up: { x: 0, y: 1 }, right: { x: -1, y: 0 }, left: { x: 1, y: 0 } };

    for (const [facing, back] of Object.entries(backs)) {
        it(`plans both legs and parks half a tile behind the spot facing ${facing}`, () => {
            const grid = makeGrid(40, 30);
            const plan = planChairFetch(grid, npc, chair, spot, back)!;
            expect(plan).not.toBeNull();
            expect(plan.staging).toEqual({ x: spot.x + back.x * 16, y: spot.y + back.y * 16 });
            expect(plan.stagingCell).toEqual(cellOf(plan.staging));
            expect(plan.toChair.path.at(-1)).toEqual(cellOf(chair));
            expect(plan.drag.start).toEqual(cellOf(chair));
            expect(plan.drag.path.at(-1)).toEqual(plan.stagingCell);
            for (const c of [...plan.toChair.path, ...plan.drag.path]) expect(grid.isWalkable(c.cx, c.cy)).toBe(true);
        });
    }

    it('settles for a nearby reachable cell when the staging cell is blocked', () => {
        const grid = makeGrid(40, 30, [{ x: 152, y: 128, w: 16, h: 16 }]); // on the staging point behind a spot facing up
        const plan = planChairFetch(grid, npc, chair, spot, backs.up)!;
        expect(plan).not.toBeNull();
        expect(grid.isWalkable(plan.stagingCell.cx, plan.stagingCell.cy)).toBe(true);
        expect(plan.stagingCell).not.toEqual(cellOf(plan.staging));
    });

    it('returns null when the staging point has no reachable cell near it', () => {
        const grid = makeGrid(40, 30, [{ x: 120, y: 96, w: 100, h: 80 }]); // solid block over the whole spot area
        expect(planChairFetch(grid, { x: 40, y: 40 }, chair, spot, backs.up)).toBeNull();
    });

    it('returns null when the chair cannot be reached', () => {
        const grid = makeGrid(40, 30, [{ x: 200, y: 0, w: 24, h: 240 }]); // wall between the coworker and the chair
        expect(planChairFetch(grid, npc, { x: 250, y: 120 }, spot, backs.up)).toBeNull();
    });
});
