// Tiled map tile size; the map's pixel size is read from map.json at runtime
export const TILE_SIZE = 32;
// Integer camera zoom keeps art pixels square; the camera scrolls when the map is larger than the window
export const CAMERA_ZOOM = 1;
// Only on an axis where the map is smaller than the window: nudge it from dead centre, in px. Positive = up, negative = down
export const SMALL_MAP_SHIFT_Y = 75;
// Integer scale keeps art pixels square on the canvas
export const SPRITE_SCALE = 2;
// Height (unscaled px) of the collision body at a character's feet
export const FEET_HEIGHT = 4;
// How far (unscaled px) that body sits above the bottom of the sprite cell: the shoes end 2px up, the rows below are only the shadow
export const FEET_LIFT = 2;
// Above any y-based sprite depth (max canvas height is 416)
export const SPEECH_DEPTH = 10000;
// Floors and rugs draw below every y-sorted sprite (whose depth is >= 0)
export const FLOOR_DEPTH = -2;
export const RUG_DEPTH = -1;
// Tile layers sit below every y-sorted sprite, except the "top" layer which is drawn over them
export const MAP_DEPTH = -2;
export const MAP_TOP_DEPTH = SPEECH_DEPTH - 1;
// Every solid object (wall, furniture) can be walked into from its top edge: the open strip is this many map px deep,
// capped at WALK_BEHIND_STRIP_FRACTION of the object's height so short objects keep a blocking part. 0 turns it off.
export const WALK_BEHIND_STRIP_PX = 16;
export const WALK_BEHIND_STRIP_FRACTION = 2 / 3;
// An object a character is standing behind fades to this alpha (1 = opaque), over WALK_BEHIND_FADE_MS for the full 0 to 1
export const WALK_BEHIND_ALPHA = 0.45;
export const WALK_BEHIND_FADE_MS = 150;
