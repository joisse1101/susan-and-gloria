import { describe, expect, it } from 'vitest';
import { facingFor, spotAgainst, spotFor } from './deskSpot';

const TILE = 32;
const HALF_W = 6;
const HALF_H = 4;
const at = (dx: number, dy: number) => ({ tx: 5, ty: 7, dir: { dx, dy } });

describe('spotFor', () => {
    it('stands above a desk whose zone is up', () => {
        expect(spotFor(at(0, -1), TILE, HALF_W, HALF_H, 5 * TILE + 10)).toEqual({ x: 5 * TILE + 10, y: 7 * TILE - HALF_H });
    });

    it('stands below a desk whose zone is down', () => {
        expect(spotFor(at(0, 1), TILE, HALF_W, HALF_H, 5 * TILE + 10)).toEqual({ x: 5 * TILE + 10, y: 8 * TILE + HALF_H });
    });

    it('stands left of a desk whose zone is left, bottom edges level', () => {
        expect(spotFor(at(-1, 0), TILE, HALF_W, HALF_H, 0)).toEqual({ x: 5 * TILE - HALF_W, y: 8 * TILE - HALF_H });
    });

    it('stands right of a desk whose zone is right, bottom edges level', () => {
        expect(spotFor(at(1, 0), TILE, HALF_W, HALF_H, 0)).toEqual({ x: 6 * TILE + HALF_W, y: 8 * TILE - HALF_H });
    });

    it('clamps the position along an up/down tile to the tile edge', () => {
        expect(spotFor(at(0, -1), TILE, HALF_W, HALF_H, 0).x).toBe(5 * TILE);
        expect(spotFor(at(0, -1), TILE, HALF_W, HALF_H, 999).x).toBe(6 * TILE);
    });

    it('uses the tile centre when the tile has no direction', () => {
        expect(spotFor({ tx: 5, ty: 7 }, TILE, HALF_W, HALF_H, 0)).toEqual({ x: 5.5 * TILE, y: 7.5 * TILE });
    });
});

describe('spotAgainst', () => {
    // a 2x1 tile rectangle at tiles 5-6, row 7
    const rect = { x0: 5, y0: 7, x1: 7, y1: 8 };

    it('stands flush on each side of a rectangle', () => {
        expect(spotAgainst(rect, { dx: -1, dy: 0 }, TILE, HALF_W, HALF_H, 0)).toEqual({ x: 5 * TILE - HALF_W, y: 8 * TILE - HALF_H });
        expect(spotAgainst(rect, { dx: 1, dy: 0 }, TILE, HALF_W, HALF_H, 0)).toEqual({ x: 7 * TILE + HALF_W, y: 8 * TILE - HALF_H });
        expect(spotAgainst(rect, { dx: 0, dy: -1 }, TILE, HALF_W, HALF_H, 6 * TILE)).toEqual({ x: 6 * TILE, y: 7 * TILE - HALF_H });
        expect(spotAgainst(rect, { dx: 0, dy: 1 }, TILE, HALF_W, HALF_H, 6 * TILE)).toEqual({ x: 6 * TILE, y: 8 * TILE + HALF_H });
    });

    it('clamps the position along the whole width of a wide rectangle', () => {
        expect(spotAgainst(rect, { dx: 0, dy: 1 }, TILE, HALF_W, HALF_H, 0).x).toBe(5 * TILE);
        expect(spotAgainst(rect, { dx: 0, dy: 1 }, TILE, HALF_W, HALF_H, 999).x).toBe(7 * TILE);
    });

    it("uses the rectangle's centre with no side", () => {
        expect(spotAgainst(rect, undefined, TILE, HALF_W, HALF_H, 0)).toEqual({ x: 6 * TILE, y: 7.5 * TILE });
    });
});

describe('spotAgainst along a side edge', () => {
    const rect = { x0: 5, y0: 6, x1: 7, y1: 9 }; // three tiles tall
    it('follows the given height instead of the bottom edge', () => {
        const y = 7.5 * TILE;
        expect(spotAgainst(rect, { dx: -1, dy: 0 }, TILE, HALF_W, HALF_H, 0, y)).toEqual({ x: 5 * TILE - HALF_W, y });
    });

    it('clamps to the edge', () => {
        expect(spotAgainst(rect, { dx: 1, dy: 0 }, TILE, HALF_W, HALF_H, 0, 0).y).toBe(6 * TILE + HALF_H);
        expect(spotAgainst(rect, { dx: 1, dy: 0 }, TILE, HALF_W, HALF_H, 0, 99 * TILE).y).toBe(9 * TILE - HALF_H);
    });
});

describe('facingFor', () => {
    it('faces the desk from each side', () => {
        expect(facingFor({ dx: 0, dy: -1 })).toBe('down');
        expect(facingFor({ dx: 0, dy: 1 })).toBe('up');
        expect(facingFor({ dx: -1, dy: 0 })).toBe('right');
        expect(facingFor({ dx: 1, dy: 0 })).toBe('left');
    });

    it('has no facing without a direction', () => {
        expect(facingFor(undefined)).toBeUndefined();
    });
});
