import { describe, expect, it } from 'vitest';
import { buildDesks } from './desks';
import { MAX_DESK_PX, WORK_RANGE_PX } from './workTuning';
import { rectToPx } from '../zones';
import { WorkSlots } from './WorkSlots';

const block = (x: number, y: number, w: number, h: number) =>
    Array.from({ length: w * h }, (_, i) => ({ tx: x + (i % w), ty: y + Math.floor(i / w) }));

describe('buildDesks', () => {
    it('makes a 2x2 block of 16 px tiles one desk', () => {
        const desks = buildDesks(block(10, 14, 2, 2), 16);
        expect(desks).toHaveLength(1);
        expect(desks[0].rect).toEqual({ x0: 10, y0: 14, x1: 12, y1: 16 });
    });

    it('keeps neighbouring 32 px tiles as separate desks, ids "tx,ty" as before', () => {
        const desks = buildDesks([{ tx: 5, ty: 7 }, { tx: 6, ty: 7 }, { tx: 20, ty: 3 }], 32);
        expect(desks.map((d) => d.id).sort()).toEqual(['20,3', '5,7', '6,7']);
    });

    it('cuts a 64 px run into two desks and caps each at MAX_DESK_PX', () => {
        for (const size of [32, 16]) {
            const desks = buildDesks(block(0, 0, 64 / size, 1), size);
            expect(desks).toHaveLength(2);
            for (const d of desks) {
                const r = rectToPx(d.rect, size);
                expect(r.x1 - r.x0).toBeLessThanOrEqual(MAX_DESK_PX);
            }
        }
    });

    it('makes the same number of desks on a finer grid', () => {
        const coarse = buildDesks([{ tx: 2, ty: 2 }, { tx: 8, ty: 2 }], 32);
        const fine = buildDesks([...block(4, 4, 2, 2), ...block(16, 4, 2, 2)], 16);
        expect(fine).toHaveLength(coarse.length);
    });

    it('has a side zone as long as the desk edge and WORK_RANGE_PX deep, at both tile sizes', () => {
        for (const size of [32, 16]) {
            const k = 32 / size;
            const [desk] = buildDesks(block(4 * k, 4 * k, k, k), size);
            const left = rectToPx(desk.sides[0].zone, size); // SIDES[0] is left
            expect(left).toEqual({ x0: 128 - WORK_RANGE_PX, y0: 128, x1: 128, y1: 160 });
            const down = rectToPx(desk.sides[3].zone, size);
            expect(down).toEqual({ x0: 128, y0: 160, x1: 160, y1: 160 + WORK_RANGE_PX });
        }
    });

    it('counts the same cell on two layers once', () => {
        expect(buildDesks([{ tx: 1, ty: 1 }, { tx: 1, ty: 1 }], 32)).toHaveLength(1);
    });
});

describe('desk slots', () => {
    it('lets one person hold a desk made of four tiles', () => {
        const [desk] = buildDesks(block(0, 0, 2, 2), 16);
        const slots = new WorkSlots();
        expect(slots.claim(desk.id, 'susan')).toBe(true);
        expect(slots.claim(desk.id, 'gloria')).toBe(false);
    });

    it('lets two people hold the two desks cut from a 64 px run', () => {
        const desks = buildDesks(block(0, 0, 4, 2), 16);
        expect(desks).toHaveLength(2);
        const slots = new WorkSlots();
        expect(slots.claim(desks[0].id, 'susan')).toBe(true);
        expect(slots.claim(desks[1].id, 'gloria')).toBe(true);
    });
});
