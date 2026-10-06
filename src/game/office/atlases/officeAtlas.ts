import type { AtlasFrame } from './types';

export const OFFICE_ATLAS_KEY = 'office';

// Case matters: GitHub Pages is case-sensitive.
export const OFFICE_ATLAS_URL = `${import.meta.env.BASE_URL}assets/office/PixelOfficeAssets.png`;

// Every sprite on PixelOfficeAssets.png (256x160, irregular layout), found by tracing opaque pixels.
// Names for small props are best guesses; rename freely, nothing else depends on the unused ones.
export const OFFICE_FRAMES = {
    // Backdrop
    skyClouds: { x: 0, y: 0, w: 256, h: 38 },
    // Characters
    player: { x: 2, y: 105, w: 15, h: 23 },
    susan: { x: 3, y: 132, w: 17, h: 23 },
    gloria: { x: 22, y: 132, w: 17, h: 23 },
    redhead: { x: 19, y: 104, w: 19, h: 24 },
    glassesGuy: { x: 40, y: 107, w: 13, h: 21 },
    catBlack: { x: 65, y: 129, w: 16, h: 13 },
    catOrange: { x: 59, y: 146, w: 24, h: 11 },
    // Desks & tables
    desk: { x: 115, y: 47, w: 40, h: 16 },
    deskShort: { x: 85, y: 47, w: 26, h: 16 },
    whiteTable: { x: 84, y: 70, w: 26, h: 20 },
    partitionBlue: { x: 3, y: 68, w: 73, h: 24 },
    // Chairs
    chair: { x: 6, y: 41, w: 11, h: 22 },
    chairYellow: { x: 19, y: 41, w: 11, h: 22 },
    chairGreen: { x: 32, y: 41, w: 11, h: 22 },
    chairBlue: { x: 45, y: 41, w: 11, h: 22 },
    chairWhite: { x: 58, y: 41, w: 11, h: 22 },
    chairGrey: { x: 71, y: 41, w: 11, h: 22 },
    // Sofas
    sofaGrey: { x: 119, y: 66, w: 33, h: 15 },
    sofaBlue: { x: 120, y: 83, w: 33, h: 16 },
    sofaGreen: { x: 120, y: 102, w: 33, h: 16 },
    sofaOrange: { x: 120, y: 121, w: 33, h: 16 },
    // Windows, doors & wall panels
    wallPanelGrey: { x: 171, y: 44, w: 79, h: 17 },
    doorYellowA: { x: 188, y: 63, w: 17, h: 19 },
    doorPost: { x: 207, y: 63, w: 4, h: 27 },
    doorYellowB: { x: 213, y: 63, w: 17, h: 19 },
    windowA: { x: 59, y: 96, w: 26, h: 21 },
    windowNote: { x: 88, y: 96, w: 26, h: 21 },
    windowTall: { x: 98, y: 120, w: 16, h: 31 },
    // Wall decor
    flagIndia: { x: 179, y: 94, w: 12, h: 9 },
    flagUK: { x: 193, y: 94, w: 12, h: 9 },
    flagUS: { x: 207, y: 94, w: 12, h: 9 },
    posterBlue: { x: 222, y: 94, w: 6, h: 8 },
    posterOrange: { x: 230, y: 94, w: 6, h: 8 },
    posterSunset: { x: 239, y: 94, w: 11, h: 8 },
    calendar: { x: 234, y: 81, w: 17, h: 11 },
    clockDigital: { x: 159, y: 108, w: 19, h: 6 },
    // Appliances & machines
    vendingMachine: { x: 159, y: 123, w: 24, h: 34 },
    drinkFridge: { x: 184, y: 126, w: 24, h: 31 },
    copier: { x: 233, y: 106, w: 15, h: 19 },
    printerSmall: { x: 200, y: 107, w: 9, h: 9 },
    shredder: { x: 159, y: 91, w: 7, h: 11 },
    deviceWhite: { x: 169, y: 95, w: 8, h: 7 },
    // Bins & plants
    binGreen: { x: 116, y: 143, w: 9, h: 14 },
    binRed: { x: 126, y: 143, w: 9, h: 14 },
    binBlue: { x: 136, y: 143, w: 9, h: 14 },
    binBlueTall: { x: 147, y: 140, w: 9, h: 17 },
    plant: { x: 170, y: 65, w: 14, h: 19 },
    // Desk clutter
    folderRed: { x: 211, y: 119, w: 11, h: 8 },
    folderBlue: { x: 211, y: 129, w: 11, h: 8 },
    folderGreen: { x: 211, y: 140, w: 11, h: 8 },
    folderWhite: { x: 211, y: 151, w: 10, h: 6 },
    paperA: { x: 183, y: 107, w: 6, h: 8 },
    paperB: { x: 192, y: 107, w: 6, h: 9 },
    stickyOrange: { x: 217, y: 107, w: 2, h: 3 },
    stickyGreen: { x: 221, y: 109, w: 2, h: 3 },
    stickyRed: { x: 217, y: 112, w: 2, h: 3 },
    // Misc
    stripChecker: { x: 233, y: 135, w: 5, h: 12 },
    pillarGrey: { x: 240, y: 128, w: 6, h: 19 },
    chip: { x: 233, y: 148, w: 4, h: 3 },
} as const satisfies Record<string, AtlasFrame>;

export type OfficeFrameName = keyof typeof OFFICE_FRAMES;
