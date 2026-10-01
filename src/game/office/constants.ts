// Canvas size in pixels (the Phaser scale mode FITs it to the page)
export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 400;
// Integer scale keeps art pixels square on the 600x400 canvas
export const SPRITE_SCALE = 2;
// Height (unscaled px) of the collision body at a character's feet
export const FEET_HEIGHT = 8;
// Above any y-based sprite depth (max canvas height is 400)
export const SPEECH_DEPTH = 10000;
// Floors and rugs draw below every y-sorted sprite (whose depth is >= 0)
export const FLOOR_DEPTH = -2;
export const RUG_DEPTH = -1;
