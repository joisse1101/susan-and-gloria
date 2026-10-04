import Phaser from 'phaser';
import { SPRITE_SCALE } from '../constants';
import type { Facing } from './player/playerSprite';
import { waterPropLayout } from './waterPropLayout';

type Sprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

const CAN_KEY = 'watering-can-stand';
const STREAM_KEY = 'water-stream';
const asset = (file: string) => `${import.meta.env.BASE_URL}assets/sprites/items/${file}`;
const CELL = 32;
const STREAM_CELL_PX = 16;

// The watering can and its stream, drawn over a standing actor like the chair layers: they follow the sprite, the
// back view goes behind the character and the rest in front. One per actor.
export class WaterProps {
    private can: Phaser.GameObjects.Image;
    private stream: Phaser.GameObjects.Image;

    static preload(scene: Phaser.Scene) {
        // Same cell layout as WorkStanding.png (2 frames per row, a row per direction), so the can uses the actor's frame
        scene.load.spritesheet(CAN_KEY, asset('WateringCanStanding.png'), { frameWidth: CELL, frameHeight: CELL });
        scene.load.spritesheet(STREAM_KEY, asset('WaterStream.png'), { frameWidth: STREAM_CELL_PX, frameHeight: STREAM_CELL_PX });
    }

    constructor(scene: Phaser.Scene) {
        this.can = scene.add.image(0, 0, CAN_KEY, 0).setScale(SPRITE_SCALE).setVisible(false);
        this.stream = scene.add.image(0, 0, STREAM_KEY, 0).setScale(SPRITE_SCALE).setOrigin(0, 0).setVisible(false);
    }

    // Call every frame after the actor has been depth-sorted: shows the props while `watering`, hides them otherwise
    update(actor: Sprite, name: string, facing: Facing, watering: boolean) {
        if (!watering) {
            this.can.setVisible(false);
            this.stream.setVisible(false);
            return;
        }
        const layout = waterPropLayout(facing, name);
        const topLeft = { x: actor.x - (CELL / 2) * SPRITE_SCALE, y: actor.y - (CELL / 2) * SPRITE_SCALE };
        // The can bobs with the hand: same frame as the standing animation, whose sheet it shares the layout of
        const frame = typeof actor.frame.name === 'number' ? actor.frame.name : Number(actor.frame.name);
        this.can.setFrame(Number.isNaN(frame) ? 0 : frame).setPosition(actor.x, actor.y + layout.canDy * SPRITE_SCALE).setVisible(true);
        this.stream
            .setFrame(layout.cell)
            .setFlipX(layout.flipX)
            .setPosition(topLeft.x + layout.x * SPRITE_SCALE, topLeft.y + layout.y * SPRITE_SCALE)
            .setVisible(true);
        const depth = layout.behind ? actor.depth - 1 : actor.depth + 1;
        this.can.setDepth(depth);
        this.stream.setDepth(depth + (layout.behind ? -0.5 : 0.5));
    }
}
