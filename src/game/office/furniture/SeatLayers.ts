import Phaser from 'phaser';
import { FURNITURE_ATLAS_KEY, HANDLE_ATLAS_KEY, type FurnitureFrameName } from '../atlases/furnitureAtlas';
import { SPRITE_SCALE } from '../constants';
import type { Facing } from '../interaction/player/playerSprite';

// Which chair frame sits under a character facing each way
export const CHAIR_FACING = { down: 'S', up: 'N', right: 'E', left: 'W' } as const;
// Nudge from the character's centre per facing (px, tune by eye)
export const CHAIR_OFFSET = {
    down: { x: 0, y: 14 },
    up: { x: 0, y: 10 },
    right: { x: -5, y: 10 },
    left: { x: 5, y: 10 }
} as const;

// Unit vector from a seated character towards the back of their chair (the way it rolls when they stand up)
export const SEAT_BACK = {
    down: { x: 0, y: -1 },
    up: { x: 0, y: 1 },
    right: { x: -1, y: 0 },
    left: { x: 1, y: 0 }
} as const;

export function seatFrame(facing: Facing) {
    return `chair${CHAIR_FACING[facing]}` as FurnitureFrameName;
}

// Where the chair's centre sits for a character at (x, y) facing a given way
export function seatPosition(x: number, y: number, facing: Facing) {
    const offset = CHAIR_OFFSET[facing];
    return { x: x + offset.x, y: y + offset.y };
}

// A seated character sandwiched between a chair drawn behind them and the armrests drawn over them
export class SeatLayers {
    private chair: Phaser.GameObjects.Image;
    private handle: Phaser.GameObjects.Image;

    constructor(scene: Phaser.Scene) {
        this.chair = scene.add.image(0, 0, FURNITURE_ATLAS_KEY, 'chairS').setScale(SPRITE_SCALE).setVisible(false);
        this.handle = scene.add.image(0, 0, HANDLE_ATLAS_KEY, 'chairS').setScale(SPRITE_SCALE).setVisible(false);
    }

    // `sitter` must already be depth-sorted this frame
    show(sitter: Phaser.GameObjects.Sprite, facing: Facing) {
        const frame = seatFrame(facing);
        const { x, y } = seatPosition(sitter.x, sitter.y, facing);
        for (const layer of [this.chair, this.handle]) layer.setFrame(frame).setPosition(x, y).setVisible(true);
        this.chair.setDepth(sitter.depth - 1);
        this.handle.setDepth(sitter.depth + 1);
    }

    hide() {
        this.chair.setVisible(false);
        this.handle.setVisible(false);
    }
}
