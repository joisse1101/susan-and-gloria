import Phaser from 'phaser';

import { SPRITE_SCALE } from '../constants';

export const SHADOW_KEY = 'shadow';
export const OBJECT_SHADOW_KEY = 'object-shadow';
// Both built by pixel-art/shadow/build.py: 32x32 cells lined up with the frame they go under
const assetUrl = (file: string) => `${import.meta.env.BASE_URL}assets/sprites/${file}`;

// Nudge for the chair's object shadow, in unscaled px: positive = down, negative = up. 0 = as drawn in ObjectShadow.png
export const CHAIR_SHADOW_OFFSET_Y = 1;

interface ShadowOptions {
    // Unscaled px to move the shadow down from where its image is drawn
    offsetY?: number;
    // Which shadow image: the character oval (default) or the smaller flat one for objects
    key?: typeof SHADOW_KEY | typeof OBJECT_SHADOW_KEY;
    // Hide the shadow while this returns true (e.g. the character is seated and the chair casts it instead)
    hideWhen?: () => boolean;
}

// A shadow image under each sprite, kept on its feet and drawn just behind it
export class Shadows {
    private readonly scene: Phaser.Scene;
    private readonly shadows = new Map<Phaser.GameObjects.Sprite, { image: Phaser.GameObjects.Image } & ShadowOptions>();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    static preload(scene: Phaser.Scene) {
        scene.load.image(SHADOW_KEY, assetUrl('Shadow.png'));
        scene.load.image(OBJECT_SHADOW_KEY, assetUrl('ObjectShadow.png'));
    }

    add(sprite: Phaser.GameObjects.Sprite, options: ShadowOptions = {}) {
        const image = this.scene.add.image(sprite.x, sprite.y, options.key ?? SHADOW_KEY).setScale(SPRITE_SCALE);
        this.shadows.set(sprite, { image, ...options });
    }

    // Call after the sprites' depth is set for the frame
    update() {
        this.shadows.forEach(({ image, offsetY = 0, hideWhen }, sprite) => {
            image
                .setVisible(sprite.visible && !hideWhen?.())
                .setPosition(sprite.x, sprite.y + offsetY * SPRITE_SCALE)
                .setDepth(sprite.depth - 0.5);
        });
    }
}
