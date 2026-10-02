import Phaser from 'phaser';

export const PLAYER_IDLE_KEY = 'player-idle';
export const PLAYER_WALK_KEY = 'player-walk';

// Case matters: GitHub Pages is case-sensitive.
const IDLE_URL = `${import.meta.env.BASE_URL}assets/sprites/player/Idle.png`;
const WALK_URL = `${import.meta.env.BASE_URL}assets/sprites/player/Walk.png`;

// Sheets are 32px cells, one row per direction in this order. The last column of each is the row label, not a frame.
const FRAME_SIZE = 32;
const DIRECTIONS = ['down', 'up', 'right', 'left'] as const;
export type Facing = (typeof DIRECTIONS)[number];

const IDLE = { columns: 3, frames: 2 };
const WALK = { columns: 5, frames: 4 };

// Character pixels inside a cell (x 9..24, feet on the bottom edge), for the feet-only collision body
export const PLAYER_BODY = { width: 11, offsetX: 11 };

export function preloadPlayerSprite(scene: Phaser.Scene) {
    scene.load.spritesheet(PLAYER_IDLE_KEY, IDLE_URL, { frameWidth: FRAME_SIZE, frameHeight: FRAME_SIZE });
    scene.load.spritesheet(PLAYER_WALK_KEY, WALK_URL, { frameWidth: FRAME_SIZE, frameHeight: FRAME_SIZE });
}

export function animKey(kind: 'idle' | 'walk', facing: Facing) {
    return `player-${kind}-${facing}`;
}

export function createPlayerAnims(scene: Phaser.Scene) {
    DIRECTIONS.forEach((facing, row) => {
        scene.anims.create({
            key: animKey('idle', facing),
            frames: scene.anims.generateFrameNumbers(PLAYER_IDLE_KEY, {
                start: row * IDLE.columns,
                end: row * IDLE.columns + IDLE.frames - 1
            }),
            frameRate: 2,
            repeat: -1
        });
        scene.anims.create({
            key: animKey('walk', facing),
            frames: scene.anims.generateFrameNumbers(PLAYER_WALK_KEY, {
                start: row * WALK.columns,
                end: row * WALK.columns + WALK.frames - 1
            }),
            frameRate: 8,
            repeat: -1
        });
    });
}
