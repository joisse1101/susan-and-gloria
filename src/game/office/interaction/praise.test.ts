import { describe, expect, it } from 'vitest';
import { PraiseEncounters } from './praise';

const near = { inReach: true, someoneWaters: true, canSay: true };

describe('PraiseEncounters', () => {
    it('says a line when a newcomer finds the plant being watered', () => {
        expect(new PraiseEncounters().update('susan', 'p', near)).toBe(true);
    });

    it('says it once, not again while the newcomer lingers', () => {
        const p = new PraiseEncounters();
        expect(p.update('susan', 'p', near)).toBe(true);
        expect(p.update('susan', 'p', near)).toBe(false);
        expect(p.update('susan', 'p', near)).toBe(false);
    });

    it('says it again once the newcomer has left reach and come back', () => {
        const p = new PraiseEncounters();
        p.update('susan', 'p', near);
        p.update('susan', 'p', { ...near, inReach: false });
        expect(p.update('susan', 'p', near)).toBe(true);
    });

    it('says nothing when nobody is watering', () => {
        expect(new PraiseEncounters().update('susan', 'p', { ...near, someoneWaters: false })).toBe(false);
    });

    it('does not use up the encounter while it cannot say it, so a player who stops later still does', () => {
        const p = new PraiseEncounters();
        expect(p.update('player', 'p', { ...near, canSay: false })).toBe(false);
        expect(p.update('player', 'p', near)).toBe(true);
    });

    it('keeps each newcomer and each plant separate', () => {
        const p = new PraiseEncounters();
        expect(p.update('susan', 'a', near)).toBe(true);
        expect(p.update('gloria', 'a', near)).toBe(true);
        expect(p.update('susan', 'b', near)).toBe(true);
    });
});
