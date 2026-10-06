import { describe, expect, it } from 'vitest';
import { nextSession, type SessionInput } from './playerSession';

const input = (over: Partial<SessionInput> = {}): SessionInput => ({
    inZone: true,
    moving: false,
    typing: false,
    bubble: false,
    done: false,
    fetched: false,
    lost: false,
    jammed: false,
    ...over
});

describe('starting', () => {
    it('starts when standing still in a zone', () => {
        expect(nextSession('idle', input())).toBe('fetching');
    });

    it.each([
        ['outside a zone', { inZone: false }],
        ['a movement key is down', { moving: true }],
        ['typing', { typing: true }],
        ['a bubble is up', { bubble: true }],
        ['a work period just ended', { done: true }]
    ])('does not start: %s', (_, over) => {
        expect(nextSession('idle', input(over))).toBe('idle');
    });
});

describe('fetching', () => {
    it('keeps going after leaving the zone', () => {
        expect(nextSession('fetching', input({ inZone: false }))).toBe('fetching');
    });

    it('starts working once the chair step is finished', () => {
        expect(nextSession('fetching', input({ fetched: true }))).toBe('working');
    });

    it('does not start working before that', () => {
        expect(nextSession('fetching', input())).toBe('fetching');
    });

    it.each([
        ['a movement key', { moving: true }],
        ['typing', { typing: true }],
        ['a bubble', { bubble: true }]
    ])('is cancelled by %s, even when the chair step just finished', (_, over) => {
        expect(nextSession('fetching', input({ ...over, fetched: true }))).toBe('idle');
    });
});

describe('working', () => {
    it('continues, even outside the zone or with a bubble up', () => {
        expect(nextSession('working', input({ inZone: false, bubble: true }))).toBe('working');
    });

    it.each([
        ['a movement key', { moving: true }],
        ['typing', { typing: true }]
    ])('stops on %s', (_, over) => {
        expect(nextSession('working', input(over))).toBe('idle');
    });
});

describe('giving up the chair trip', () => {
    it('a lost trip goes to idle with no work, even if the chair step just finished', () => {
        expect(nextSession('fetching', input({ lost: true }))).toBe('idle');
        expect(nextSession('fetching', input({ lost: true, fetched: true }))).toBe('idle');
    });

    it('a jam goes to walking back, then working on arrival', () => {
        expect(nextSession('fetching', input({ jammed: true }))).toBe('walkingBack');
        expect(nextSession('walkingBack', input())).toBe('walkingBack');
        expect(nextSession('walkingBack', input({ fetched: true }))).toBe('working');
    });

    it('a jam on the spot works at once', () => {
        expect(nextSession('fetching', input({ jammed: true, fetched: true }))).toBe('working');
    });

    it.each([
        ['a movement key', { moving: true }],
        ['typing', { typing: true }],
        ['no way back', { lost: true }]
    ])('walking back is cancelled by %s, even on arrival', (_, over) => {
        expect(nextSession('walkingBack', input({ ...over, fetched: true }))).toBe('idle');
    });

    it('walking back goes on with the make-do line up, and outside the zone', () => {
        expect(nextSession('walkingBack', input({ bubble: true, inZone: false }))).toBe('walkingBack');
    });

    it('a cancel while fetching beats a jam', () => {
        expect(nextSession('fetching', input({ moving: true, jammed: true }))).toBe('idle');
    });
});
