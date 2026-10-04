import { describe, expect, it } from 'vitest';
import { APPROACH_MS, SPOT_TOLERANCE_PX, approachState } from './approach';

describe('approachState', () => {
    it('keeps moving while off the spot and within time', () => {
        expect(approachState(30, 100)).toBe('moving');
    });

    it('is ready once on the spot', () => {
        expect(approachState(1, 100)).toBe('ready');
    });

    it('is ready on timeout if close enough', () => {
        expect(approachState(SPOT_TOLERANCE_PX, APPROACH_MS)).toBe('ready');
    });

    it('fails on timeout when too far from the spot', () => {
        expect(approachState(SPOT_TOLERANCE_PX + 1, APPROACH_MS)).toBe('failed');
    });
});
