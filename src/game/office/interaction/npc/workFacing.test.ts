import { describe, expect, it } from 'vitest';
import { facingForStandingWork, facingFromVelocity, playerFacing } from './workFacing';

describe('facingFromVelocity', () => {
    it('keeps the facing while standing still', () => {
        expect(facingFromVelocity(0, 0, 'up')).toBe('up');
    });

    it('turns to the direction of travel, the stronger axis winning', () => {
        expect(facingFromVelocity(-10, 3, 'up')).toBe('left');
        expect(facingFromVelocity(10, -3, 'up')).toBe('right');
        expect(facingFromVelocity(2, -9, 'left')).toBe('up');
        expect(facingFromVelocity(-2, 9, 'left')).toBe('down');
    });

    it('prefers horizontal on a tie', () => {
        expect(facingFromVelocity(5, 5, 'up')).toBe('right');
    });
});

describe('facingForStandingWork', () => {
    it('faces the desk once on the spot', () => {
        expect(facingForStandingWork('up', true)).toBe('up');
    });

    it('does not turn anyone who is not on the spot', () => {
        expect(facingForStandingWork('up', false)).toBeUndefined();
    });

    it('a walk back that turned them away is undone on arrival', () => {
        // the desk is up; walking back along the aisle to the left turns them left
        let facing = facingFromVelocity(-40, 0, 'up');
        expect(facing).toBe('left');
        facing = facingForStandingWork('up', true) ?? facing;
        expect(facing).toBe('up');
    });
});

describe('playerFacing', () => {
    it('turns to the last direction moved, horizontal winning over vertical', () => {
        expect(playerFacing(-5, 0, 'down', false)).toBe('left');
        expect(playerFacing(0, -5, 'down', false)).toBe('up');
        expect(playerFacing(1, 50, 'down', false)).toBe('right');
    });

    it('keeps the facing while standing still and not working', () => {
        expect(playerFacing(0, 0, 'left', false, 'up')).toBe('left');
    });

    it('faces the desk while working, seated or standing', () => {
        expect(playerFacing(0, 0, 'left', true, 'up')).toBe('up');
    });

    it('a walk back to the spot is overridden by the desk once work starts', () => {
        let facing = playerFacing(40, 0, 'up', false, 'up'); // walking back along the aisle
        expect(facing).toBe('right');
        facing = playerFacing(0, 0, facing, true, 'up'); // on the spot, working
        expect(facing).toBe('up');
    });

    it('works facing the way they were when the desk has no direction', () => {
        expect(playerFacing(0, 0, 'right', true, undefined)).toBe('right');
    });
});
