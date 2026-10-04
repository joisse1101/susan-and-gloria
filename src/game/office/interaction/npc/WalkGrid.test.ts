import { describe, expect, it } from 'vitest';
import { WalkGrid } from './WalkGrid';
import { makeGrid } from './testGrid';

const CLEAR = { side: 2, up: 1, down: 1 };
const walkableAt = (grid: WalkGrid, col: number, row: number) => grid.isWalkable(col, row);

describe('WalkGrid footprint', () => {
    const solids = [{ x: 64, y: 40, w: 24, h: 30 }, { x: 150, y: 90, w: 8, h: 8 }, { x: 0, y: 150, w: 400, h: 10 }];

    it('the default footprint is the old walker rule: the cell and one neighbour either side free', () => {
        const grid = makeGrid(30, 25, solids);
        for (let cy = 0; cy < grid.rows; cy++) {
            for (let cx = 0; cx < grid.cols; cx++) {
                const old = !grid.isBlocked(cx - 1, cy) && !grid.isBlocked(cx, cy) && !grid.isBlocked(cx + 1, cy);
                expect(grid.isWalkable(cx, cy)).toBe(old);
            }
        }
    });

    it('cells near the world border are blocked for every footprint', () => {
        for (const footprint of [undefined, CLEAR, { side: 3, up: 2, down: 2 }]) {
            const grid = makeGrid(20, 15, [], footprint);
            // the default footprint is one row tall, so only the taller ones lose the top and bottom rows
            if (footprint) {
                for (let i = 0; i < 20; i++) {
                    expect(walkableAt(grid, i, 0)).toBe(false);
                    expect(walkableAt(grid, i, 14)).toBe(false);
                }
            }
            for (let i = 0; i < 15; i++) {
                expect(walkableAt(grid, 0, i)).toBe(false);
                expect(walkableAt(grid, 19, i)).toBe(false);
            }
        }
    });

    it('a 16 px corridor passes the walker but not the chair', () => {
        const solids16 = [{ x: 0, y: 0, w: 320, h: 48 }, { x: 0, y: 64, w: 320, h: 80 }]; // open rows 6 and 7
        expect(walkableAt(makeGrid(40, 18, solids16), 20, 6)).toBe(true);
        const clear = makeGrid(40, 18, solids16, CLEAR);
        for (const row of [5, 6, 7, 8]) expect(walkableAt(clear, 20, row)).toBe(false);
    });

    it('a 32 px aisle passes both', () => {
        const aisle = [{ x: 0, y: 0, w: 320, h: 48 }, { x: 0, y: 80, w: 320, h: 64 }]; // open rows 6..9
        expect(walkableAt(makeGrid(40, 18, aisle), 20, 7)).toBe(true);
        expect(walkableAt(makeGrid(40, 18, aisle, CLEAR), 20, 7)).toBe(true);
    });

    it('keeps the chair away from a desk corner the walker may pass', () => {
        const corner = [{ x: 160, y: 80, w: 64, h: 64 }]; // cells 20..27 x 10..17
        const thin = makeGrid(40, 30, corner);
        const clear = makeGrid(40, 30, corner, CLEAR);
        // diagonal to the corner: one cell above-left of the desk's top-left cell
        expect(walkableAt(thin, 18, 9)).toBe(true);
        expect(walkableAt(clear, 18, 9)).toBe(false);
        expect(walkableAt(clear, 14, 9)).toBe(true);
    });
});
