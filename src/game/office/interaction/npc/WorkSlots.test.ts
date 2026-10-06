import { describe, expect, it } from 'vitest';
import { WorkSlots } from './WorkSlots';

describe('WorkSlots', () => {
    it('refuses a desk someone else holds', () => {
        const slots = new WorkSlots();
        expect(slots.claim('a', 'susan')).toBe(true);
        expect(slots.claim('a', 'gloria')).toBe(false);
        expect(slots.holderOf('a')).toBe('susan');
    });

    it('lets the holder claim its own desk again', () => {
        const slots = new WorkSlots();
        slots.claim('a', 'susan');
        expect(slots.claim('a', 'susan')).toBe(true);
    });

    it('gives an owner one desk at a time', () => {
        const slots = new WorkSlots();
        slots.claim('a', 'susan');
        expect(slots.claim('b', 'susan')).toBe(false);
        expect(slots.heldBy('susan')).toBe('a');
        expect(slots.isFree('b')).toBe(true);
    });

    it('frees a desk on release, and release is idempotent', () => {
        const slots = new WorkSlots();
        slots.claim('a', 'susan');
        slots.release('susan');
        slots.release('susan');
        slots.release('gloria');
        expect(slots.isFree('a')).toBe(true);
        expect(slots.claim('a', 'gloria')).toBe(true);
    });

    it('treats a desk as free for its own holder only', () => {
        const slots = new WorkSlots();
        slots.claim('a', 'susan');
        expect(slots.isFree('a')).toBe(false);
        expect(slots.isFree('a', 'susan')).toBe(true);
        expect(slots.isFree('a', 'gloria')).toBe(false);
    });

    it('picks and claims in one call, so two owners never get the same desk', () => {
        const slots = new WorkSlots();
        const first = slots.claimRandom(['a', 'b'], 'susan', () => 0);
        const second = slots.claimRandom(['a', 'b'], 'gloria', () => 0);
        expect(first).toBe('a');
        expect(second).toBe('b');
    });

    it('only picks free desks', () => {
        const slots = new WorkSlots();
        slots.claim('b', 'player');
        for (const roll of [0, 0.5, 0.999]) {
            const fresh = new WorkSlots();
            fresh.claim('b', 'player');
            expect(fresh.claimRandom(['a', 'b', 'c'], 'susan', () => roll)).not.toBe('b');
        }
    });

    it('picks nothing when every desk is held', () => {
        const slots = new WorkSlots();
        slots.claim('a', 'player');
        slots.claim('b', 'gloria');
        expect(slots.claimRandom(['a', 'b'], 'susan', () => 0)).toBeUndefined();
        expect(slots.heldBy('susan')).toBeUndefined();
    });

    it('picks nothing for an owner that already holds a desk', () => {
        const slots = new WorkSlots();
        slots.claim('a', 'susan');
        expect(slots.claimRandom(['b', 'c'], 'susan', () => 0)).toBeUndefined();
        expect(slots.heldBy('susan')).toBe('a');
    });

    it('survives an rng that returns 1', () => {
        const slots = new WorkSlots();
        expect(slots.claimRandom(['a', 'b'], 'susan', () => 1)).toBe('b');
    });

    it('lets an owner take a held desk, leaving the previous holder with nothing', () => {
        const slots = new WorkSlots();
        slots.claim('a', 'susan');
        expect(slots.take('a', 'player')).toBe('susan');
        expect(slots.holderOf('a')).toBe('player');
        expect(slots.heldBy('susan')).toBeUndefined();
        expect(slots.isFree('a', 'susan')).toBe(false);
    });

    it('drops the other desk the taker held when it takes one', () => {
        const slots = new WorkSlots();
        slots.claim('b', 'player');
        expect(slots.take('a', 'player')).toBeUndefined();
        expect(slots.heldBy('player')).toBe('a');
        expect(slots.isFree('b')).toBe(true);
    });

    it('lets another walker choose a desk that was released after a lost trip', () => {
        const slots = new WorkSlots();
        slots.claim('a', 'susan');
        expect(slots.claim('a', 'gloria')).toBe(false);
        slots.release('susan');
        expect(slots.isFree('a', 'gloria')).toBe(true);
        expect(slots.claimRandom(['a'], 'gloria', () => 0)).toBe('a');
    });
});
