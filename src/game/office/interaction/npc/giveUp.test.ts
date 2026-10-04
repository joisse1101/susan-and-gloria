import { describe, expect, it } from 'vitest';
import { giveUpOutcome, ReadOnce, signalOf, type GiveUpReason } from './giveUp';

const lost: GiveUpReason[] = ['blocked', 'slow', 'taken'];
const all: GiveUpReason[] = ['jam', ...lost];

describe('giveUpOutcome', () => {
    it('a jam with a route back walks back', () => {
        expect(giveUpOutcome('jam', false, true, false)).toBe('walk-back');
    });

    it('a jam on or beside the spot makes do without a walk, route or not', () => {
        expect(giveUpOutcome('jam', true, true, false)).toBe('make-do');
        expect(giveUpOutcome('jam', true, false, false)).toBe('make-do');
    });

    it('a jam with no route back is forgetful', () => {
        expect(giveUpOutcome('jam', false, false, false)).toBe('forget');
    });

    it.each(lost)('%s is forgetful whatever the position and route', (reason) => {
        for (const atSpot of [true, false]) {
            for (const routeBack of [true, false]) expect(giveUpOutcome(reason, atSpot, routeBack, false)).toBe('forget');
        }
    });

    it.each(all)('an occupied desk wins over %s', (reason) => {
        for (const atSpot of [true, false]) {
            for (const routeBack of [true, false]) expect(giveUpOutcome(reason, atSpot, routeBack, true)).toBe('desk-taken');
        }
    });

    it('tells the host jam for the make-do outcomes and lost for forgetting', () => {
        expect(signalOf('walk-back')).toBe('jam');
        expect(signalOf('make-do')).toBe('jam');
        expect(signalOf('forget')).toBe('lost');
    });
});

describe('ReadOnce', () => {
    it('returns the value once, then clears', () => {
        const signals = new ReadOnce<string, string>();
        signals.set('susan', 'jam');
        expect(signals.take('susan')).toBe('jam');
        expect(signals.take('susan')).toBeUndefined();
    });

    it('keeps one value per key and nothing for others', () => {
        const signals = new ReadOnce<string, string>();
        signals.set('susan', 'jam');
        expect(signals.take('gloria')).toBeUndefined();
        expect(signals.take('susan')).toBe('jam');
    });

    it('can be cleared before it is read', () => {
        const signals = new ReadOnce<string, string>();
        signals.set('susan', 'lost');
        signals.clear('susan');
        expect(signals.take('susan')).toBeUndefined();
    });
});
