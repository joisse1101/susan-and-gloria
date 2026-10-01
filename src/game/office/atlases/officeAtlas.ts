import type { AtlasFrame } from './types';

export const OFFICE_ATLAS_KEY = 'office';

// Case matters: GitHub Pages is case-sensitive.
export const OFFICE_ATLAS_URL = `${import.meta.env.BASE_URL}assets/office/PixelOfficeAssets.png`;

// Frame rectangles measured from PixelOfficeAssets.png (256x160, irregular layout).
export const OFFICE_FRAMES = {
    player: { x: 2, y: 105, w: 15, h: 23 },
    susan: { x: 3, y: 132, w: 17, h: 23 },
    gloria: { x: 22, y: 132, w: 17, h: 23 },
    desk: { x: 115, y: 47, w: 40, h: 16 },
    deskShort: { x: 85, y: 47, w: 26, h: 16 },
    chair: { x: 6, y: 41, w: 11, h: 22 },
    sofaGrey: { x: 119, y: 66, w: 33, h: 15 },
    sofaGreen: { x: 120, y: 102, w: 33, h: 16 },
} as const satisfies Record<string, AtlasFrame>;

export type OfficeFrameName = keyof typeof OFFICE_FRAMES;
