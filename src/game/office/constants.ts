// Canvas size in pixels (the Phaser scale mode FITs it to the page)
// Matches the Tiled map: 20 x 13 tiles of 32px
export const TILE_SIZE = 32;
export const CANVAS_WIDTH = 20 * TILE_SIZE;
export const CANVAS_HEIGHT = 13 * TILE_SIZE;
// Integer scale keeps art pixels square on the canvas
export const SPRITE_SCALE = 2;
// Height (unscaled px) of the collision body at a character's feet
export const FEET_HEIGHT = 8;
// Above any y-based sprite depth (max canvas height is 416)
export const SPEECH_DEPTH = 10000;
// Floors and rugs draw below every y-sorted sprite (whose depth is >= 0)
export const FLOOR_DEPTH = -2;
export const RUG_DEPTH = -1;
// Tile layers sit below every y-sorted sprite, except the "top" layer which is drawn over them
export const MAP_DEPTH = -2;
export const MAP_TOP_DEPTH = SPEECH_DEPTH - 1;
