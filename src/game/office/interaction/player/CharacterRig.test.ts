import { describe, expect, it } from 'vitest';
import { CharacterRig, type RigSprite } from './CharacterRig';
import { LAYER_DEPTH_STEP, allLayers, layerDepth, layersFor, parseLayerOrder, type LayerOrder } from './rigLayout';

const ORDER: LayerOrder = {
    down: ['body', 'bottom', 'top', 'hair', 'face'],
    up: ['body', 'bottom', 'top', 'hair'],
    right: ['body', 'bottom', 'top', 'hair', 'face'],
    left: ['body', 'bottom', 'top', 'hair', 'face']
};

class FakeSprite implements RigSprite {
    x = 0;
    y = 0;
    depth = 0;
    alpha = 1;
    flipX = false;
    visible = true;
    frame: { name: string | number } = { name: 0 };
    texture: string;
    destroyed = false;
    constructor(texture: string) {
        this.texture = texture;
    }
    setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    setDepth(depth: number) {
        this.depth = depth;
    }
    setAlpha(alpha: number) {
        this.alpha = alpha;
    }
    setFlipX(flip: boolean) {
        this.flipX = flip;
    }
    setVisible(visible: boolean) {
        this.visible = visible;
    }
    setTexture(key: string, frame?: string | number) {
        this.texture = key;
        if (frame !== undefined) this.frame = { name: frame };
    }
    setFrame(frame: string | number) {
        this.frame = { name: frame };
    }
    destroy() {
        this.destroyed = true;
    }
}

function makeRig() {
    const created: { layer: string; isBase: boolean; sprite: FakeSprite }[] = [];
    const rig = new CharacterRig<FakeSprite>({
        order: ORDER,
        variants: { body: 'light', bottom: 'skirt', top: 'cardigan', hair: 'bun', face: 'neutral' },
        textureKey: (layer, variant) => `${layer}/${variant}`,
        create: (layer, texture, isBase) => {
            const sprite = new FakeSprite(texture);
            created.push({ layer, isBase, sprite });
            return sprite;
        }
    });
    return { rig, created };
}

describe('layer order', () => {
    it('lists the layers of a facing bottom to top', () => {
        expect(layersFor(ORDER, 'up')).toEqual(['body', 'bottom', 'top', 'hair']);
    });

    it('gives the base the base depth and each layer above it one step more', () => {
        expect(layerDepth(ORDER, 'down', 'body', 10)).toBe(10);
        expect(layerDepth(ORDER, 'down', 'top', 10)).toBeCloseTo(10 + 2 * LAYER_DEPTH_STEP);
        expect(layerDepth(ORDER, 'down', 'face', 10)).toBeCloseTo(10 + 4 * LAYER_DEPTH_STEP);
    });

    it('has no depth for a layer not drawn that way', () => {
        expect(layerDepth(ORDER, 'up', 'face', 10)).toBeUndefined();
    });

    it('keeps the whole stack inside the gap to the shadow (0.5) and the chair layers (1)', () => {
        const top = layerDepth(ORDER, 'down', 'face', 0) ?? 0;
        expect(top).toBeLessThan(0.5);
    });

    it('collects every layer once', () => {
        expect(allLayers(ORDER)).toEqual(['body', 'bottom', 'top', 'hair', 'face']);
    });
});

describe('parseLayerOrder', () => {
    it('accepts a complete order', () => {
        expect(parseLayerOrder(ORDER)).toEqual(ORDER);
    });

    it('rejects a missing facing', () => {
        expect(() => parseLayerOrder({ down: ['body'], up: ['body'], right: ['body'] })).toThrow(/left/);
    });

    it('rejects facings that start with different base layers', () => {
        expect(() => parseLayerOrder({ ...ORDER, up: ['top', 'body'] })).toThrow(/base/);
    });
});

