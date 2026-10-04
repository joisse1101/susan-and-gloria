import { describe, expect, it } from 'vitest';
import { coworkerInterrupted, playerInterrupted } from './waterActor';

describe('what interrupts watering', () => {
    it('interrupts a coworker only with a bubble up', () => {
        expect(coworkerInterrupted(true)).toBe(true);
        expect(coworkerInterrupted(false)).toBe(false);
    });

    it('interrupts the player with a key, typing or a bubble', () => {
        expect(playerInterrupted(true, false, false)).toBe(true);
        expect(playerInterrupted(false, true, false)).toBe(true);
        expect(playerInterrupted(false, false, true)).toBe(true);
        expect(playerInterrupted(false, false, false)).toBe(false);
    });
});
