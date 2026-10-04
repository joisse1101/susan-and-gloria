import { describe, expect, it } from 'vitest';
import { PlantShared } from './plantShared';

describe('PlantShared', () => {
    it('lets one actor claim a plant at a time', () => {
        const s = new PlantShared([]);
        expect(s.slots.claim('p', 'gloria')).toBe(true);
        expect(s.slots.claim('p', 'player')).toBe(false);
        expect(s.slots.isFree('p', 'player')).toBe(false);
    });

    it('frees the plant and rests it for everyone', () => {
        const s = new PlantShared([]);
        s.slots.claim('p', 'gloria');
        s.finish('p', 'gloria', 1000, 500);
        expect(s.slots.isFree('p', 'player')).toBe(true);
        expect(s.cooldowns.isCoolingDown('p', 1200)).toBe(true);
        expect(s.cooldowns.isCoolingDown('q', 1200)).toBe(false);
        expect(s.cooldowns.isCoolingDown('p', 1500)).toBe(false);
    });
});