describe('CharacterRig', () => {
    it('makes no sprite for a layer the character has no variant for', () => {
        const created: string[] = [];
        const rig = new CharacterRig<FakeSprite>({
            order: ORDER,
            variants: { body: 'light', bottom: 'skirt', top: 'cardigan', hair: 'bun' },
            textureKey: (layer, variant) => `${layer}/${variant}`,
            create: (layer, texture) => (created.push(layer), new FakeSprite(texture))
        });
        expect(created).toEqual(['body', 'bottom', 'top', 'hair']);
        rig.setFacing('down');
        rig.sync();
        expect(rig.sprites()).toHaveLength(4);
    });

    it('creates one sprite per layer with the body as the only base', () => {
        const { rig, created } = makeRig();
        expect(created.map((c) => c.layer)).toEqual(['body', 'bottom', 'top', 'hair', 'face']);
        expect(created.filter((c) => c.isBase).map((c) => c.layer)).toEqual(['body']);
        expect(rig.sprites()).toHaveLength(5);
        expect(created.find((c) => c.layer === 'top')?.sprite.texture).toBe('top/cardigan');
    });

    it('moves every layer with the base', () => {
        const { rig } = makeRig();
        rig.setPosition(40, 60);
        for (const s of rig.sprites()) expect([s.x, s.y]).toEqual([40, 60]);
    });

    it('copies the base frame to every layer', () => {
        const { rig } = makeRig();
        rig.base.setFrame(9);
        rig.sync();
        for (const s of rig.sprites()) expect(s.frame.name).toBe(9);
    });

    it('applies flip and alpha to every layer', () => {
        const { rig } = makeRig();
        rig.setFlipX(true);
        rig.setAlpha(0.4);
        for (const s of rig.sprites()) {
            expect(s.flipX).toBe(true);
            expect(s.alpha).toBe(0.4);
        }
    });

    it('fades layers that follow a base whose alpha was set directly', () => {
        const { rig } = makeRig();
        rig.base.setAlpha(0.5);
        rig.sync();
        for (const s of rig.sprites()) expect(s.alpha).toBe(0.5);
    });

    it('stacks layers above the base depth in the facing order', () => {
        const { rig, created } = makeRig();
        rig.setDepth(100);
        const depthOf = (layer: string) => created.find((c) => c.layer === layer)!.sprite.depth;
        expect(depthOf('body')).toBe(100);
        expect(depthOf('hair')).toBeGreaterThan(depthOf('top'));
        expect(depthOf('face')).toBeLessThan(100.5);
    });

    it('hides the face facing up and shows it again facing down', () => {
        const { rig, created } = makeRig();
        const face = created.find((c) => c.layer === 'face')!.sprite;
        rig.setFacing('up');
        rig.sync();
        expect(face.visible).toBe(false);
        rig.setFacing('down');
        rig.sync();
        expect(face.visible).toBe(true);
    });

    it('hides every layer with the base', () => {
        const { rig } = makeRig();
        rig.setVisible(false);
        for (const s of rig.sprites()) expect(s.visible).toBe(false);
    });

    it('swaps one layer and keeps its frame and the others as they were', () => {
        const { rig, created } = makeRig();
        rig.base.setFrame(5);
        rig.setLayer('top', 'blouse');
        const sprite = (layer: string) => created.find((c) => c.layer === layer)!.sprite;
        expect(sprite('top').texture).toBe('top/blouse');
        expect(sprite('top').frame.name).toBe(5);
        expect(rig.variantOf('top')).toBe('blouse');
        expect(sprite('bottom').texture).toBe('bottom/skirt');
        expect(sprite('hair').texture).toBe('hair/bun');
    });

    it('ignores a layer it does not have', () => {
        const { rig } = makeRig();
        rig.setLayer('wings', 'big');
        expect(rig.variantOf('wings')).toBeUndefined();
    });

    it('destroys every layer', () => {
        const { rig, created } = makeRig();
        rig.destroy();
        expect(created.every((c) => c.sprite.destroyed)).toBe(true);
    });
});
