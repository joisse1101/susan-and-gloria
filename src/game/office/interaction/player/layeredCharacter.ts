import Phaser from 'phaser';
import { CharacterRig } from './CharacterRig';
import { parseLayerOrder, type LayerName, type LayerOrder } from './rigLayout';
import { animKey, standAnimKey, typeAnimKey, type Facing } from './playerSprite';

// Layered characters: the sheets, layout, layer order and presets are written by the character build
// (public/assets/characters/). Every layer sheet has the same cell grid, so one frame index picks the
// same pose in all of them (see CharacterRig).

interface LayoutAnimation {
    name: string;
    frames: number;
    facings: Record<Facing, number>;
}

interface Layout {
    cell: number;
    width: number;
    animations: LayoutAnimation[];
    // layer name -> folder under public/assets/characters/
    layers: Record<LayerName, string>;
}

interface Presets {
    characters: Record<string, Record<LayerName, string>>;
}

const LAYOUT_KEY = 'characters-layout';
const ORDER_KEY = 'characters-layer-order';
const PRESETS_KEY = 'characters-presets';
const dataUrl = (file: string) => `${import.meta.env.BASE_URL}assets/characters/${file}`;

export const layerTextureKey = (layer: LayerName, variant: string) => `layer-${layer}-${variant}`;

// Layout animation name -> the key the scene already plays for it
const ANIM_KEYS: Record<string, { key: (facing: Facing, name: string) => string; frameRate: number }> = {
    idle: { key: (facing, name) => animKey('idle', facing, name), frameRate: 2 },
    walk: { key: (facing, name) => animKey('walk', facing, name), frameRate: 8 },
    workStanding: { key: (facing, name) => standAnimKey(facing, name), frameRate: 6 },
    workSitting: { key: (facing, name) => typeAnimKey(facing, name), frameRate: 6 }
};

// Queue the data files, then (once they are in) the sheets of every layer each named character wears
export function preloadLayeredCharacters(scene: Phaser.Scene, names: string[]) {
    scene.load.json(LAYOUT_KEY, dataUrl('layout.json'));
    scene.load.json(ORDER_KEY, dataUrl('layer-order.json'));
    scene.load.json(PRESETS_KEY, dataUrl('presets.json'));
    let queued = false;
    scene.load.on(Phaser.Loader.Events.FILE_COMPLETE, () => {
        const { cache } = scene;
        if (queued || !cache.json.has(LAYOUT_KEY) || !cache.json.has(PRESETS_KEY)) return;
        queued = true;
        const layout = cache.json.get(LAYOUT_KEY) as Layout;
        for (const name of names) {
            for (const [layer, variant] of Object.entries(presetVariants(scene, name))) {
                scene.load.spritesheet(layerTextureKey(layer, variant), dataUrl(`${layout.layers[layer]}/${variant}.png`), {
                    frameWidth: layout.cell,
                    frameHeight: layout.cell
                });
            }
        }
    });
}

// What a character wears, by layer: its preset
export function presetVariants(scene: Phaser.Scene, name: string): Record<LayerName, string> {
    const preset = (scene.cache.json.get(PRESETS_KEY) as Presets).characters[name];
    if (!preset) throw new Error(`presets.json has no character "${name}"`);
    return preset;
}

export function layerOrder(scene: Phaser.Scene): LayerOrder {
    return parseLayerOrder(scene.cache.json.get(ORDER_KEY));
}

// The scene's animation keys for a character, made from the layout on its body sheet (the base sprite plays them)
export function createLayeredAnims(scene: Phaser.Scene, name: string) {
    const layout = scene.cache.json.get(LAYOUT_KEY) as Layout;
    const columns = layout.width / layout.cell;
    const body = layerTextureKey('body', presetVariants(scene, name).body);
    for (const animation of layout.animations) {
        const config = ANIM_KEYS[animation.name];
        if (!config) continue;
        for (const [facing, row] of Object.entries(animation.facings) as [Facing, number][]) {
            scene.anims.create({
                key: config.key(facing, name),
                frames: scene.anims.generateFrameNumbers(body, {
                    start: row * columns,
                    end: row * columns + animation.frames - 1
                }),
                frameRate: config.frameRate,
                repeat: -1
            });
        }
    }
}

// Builds the rig of a character from its preset. `createBase` makes the body sprite (the one with the physics
// body); the other layers are plain sprites that follow it. The rig syncs itself on POST_UPDATE: after physics
// (which registered first) has moved the base, and before the render's depth sort. PRE_RENDER is too late, the
// sort has already run, so the layers would be ordered by last frame's depths and the body could jump on top.
export function createLayeredRig<S extends Phaser.GameObjects.Sprite>(
    scene: Phaser.Scene,
    name: string,
    createBase: (texture: string) => S,
    facing: (base: S) => Facing
): CharacterRig<S> {
    let base: S | undefined;
    const rig = new CharacterRig<S>({
        order: layerOrder(scene),
        variants: presetVariants(scene, name),
        textureKey: layerTextureKey,
        create: (_layer, texture, isBase) => {
            if (isBase) return (base = createBase(texture));
            return scene.add.sprite(0, 0, texture).setScale(base!.scaleX) as S;
        }
    });
    const onRender = () => {
        rig.setFacing(facing(rig.base));
        rig.sync();
    };
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, onRender);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, onRender));
    return rig;
}

// Dev only: a copy of a layer sheet with red and blue swapped, under a new texture key, so a layer swap can be
// tried before a second variant is drawn. Returns the variant name to pass to `CharacterRig.setLayer`.
export function addRecoloredVariant(scene: Phaser.Scene, layer: LayerName, variant: string, name: string): string {
    const key = layerTextureKey(layer, name);
    if (scene.textures.exists(key)) return name;
    const source = scene.textures.get(layerTextureKey(layer, variant)).getSourceImage() as HTMLImageElement;
    const texture = scene.textures.createCanvas(key, source.width, source.height);
    if (!texture) throw new Error(`could not create texture ${key}`);
    const ctx = texture.getContext();
    ctx.drawImage(source, 0, 0);
    const image = ctx.getImageData(0, 0, source.width, source.height);
    for (let i = 0; i < image.data.length; i += 4) [image.data[i], image.data[i + 2]] = [image.data[i + 2], image.data[i]];
    ctx.putImageData(image, 0, 0);
    texture.refresh();
    const layout = scene.cache.json.get(LAYOUT_KEY) as Layout;
    const columns = source.width / layout.cell;
    for (let frame = 0; frame < columns * (source.height / layout.cell); frame++) {
        texture.add(frame, 0, (frame % columns) * layout.cell, Math.floor(frame / columns) * layout.cell, layout.cell, layout.cell);
    }
    return name;
}
