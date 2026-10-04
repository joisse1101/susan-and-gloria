import type { Facing } from './player/playerSprite';

// Where the watering can's stream is drawn, in pixels of the actor's 32px cell (pixel-art/water-stream/build.py has
// the anchors). Pure, so it is unit tested; WaterProps does the drawing.

// WorkStanding.png's hands sit this many px above the seated ones (the can sheet is already raised, the stream is not)
export const STAND_LIFT = 3;
// The stream sheet's cells
export const STREAM_CELL = { side: 0, front: 1, back: 2 } as const;
// Gloria's belly hands sit a row higher than the others' in the front view, so her can and stream do too
const FRONT_DY: Record<string, number> = { gloria: -1 };

export interface WaterPropLayout {
    cell: number; // frame of WaterStream.png
    flipX: boolean;
    x: number; // top-left of the 16px stream cell, in the actor's cell
    y: number;
    behind: boolean; // drawn behind the character (back view), not in front
    canDy: number; // nudge for the can overlay (px, in the actor's cell)
}

// The side stream leaves the rose just right of the hand (x 32); the left view is the right one mirrored, so its cell
// ends where the right one starts (-1). Front and back fans hang under the rose, centre column 8 of the cell, x 17 of the can sheet.
export function waterPropLayout(facing: Facing, name: string): WaterPropLayout {
    const dy = facing === 'down' ? (FRONT_DY[name] ?? 0) : 0;
    switch (facing) {
        case 'right': return { cell: STREAM_CELL.side, flipX: false, x: 32, y: 21 - STAND_LIFT, behind: false, canDy: 0 };
        case 'left': return { cell: STREAM_CELL.side, flipX: true, x: -16, y: 21 - STAND_LIFT, behind: false, canDy: 0 };
        case 'down': return { cell: STREAM_CELL.front, flipX: false, x: 17 - 8, y: 28 - STAND_LIFT + dy, behind: false, canDy: dy };
        case 'up': return { cell: STREAM_CELL.back, flipX: false, x: 17 - 8, y: 28 - STAND_LIFT, behind: true, canDy: 0 };
    }
}
