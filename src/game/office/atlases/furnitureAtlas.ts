import type { AtlasFrame } from './types';

export const FURNITURE_ATLAS_KEY = 'furniture';

// Case matters: GitHub Pages is case-sensitive.
export const FURNITURE_ATLAS_URL = `${import.meta.env.BASE_URL}assets/office/ChairSheet.png`;

// ChairSheet.png is 256x32: eight 32x32 frames in a row, named by the direction the chair faces
// (S faces the camera). Source: pixel-art/chair/build.py
export const CHAIR_DIRECTIONS = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'] as const;
export type ChairDirection = (typeof CHAIR_DIRECTIONS)[number];

// ChairHandleSheet.png has the same cells holding only the parts drawn in front of a seated character
// (armrests, or the whole chair for the back views): chair + character + handle
export const HANDLE_ATLAS_KEY = 'furniture-handle';
export const HANDLE_ATLAS_URL = `${import.meta.env.BASE_URL}assets/office/ChairHandleSheet.png`;

export const FURNITURE_FRAMES = Object.fromEntries(
    CHAIR_DIRECTIONS.map((dir, i) => [`chair${dir}`, { x: i * 32, y: 0, w: 32, h: 32 }])
) as Record<`chair${ChairDirection}`, AtlasFrame>;

export type FurnitureFrameName = keyof typeof FURNITURE_FRAMES;
