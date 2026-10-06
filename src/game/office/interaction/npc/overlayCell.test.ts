import { describe, expect, it } from 'vitest';
import { BLOCKED_COLOR, PLAYER_ONLY_COLOR, WALKABLE_COLOR, WALKER_ONLY_COLOR, overlayCellColour } from './overlayCell';

describe('overlayCellColour', () => {
    it('office: green when free, red when blocked', () => {
        expect(overlayCellColour(true, undefined, 'office')).toBe(WALKABLE_COLOR);
        expect(overlayCellColour(false, undefined, 'office')).toBe(BLOCKED_COLOR);
    });
    it('office with a clearance grid: green when a chair fits, yellow when only a walker does, red when blocked', () => {
        expect(overlayCellColour(true, true, 'office')).toBe(WALKABLE_COLOR);
        expect(overlayCellColour(true, false, 'office')).toBe(WALKER_ONLY_COLOR);
        expect(overlayCellColour(false, false, 'office')).toBe(BLOCKED_COLOR);
    });
    it('bathroom: free is player-only, blocked is red, whatever the clearance', () => {
        expect(overlayCellColour(true, undefined, 'bathroom')).toBe(PLAYER_ONLY_COLOR);
        expect(overlayCellColour(true, true, 'bathroom')).toBe(PLAYER_ONLY_COLOR);
        expect(overlayCellColour(true, false, 'bathroom')).toBe(PLAYER_ONLY_COLOR);
        expect(overlayCellColour(false, true, 'bathroom')).toBe(BLOCKED_COLOR);
    });
});
