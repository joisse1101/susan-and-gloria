import Phaser from 'phaser';

// Sheets are 32px cells, one row per direction in this order
const FRAME_SIZE = 32;
const DIRECTIONS = ['down', 'up', 'right', 'left'] as const;
export type Facing = (typeof DIRECTIONS)[number];

// Frames per row in the image (columns) vs frames actually animated. The player's sheets carry a row-label
// column at the end, so columns is one more than frames; Susan's do not.
interface SheetLayout {
    columns: number;
    frames: number;
}

export interface CharacterSprite {
    name: string;
    idle: { url: string } & SheetLayout;
    walk: { url: string } & SheetLayout;
    // Seated typing sheet, if the character has one (pixel-art/npc-type/build.py)
    type?: { url: string } & SheetLayout;
    // Standing work sheet, for working at a desk without a chair (same builds, from Idle's tall frame)
    stand?: { url: string } & SheetLayout;
}

// Case matters: GitHub Pages is case-sensitive.
const assetUrl = (folder: string, file: string) => `${import.meta.env.BASE_URL}assets/sprites/${folder}/${file}`;

export const PLAYER_SPRITE: CharacterSprite = {
    name: 'player',
    idle: { url: assetUrl('player', 'Idle.png'), columns: 3, frames: 2 },
    walk: { url: assetUrl('player', 'Walk.png'), columns: 5, frames: 4 }
};

export const SUSAN_SPRITE: CharacterSprite = {
    name: 'susan',
    idle: { url: assetUrl('susan', 'Idle.png'), columns: 2, frames: 2 },
    walk: { url: assetUrl('susan', 'Walk.png'), columns: 4, frames: 4 },
    type: { url: assetUrl('susan', 'WorkSitting.png'), columns: 2, frames: 2 },
    stand: { url: assetUrl('susan', 'WorkStanding.png'), columns: 2, frames: 2 }
};

export const GLORIA_SPRITE: CharacterSprite = {
    name: 'gloria',
    idle: { url: assetUrl('gloria', 'Idle.png'), columns: 2, frames: 2 },
    walk: { url: assetUrl('gloria', 'Walk.png'), columns: 4, frames: 4 },
    type: { url: assetUrl('gloria', 'WorkSitting.png'), columns: 2, frames: 2 },
    stand: { url: assetUrl('gloria', 'WorkStanding.png'), columns: 2, frames: 2 }
};

export const PLAYER_IDLE_KEY = `${PLAYER_SPRITE.name}-idle`;

// Character pixels inside a cell (x 9..24, feet on the bottom edge), for the feet-only collision body
export const PLAYER_BODY = { width: 11, offsetX: 11 };

export function preloadCharacterSprite(scene: Phaser.Scene, sprite: CharacterSprite) {
    scene.load.spritesheet(`${sprite.name}-idle`, sprite.idle.url, { frameWidth: FRAME_SIZE, frameHeight: FRAME_SIZE });
    scene.load.spritesheet(`${sprite.name}-walk`, sprite.walk.url, { frameWidth: FRAME_SIZE, frameHeight: FRAME_SIZE });
    if (sprite.type) scene.load.spritesheet(`${sprite.name}-type`, sprite.type.url, { frameWidth: FRAME_SIZE, frameHeight: FRAME_SIZE });
    if (sprite.stand) scene.load.spritesheet(`${sprite.name}-stand`, sprite.stand.url, { frameWidth: FRAME_SIZE, frameHeight: FRAME_SIZE });
}

// Seated typing sheet (2 frames per direction, hands alternate); built by pixel-art/player-type/build.py
export const PLAYER_TYPE_KEY = `${PLAYER_SPRITE.name}-type`;
const PLAYER_TYPE = { url: assetUrl('player', 'WorkSitting.png'), columns: 2, frames: 2 };
export const PLAYER_STAND_KEY = `${PLAYER_SPRITE.name}-stand`;
const PLAYER_STAND = { url: assetUrl('player', 'WorkStanding.png'), columns: 2, frames: 2 };

export function preloadPlayerSprite(scene: Phaser.Scene) {
    preloadCharacterSprite(scene, PLAYER_SPRITE);
    scene.load.spritesheet(PLAYER_TYPE_KEY, PLAYER_TYPE.url, { frameWidth: FRAME_SIZE, frameHeight: FRAME_SIZE });
    scene.load.spritesheet(PLAYER_STAND_KEY, PLAYER_STAND.url, { frameWidth: FRAME_SIZE, frameHeight: FRAME_SIZE });
}

export function typeAnimKey(facing: Facing, name = PLAYER_SPRITE.name) {
    return `${name}-type-${facing}`;
}

export function standAnimKey(facing: Facing, name = PLAYER_SPRITE.name) {
    return `${name}-stand-${facing}`;
}

export function animKey(kind: 'idle' | 'walk', facing: Facing, name = PLAYER_SPRITE.name) {
    return `${name}-${kind}-${facing}`;
}

export function createCharacterAnims(scene: Phaser.Scene, sprite: CharacterSprite) {
    const make = (kind: 'idle' | 'walk', layout: SheetLayout, frameRate: number) => {
        DIRECTIONS.forEach((facing, row) => {
            scene.anims.create({
                key: animKey(kind, facing, sprite.name),
                frames: scene.anims.generateFrameNumbers(`${sprite.name}-${kind}`, {
                    start: row * layout.columns,
                    end: row * layout.columns + layout.frames - 1
                }),
                frameRate,
                repeat: -1
            });
        });
    };
    make('idle', sprite.idle, 2);
    make('walk', sprite.walk, 8);
    // the player's work anims are made in createPlayerAnims
    if (sprite.type) makeWorkAnims(scene, `${sprite.name}-type`, sprite.type, typeAnimKey, sprite.name);
    if (sprite.stand) makeWorkAnims(scene, `${sprite.name}-stand`, sprite.stand, standAnimKey, sprite.name);
}

function makeWorkAnims(scene: Phaser.Scene, texture: string, layout: SheetLayout, key: (facing: Facing, name: string) => string, name: string) {
    DIRECTIONS.forEach((facing, row) => {
        scene.anims.create({
            key: key(facing, name),
            frames: scene.anims.generateFrameNumbers(texture, {
                start: row * layout.columns,
                end: row * layout.columns + layout.frames - 1
            }),
            frameRate: 6,
            repeat: -1
        });
    });
}

export function createPlayerAnims(scene: Phaser.Scene) {
    createCharacterAnims(scene, PLAYER_SPRITE);
    makeWorkAnims(scene, PLAYER_TYPE_KEY, PLAYER_TYPE, typeAnimKey, PLAYER_SPRITE.name);
    makeWorkAnims(scene, PLAYER_STAND_KEY, PLAYER_STAND, standAnimKey, PLAYER_SPRITE.name);
}
