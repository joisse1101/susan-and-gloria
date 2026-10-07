import type { Facing } from './playerSprite';
import { allLayers, layerDepth, type LayerName, type LayerOrder } from './rigLayout';

// The part of a Phaser sprite the rig uses (Phaser.GameObjects.Sprite satisfies it), so the rig is testable with fakes
export interface RigSprite {
    x: number;
    y: number;
    depth: number;
    alpha: number;
    flipX: boolean;
    visible: boolean;
    frame: { name: string | number };
    setPosition(x: number, y: number): unknown;
    setDepth(depth: number): unknown;
    setAlpha(alpha: number): unknown;
    setFlipX(flip: boolean): unknown;
    setVisible(visible: boolean): unknown;
    setTexture(key: string, frame?: string | number): unknown;
    setFrame(frame: string | number): unknown;
    destroy(): void;
}

export interface RigOptions<S extends RigSprite> {
    order: LayerOrder;
    // Layer name -> variant currently worn (from the character's preset). A layer the character has no variant
    // for gets no sprite (Susan wears no accessory); the body must have one.
    variants: Partial<Record<LayerName, string>>;
    // Texture key for a layer variant, as loaded in preload
    textureKey: (layer: LayerName, variant: string) => string;
    // Create the sprite of one layer; the base is the one that gets the physics body and plays the animations
    create: (layer: LayerName, texture: string, isBase: boolean) => S;
}

// A character as a stack of sprites, one per layer. All layer sheets share one cell grid, so a frame index
// picks the same pose in every layer: only the base sprite animates and `sync` makes the rest copy it.
// The scene treats the base as the character (position, depth, alpha, flip, physics) and calls `sync` once
// per frame after changing it.
export class CharacterRig<S extends RigSprite> {
    readonly base: S;
    private readonly order: LayerOrder;
    private readonly textureKey: RigOptions<S>['textureKey'];
    private readonly followers = new Map<LayerName, S>();
    private readonly variants: Partial<Record<LayerName, string>>;
    private facing: Facing = 'down';

    constructor(options: RigOptions<S>) {
        this.order = options.order;
        this.textureKey = options.textureKey;
        this.variants = { ...options.variants };
        const [baseLayer] = options.order.down;
        this.base = options.create(baseLayer, this.textureKey(baseLayer, this.variants[baseLayer]!), true);
        for (const layer of allLayers(options.order)) {
            const variant = this.variants[layer];
            if (layer === baseLayer || variant === undefined) continue;
            this.followers.set(layer, options.create(layer, this.textureKey(layer, variant), false));
        }
        this.sync();
    }

    get layers(): LayerName[] {
        return [this.baseLayerName(), ...this.followers.keys()];
    }

    // Layer sprites by name, base included
    sprites(): S[] {
        return [this.base, ...this.followers.values()];
    }

    setFacing(facing: Facing) {
        this.facing = facing;
    }

    setPosition(x: number, y: number) {
        this.base.setPosition(x, y);
        this.sync();
    }

    setDepth(depth: number) {
        this.base.setDepth(depth);
        this.sync();
    }

    setAlpha(alpha: number) {
        this.base.setAlpha(alpha);
        this.sync();
    }

    setFlipX(flip: boolean) {
        this.base.setFlipX(flip);
        this.sync();
    }

    setVisible(visible: boolean) {
        this.base.setVisible(visible);
        this.sync();
    }

    // Swap what a layer wears. Keeps the current frame, so the pose does not jump. The base layer (the body) is
    // swapped too, but the scene's animations are made on its texture, so only do that before they are created.
    setLayer(layer: LayerName, variant: string) {
        const sprite = layer === this.baseLayerName() ? this.base : this.followers.get(layer);
        if (!sprite) return;
        const frame = this.base.frame.name;
        this.variants[layer] = variant;
        sprite.setTexture(this.textureKey(layer, variant), frame);
        this.sync();
    }

    variantOf(layer: LayerName): string | undefined {
        return this.variants[layer];
    }

    // Copy the base's position, frame, flip, alpha and visibility to every layer, order them for the current
    // facing and hide the ones not drawn that way (no face in the up view)
    sync() {
        const { base } = this;
        for (const [layer, sprite] of this.followers) {
            const depth = layerDepth(this.order, this.facing, layer, base.depth);
            sprite.setPosition(base.x, base.y);
            sprite.setFrame(base.frame.name);
            sprite.setFlipX(base.flipX);
            sprite.setAlpha(base.alpha);
            sprite.setVisible(base.visible && depth !== undefined);
            if (depth !== undefined) sprite.setDepth(depth);
        }
    }

    destroy() {
        for (const sprite of this.sprites()) sprite.destroy();
        this.followers.clear();
    }

    private baseLayerName(): LayerName {
        return this.order.down[0];
    }
}
