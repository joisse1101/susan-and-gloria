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

interface CharacterSprite {
    name: string;
    idle: { url: string } & SheetLayout;
    walk: { url: string } & SheetLayout;
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
    walk: { url: assetUrl('susan', 'Walk.png'), columns: 4, frames: 4 }
};

export const PLAYER_IDLE_KEY = `${PLAYER_SPRITE.name}-idle`;

// Character pixels inside a cell (x 9..24, feet on the bottom edge), for the feet-only collision body
export const PLAYER_BODY = { width: 11, offsetX: 11 };

export function preloadCharacterSprite(scene: Phaser.Scene, sprite: CharacterSprite) {
    scene.load.spritesheet(`${sprite.name}-idle`, sprite.idle.url, { frameWidth: FRAME_SIZE, frameHeight: FRAME_SIZE });
    scene.load.spritesheet(`${sprite.name}-walk`, sprite.walk.url, { frameWidth: FRAME_SIZE, frameHeight: FRAME_SIZE });
}

export function preloadPlayerSprite(scene: Phaser.Scene) {
    preloadCharacterSprite(scene, PLAYER_SPRITE);
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
}

export function createPlayerAnims(scene: Phaser.Scene) {
    createCharacterAnims(scene, PLAYER_SPRITE);
}
