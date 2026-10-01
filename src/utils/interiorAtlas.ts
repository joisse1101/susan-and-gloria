import type { AtlasFrame } from './officeAtlas';

export const INTERIOR_ATLAS_KEY = 'interior';

// Case matters: GitHub Pages is case-sensitive.
export const INTERIOR_ATLAS_URL = `${import.meta.env.BASE_URL}assets/office/InteriorTilesLITE.png`;

// Frame rectangles cut from InteriorTilesLITE.png (512x448, 32px grid but objects are irregular).
// Floors and rugs sit under everything; see docs/interior-atlas-preview.png for a labelled map.
export const INTERIOR_FRAMES = {
    // Floors (tile these)
    floorWood: { x: 0, y: 0, w: 32, h: 32 },
    floorGrayCheck: { x: 0, y: 32, w: 32, h: 32 },
    floorDarkCheck: { x: 0, y: 64, w: 32, h: 32 },
    floorBlueTile: { x: 0, y: 100, w: 32, h: 32 },
    floorTerracottaTile: { x: 160, y: 100, w: 32, h: 32 },
    floorBlue: { x: 0, y: 96, w: 128, h: 64 },
    floorTerracotta: { x: 128, y: 96, w: 128, h: 64 },
    // Rugs
    rugBeige: { x: 60, y: 27, w: 136, h: 69 },
    rugRed: { x: 432, y: 8, w: 64, h: 79 },
    // Walls (hollow room outlines)
    wallTrim: { x: 96, y: 0, w: 32, h: 5 },
    wallRoomBox: { x: 224, y: 0, w: 64, h: 64 },
    wallTall: { x: 288, y: 26, w: 32, h: 70 },
    wallTopNotch: { x: 320, y: 0, w: 32, h: 37 },
    wallNook: { x: 352, y: 32, w: 36, h: 32 },
    wallBottomRight: { x: 348, y: 64, w: 68, h: 32 },
    // Wall decor
    windowA: { x: 259, y: 110, w: 26, h: 36 },
    windowB: { x: 291, y: 110, w: 26, h: 36 },
    windowSmall: { x: 323, y: 106, w: 26, h: 16 },
    curtains: { x: 352, y: 106, w: 32, h: 38 },
    wallClock: { x: 326, y: 134, w: 21, h: 21 },
    corkboard: { x: 3, y: 172, w: 26, h: 16 },
    paintingLandscape: { x: 298, y: 230, w: 46, h: 22 },
    paintingPortrait: { x: 361, y: 230, w: 15, h: 22 },
    mirror: { x: 7, y: 256, w: 18, h: 20 },
    wallShelf: { x: 293, y: 264, w: 23, h: 13 },
    // Kitchen
    counterA: { x: 128, y: 173, w: 64, h: 19 },
    counterB: { x: 160, y: 192, w: 64, h: 16 },
    counterBack: { x: 192, y: 181, w: 32, h: 11 },
    archFrame: { x: 224, y: 160, w: 64, h: 80 },
    stove: { x: 96, y: 208, w: 32, h: 31 },
    fridge: { x: 130, y: 196, w: 28, h: 42 },
    sinkSmall: { x: 200, y: 243, w: 18, h: 12 },
    trayBrown: { x: 170, y: 248, w: 14, h: 6 },
    // Desks & tables
    deskLarge: { x: 386, y: 115, w: 92, h: 59 },
    endTableA: { x: 483, y: 116, w: 26, h: 20 },
    endTableB: { x: 480, y: 178, w: 32, h: 24 },
    // Chairs & seating
    officeChairA: { x: 32, y: 173, w: 32, h: 46 },
    officeChairB: { x: 32, y: 237, w: 32, h: 46 },
    chairFrontA: { x: 393, y: 194, w: 18, h: 29 },
    chairSideA: { x: 426, y: 194, w: 15, h: 28 },
    chairFrontB: { x: 393, y: 226, w: 18, h: 29 },
    chairSideB: { x: 426, y: 227, w: 15, h: 28 },
    floorCushion: { x: 456, y: 207, w: 18, h: 11 },
    poufA: { x: 461, y: 237, w: 10, h: 11 },
    poufB: { x: 491, y: 236, w: 10, h: 11 },
    // Sofas
    sofaLongA: { x: 322, y: 339, w: 92, h: 45 },
    loveseatA: { x: 418, y: 338, w: 60, h: 45 },
    sofaLongB: { x: 322, y: 403, w: 92, h: 45 },
    loveseatB: { x: 418, y: 403, w: 60, h: 45 },
    sofaArmA: { x: 481, y: 320, w: 31, h: 64 },
    sofaArmB: { x: 481, y: 384, w: 31, h: 63 },
    // Beds
    bedA: { x: 160, y: 270, w: 96, h: 64 },
    bedB: { x: 224, y: 352, w: 96, h: 64 },
    // Storage & plants
    bookshelfA: { x: 320, y: 160, w: 32, h: 47 },
    bookshelfB: { x: 352, y: 160, w: 32, h: 47 },
    plant: { x: 294, y: 160, w: 23, h: 39 },
    // Electronics
    tv: { x: 397, y: 264, w: 38, h: 24 },
    tvCabinetA: { x: 457, y: 256, w: 49, h: 32 },
    tvCabinetB: { x: 440, y: 288, w: 49, h: 32 },
    laptop: { x: 73, y: 273, w: 15, h: 14 },
    phoneA: { x: 74, y: 178, w: 11, h: 14 },
    phoneB: { x: 74, y: 207, w: 11, h: 12 },
    phoneC: { x: 74, y: 243, w: 11, h: 12 },
    // Lamps & small decor
    floorLamp: { x: 266, y: 263, w: 11, h: 36 },
    tableLamp: { x: 299, y: 296, w: 11, h: 20 },
    vase: { x: 331, y: 300, w: 10, h: 15 },
    trinket: { x: 338, y: 271, w: 8, h: 10 },
    openBook: { x: 362, y: 276, w: 13, h: 8 },
    bottleA: { x: 2, y: 210, w: 3, h: 8 },
    bottleB: { x: 25, y: 242, w: 4, h: 8 },
    // Bathroom
    pedestalSink: { x: 101, y: 272, w: 21, h: 29 },
    sinkBasin: { x: 134, y: 272, w: 21, h: 16 },
    bathtubEmpty: { x: 97, y: 320, w: 30, h: 62 },
    bathtubFull: { x: 129, y: 320, w: 30, h: 62 },
    toiletFrontA: { x: 10, y: 293, w: 14, h: 24 },
    toiletBackA: { x: 10, y: 326, w: 14, h: 23 },
    toiletFrontB: { x: 9, y: 373, w: 14, h: 24 },
    toiletBackB: { x: 42, y: 375, w: 14, h: 23 },
    toiletSideA: { x: 45, y: 292, w: 19, h: 22 },
    toiletSideB: { x: 77, y: 291, w: 19, h: 22 },
    toiletSideC: { x: 32, y: 324, w: 19, h: 22 },
    toiletSideD: { x: 64, y: 323, w: 19, h: 22 },
} as const satisfies Record<string, AtlasFrame>;

export type InteriorFrameName = keyof typeof INTERIOR_FRAMES;
