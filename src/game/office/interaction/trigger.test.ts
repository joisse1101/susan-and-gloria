import { describe, expect, it } from 'vitest';
import { Cooldowns, shouldStart, stillBlocked, type StartInput } from './trigger';

const input = (over: Partial<StartInput> = {}): StartInput => ({
    inReach: true,
    interrupted: false,
    onCooldown: false,
    free: true,
    stillRequired: false,
    standingStill: false,
    ...over
});

describe('shouldStart', () => {
    it('starts when every condition holds', () => {
        expect(shouldStart(input())).toBe(true);
    });

    it.each([
        ['out of reach', { inReach: false }],
        ['interrupted', { interrupted: true }],
        ['on cooldown', { onCooldown: true }],
        ['held by someone else', { free: false }]
    ])('does not start: %s', (_, over) => {
        expect(shouldStart(input(over))).toBe(false);
    });

    it('lets a coworker start while walking', () => {
        expect(shouldStart(input({ stillRequired: false, standingStill: false }))).toBe(true);
    });

    it('makes the player stand still', () => {
        expect(shouldStart(input({ stillRequired: true, standingStill: false }))).toBe(false);
        expect(shouldStart(input({ stillRequired: true, standingStill: true }))).toBe(true);
    });
});

describe('Cooldowns', () => {
    it('rests until the time has passed', () => {
        const c = new Cooldowns<string>();
        c.start('plant', 1000, 500);
        expect(c.isCoolingDown('plant', 1499)).toBe(true);
        expect(c.isCoolingDown('plant', 1500)).toBe(false);
    });

    it('blocks every actor on one plant but not another plant', () => {
        const c = new Cooldowns<string>();
        c.start('plant-a', 0, 1000);
        expect(c.isCoolingDown('plant-a', 10)).toBe(true); // whoever asks
        expect(c.isCoolingDown('plant-b', 10)).toBe(false);
    });

    it('keeps a coworker\'s work rest apart from another coworker', () => {
        const c = new Cooldowns<string>();
        c.start('susan', 0, 1000);
        expect(c.isCoolingDown('gloria', 10)).toBe(false);
    });

    it('is cleared on demand, and a zero cooldown never rests', () => {
        const c = new Cooldowns<string>();
        c.start('susan', 0, 1000);
        c.clear('susan');
        expect(c.isCoolingDown('susan', 10)).toBe(false);
        c.start('susan', 0, 0);
        expect(c.isCoolingDown('susan', 0)).toBe(false);
    });
});

describe('stillBlocked (the player must leave reach after it ended)', () => {
    it('stays set while they remain in reach', () => {
        expect(stillBlocked(true, true, true)).toBe(true);
    });

    it('clears once they have left reach', () => {
        expect(stillBlocked(true, false, true)).toBe(false);
    });

    it('is not cleared while they are mid-interaction outside reach', () => {
        expect(stillBlocked(true, false, false)).toBe(true);
    });

    it('stays clear when nothing ended', () => {
        expect(stillBlocked(false, true, true)).toBe(false);
    });
});
