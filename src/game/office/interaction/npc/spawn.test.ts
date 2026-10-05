import { describe, expect, it } from 'vitest';
import { CELL } from './WalkGrid';
import { mainRegion } from './reachable';
import { pickSpawns, spritePosForBodyCentre, type SpawnRequest } from './spawn';
import { makeGrid } from './testGrid';

const CLEAR = { side: 2, up: 1, down: 1 };
const HUMAN = { w: 22, h: 8 };
const CHAIR = { w: 28, h: 16 };
const requests: SpawnRequest[] = [
    { id: 'player', kind: 'walker', ...HUMAN }, { id: 'susan', kind: 'walker', ...HUMAN }, { id: 'gloria', kind: 'walker', ...HUMAN },
    { id: 'chair1', kind: 'chair', ...CHAIR }, { id: 'chair2', kind: 'chair', ...CHAIR }
];

// Small deterministic generator (mulberry32)
function seeded(seed: number) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// A 60x40 cell room with a desk block and a sealed pocket
const room = [
    { x: 160, y: 120, w: 64, h: 32 },
    { x: 360, y: 200, w: 80, h: 8 }, { x: 360, y: 264, w: 80, h: 8 }, { x: 360, y: 200, w: 8, h: 72 }, { x: 432, y: 200, w: 8, h: 72 }
];
const cellOf = (s: { x: number; y: number }, cols: number) => Math.floor(s.y / CELL) * cols + Math.floor(s.x / CELL);

describe('pickSpawns', () => {
    const walk = makeGrid(60, 40, room);
    const clear = makeGrid(60, 40, room, CLEAR);

    it('puts everyone on walkable floor in the main region, chairs on clear cells', () => {
        const main = mainRegion(walk);
        for (let seed = 1; seed <= 20; seed++) {
            const { spawns } = pickSpawns(walk, clear, requests, [], seeded(seed));
            expect(spawns).toHaveLength(requests.length);
            for (const s of spawns) {
                expect(main.has(cellOf(s, walk.cols))).toBe(true);
                const chair = s.id.startsWith('chair');
                const grid = chair ? clear : walk;
                expect(grid.isWalkable(Math.floor(s.x / CELL), Math.floor(s.y / CELL))).toBe(true);
            }
        }
    });

    it('keeps the gap and reports nothing when there is room', () => {
        const { spawns, notes } = pickSpawns(walk, clear, requests, [], seeded(7), 48);
        expect(notes).toEqual([]);
        for (const a of spawns) for (const b of spawns) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(48);
    });

    it('the same random source gives the same layout, a different one a different layout', () => {
        const a = pickSpawns(walk, clear, requests, [], seeded(3)).spawns;
        expect(pickSpawns(walk, clear, requests, [], seeded(3)).spawns).toEqual(a);
        expect(pickSpawns(walk, clear, requests, [], seeded(4)).spawns).not.toEqual(a);
    });

    it('a cramped grid still places everything and says the gap was relaxed', () => {
        const tiny = makeGrid(14, 5);
        const tinyClear = makeGrid(14, 5, [], CLEAR);
        const { spawns, notes } = pickSpawns(tiny, tinyClear, requests.slice(0, 3), [], seeded(1), 48);
        expect(spawns).toHaveLength(3);
        expect(notes.some((n) => n.includes('gap relaxed'))).toBe(true);
        expect(new Set(spawns.map((s) => `${s.x},${s.y}`)).size).toBe(3);
    });

    it('stays out of zones when there is room', () => {
        const zone = { x0: 0, y0: 0, x1: 240, y1: 320 }; // the left half
        for (let seed = 1; seed <= 10; seed++) {
            const { spawns, notes } = pickSpawns(walk, clear, requests, [zone], seeded(seed));
            expect(notes).toEqual([]);
            for (const s of spawns) {
                const w = s.id.startsWith('chair') ? CHAIR.w : HUMAN.w;
                expect(s.x - w / 2).toBeGreaterThanOrEqual(zone.x1);
            }
        }
    });

    it('with every cell in a zone, still places everyone and says the zone rule was relaxed', () => {
        const everything = { x0: 0, y0: 0, x1: 480, y1: 320 };
        const { spawns, notes } = pickSpawns(walk, clear, requests, [everything], seeded(2));
        expect(spawns).toHaveLength(requests.length);
        expect(notes.some((n) => n.includes('zone rule relaxed'))).toBe(true);
    });

    it('relaxes the gap before the zones', () => {
        // Room for three people outside the zone only if they stand closer than the gap: a 6-cell-wide free strip
        const strip = makeGrid(20, 6);
        const stripClear = makeGrid(20, 6, [], CLEAR);
        const zone = { x0: 0, y0: 0, x1: 40, y1: 48 }; // the left 5 cells are a zone
        const { spawns, notes } = pickSpawns(strip, stripClear, requests.slice(0, 3), [zone], seeded(5), 200);
        expect(notes.some((n) => n.includes('gap relaxed'))).toBe(true);
        expect(notes.some((n) => n.includes('zone rule relaxed'))).toBe(false);
        for (const s of spawns) expect(s.x - HUMAN.w / 2).toBeGreaterThanOrEqual(zone.x1);
    });

    it('throws when there is no floor at all', () => {
        const none = makeGrid(10, 10, [{ x: 0, y: 0, w: 80, h: 80 }]);
        expect(() => pickSpawns(none, none, requests, [], seeded(1))).toThrow();
    });
});

describe('spritePosForBodyCentre', () => {
    it('puts the body centre on the cell centre given the body offset', () => {
        // fake body: centre sits 5 right and 9 below the sprite position
        const pos = spritePosForBodyCentre(100, 60, { x: 5, y: 9 });
        expect({ x: pos.x + 5, y: pos.y + 9 }).toEqual({ x: 100, y: 60 });
    });
});
