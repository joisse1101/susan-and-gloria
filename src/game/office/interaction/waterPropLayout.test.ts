import { describe, expect, it } from 'vitest';
import { STAND_LIFT, STREAM_CELL, waterPropLayout } from './waterPropLayout';

describe('waterPropLayout', () => {
    it('uses the side stream for left and right, mirrored for left', () => {
        const right = waterPropLayout('right', 'susan');
        const left = waterPropLayout('left', 'susan');
        expect(right).toMatchObject({ cell: STREAM_CELL.side, flipX: false, x: 32 });
        expect(left).toMatchObject({ cell: STREAM_CELL.side, flipX: true });
        // The mirror of x 32 is x -1: the left cell is 16 wide and ends there
        expect(left.x + 16).toBe(0);
        expect(left.y).toBe(right.y);
    });

    it('raises the stream by STAND_LIFT', () => {
        expect(waterPropLayout('right', 'player').y).toBe(21 - STAND_LIFT);
        expect(waterPropLayout('down', 'player').y).toBe(28 - STAND_LIFT);
    });

    it('draws only the back view behind the character', () => {
        expect(waterPropLayout('up', 'player')).toMatchObject({ cell: STREAM_CELL.back, behind: true });
        for (const f of ['down', 'left', 'right'] as const) expect(waterPropLayout(f, 'player').behind).toBe(false);
    });

    it('offsets only Gloria\'s front view by -1', () => {
        expect(waterPropLayout('down', 'gloria')).toMatchObject({ canDy: -1, y: 28 - STAND_LIFT - 1 });
        expect(waterPropLayout('down', 'susan').canDy).toBe(0);
        expect(waterPropLayout('up', 'gloria').canDy).toBe(0);
    });
});
