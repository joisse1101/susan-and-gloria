import { describe, expect, it } from 'vitest';
import { facingFor, spotFor } from './deskSpot';

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
