import { describe, expect, it } from 'vitest';
import { JamCooldowns } from './jamCooldown';

describe('JamCooldowns', () => {
    it('blocks a chair until the cooldown ends', () => {
        const c = new JamCooldowns<object>();
        const chair = {};
        c.mark(chair, 1000, 60000);
        expect(c.isCoolingDown(chair, 1000)).toBe(true);
        expect(c.isCoolingDown(chair, 60999)).toBe(true);
    });

    it('expires after the cooldown', () => {
        const c = new JamCooldowns<object>();
        const chair = {};
        c.mark(chair, 1000, 60000);
        expect(c.isCoolingDown(chair, 61000)).toBe(false);
    });

    it('a cooldown of 0 never blocks', () => {
        const c = new JamCooldowns<object>();
        const chair = {};
        c.mark(chair, 1000, 0);
        expect(c.isCoolingDown(chair, 1000)).toBe(false);
    });

    it('is not reset by moving the chair, and other chairs are unaffected', () => {
        const c = new JamCooldowns<{ x: number }>();
        const chair = { x: 0 };
        c.mark(chair, 0, 5000);
        chair.x = 300;
        expect(c.isCoolingDown(chair, 4999)).toBe(true);
        expect(c.isCoolingDown({ x: 0 }, 0)).toBe(false);
    });
});
