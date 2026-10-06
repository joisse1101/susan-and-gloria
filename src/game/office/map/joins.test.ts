import { describe, expect, it } from 'vitest';
import { joinCells, leftmostJoin, placeBeside, rightmostJoin, type TiledMapData } from './joins';

const FLIP_H = 0x80000000;
const tilesets = [{ firstgid: 1, tiles: [{ id: 9, properties: [{ name: 'isJoin', value: true }] }, { id: 3, properties: [{ name: 'other', value: true }] }] }];
// 3x2 map; the join gid is 10 (firstgid 1 + id 9)
const map = (layers: number[][]): TiledMapData => ({ width: 3, height: 2, tilewidth: 16, tileheight: 16, tilesets, layers: layers.map((data) => ({ data })) });

describe('joinCells', () => {
    it('finds the one join', () => {
        expect(joinCells(map([[0, 0, 0, 0, 10, 0]]))).toEqual([{ col: 1, row: 1 }]);
    });
    it('is empty when there is no join', () => {
        expect(joinCells(map([[0, 4, 4, 0, 0, 0]]))).toEqual([]);
    });
    it('ignores tiles with other properties', () => {
        expect(joinCells(map([[4, 0, 0, 0, 0, 0]]))).toEqual([]);
    });
    it('strips the flip bits from a gid', () => {
        expect(joinCells(map([[(10 | FLIP_H) >>> 0, 0, 0, 0, 0, 0]]))).toEqual([{ col: 0, row: 0 }]);
    });
    it('finds joins on several layers', () => {
        expect(joinCells(map([[10, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 10]]))).toEqual([{ col: 0, row: 0 }, { col: 2, row: 1 }]);
    });
    it('copes with layers that have no data (object layers)', () => {
        expect(joinCells({ ...map([]), layers: [{}] })).toEqual([]);
    });
});

describe('placeBeside', () => {
    const tile = { w: 16, h: 16 };
    it('puts the bathroom join (19,13) just left of the office join (0,12)', () => {
        const offset = placeBeside({ col: 0, row: 12 }, { col: 19, row: 13 }, tile);
        expect(offset).toEqual({ x: -20 * 16, y: -1 * 16 });
        // the own join lands at col -1, row 12
        expect((19 * 16 + offset.x) / 16).toBe(-1);
        expect((13 * 16 + offset.y) / 16).toBe(12);
    });
    it('follows a moved door', () => {
        expect(placeBeside({ col: 0, row: 12 }, { col: 19, row: 5 }, tile)).toEqual({ x: -320, y: 7 * 16 });
    });
    it('leaves no shared cell: the own map ends before the neighbour join column', () => {
        const offset = placeBeside({ col: 2, row: 4 }, { col: 19, row: 4 }, tile);
        const firstColumnAfterOwnMap = (20 * 16 + offset.x) / 16;
        expect(firstColumnAfterOwnMap).toBe(2);
    });
});

describe('join choice', () => {
    it('takes the rightmost / leftmost', () => {
        const cells = [{ col: 2, row: 0 }, { col: 7, row: 3 }, { col: 4, row: 1 }];
        expect(rightmostJoin(cells, 'Bathroom')).toEqual({ col: 7, row: 3 });
        expect(leftmostJoin(cells, 'Office')).toEqual({ col: 2, row: 0 });
    });
    it('names the map when it has no join', () => {
        expect(() => rightmostJoin([], 'Bathroom')).toThrow(/Bathroom/);
        expect(() => leftmostJoin([], 'Office')).toThrow(/Office/);
    });
});
