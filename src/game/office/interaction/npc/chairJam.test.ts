import { describe, expect, it } from 'vitest';
import { chairLag, checkJam, ropeLength } from './chairJam';

const walker = (x: number, y: number) => ({ x, y, halfWidth: 11, halfHeight: 4 });
const chair = (x: number, y: number) => ({ x, y, halfWidth: 14, halfHeight: 8 });

describe('chairLag', () => {
    it('is zero when the chair is held at the rope, sideways', () => {
        const rope = ropeLength(1, 0, walker(0, 0), chair(0, 0), 4, 16);
        expect(rope).toBe(11 + 14 + 4);
        expect(chairLag(walker(0, 0), chair(rope, 0), 4, 16)).toBeCloseTo(0);
    });

    it('uses the vertical half sizes straight up and down', () => {
        const rope = ropeLength(0, 1, walker(0, 0), chair(0, 0), 4, 16);
        expect(rope).toBe(4 + 8 + 4);
        expect(chairLag(walker(0, 0), chair(0, rope + 10), 4, 16)).toBeCloseTo(10);
    });

    it('never holds the chair closer than the minimum rope', () => {
        const tiny = { x: 0, y: 0, halfWidth: 1, halfHeight: 1 };
        expect(ropeLength(0, 1, tiny, tiny, 0, 16)).toBe(16);
    });

    it('measures a diagonal direction along that direction', () => {
        const d = 50 / Math.SQRT2;
        const u = Math.SQRT1_2;
        const rope = ropeLength(u, u, walker(0, 0), chair(0, 0), 4, 16);
        expect(chairLag(walker(0, 0), chair(d, d), 4, 16)).toBeCloseTo(50 - rope);
    });

    it('stays under the jam margin at the starting grab distance', () => {
        // grabbed when the gap between bodies is at most 4 px
        const lag = chairLag(walker(0, 0), chair(11 + 14 + 4, 0), 4, 16);
        expect(lag).toBeLessThan(12);
    });
});

describe('checkJam', () => {
    const margin = 12;
    const time = 1500;

    it('never jams while the lag is under the margin', () => {
        let state = {};
        for (let t = 0; t < 10000; t += 100) {
            const r = checkJam(state, 12, t, margin, time);
            expect(r.jammed).toBe(false);
            state = r.state;
        }
    });

    it('jams once the lag has stayed over the margin for the time', () => {
        let r = checkJam({}, 20, 1000, margin, time);
        expect(r.jammed).toBe(false);
        r = checkJam(r.state, 25, 2499, margin, time);
        expect(r.jammed).toBe(false);
        r = checkJam(r.state, 25, 2500, margin, time);
        expect(r.jammed).toBe(true);
    });

    it('a dip under the margin resets the timer', () => {
        let r = checkJam({}, 20, 0, margin, time);
        r = checkJam(r.state, 5, 1000, margin, time);
        r = checkJam(r.state, 20, 1100, margin, time);
        expect(checkJam(r.state, 20, 2000, margin, time).jammed).toBe(false);
        expect(checkJam(r.state, 20, 2600, margin, time).jammed).toBe(true);
    });

    it('a stationary walker with a steady small lag never jams', () => {
        let state = {};
        for (let t = 0; t < 60000; t += 50) {
            const r = checkJam(state, 6, t, margin, time);
            expect(r.jammed).toBe(false);
            state = r.state;
        }
    });

    it('starting again from an empty state (a replan or a phase change) restarts the timer', () => {
        const r = checkJam({}, 20, 0, margin, time);
        expect(checkJam(r.state, 20, 1600, margin, time).jammed).toBe(true);
        expect(checkJam({}, 20, 1600, margin, time).jammed).toBe(false);
    });
});
