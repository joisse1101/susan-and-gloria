// Tuning for watering the plant. Everything here is meant to be adjusted by hand.

// How far (px) from the plant's edge on every side an actor counts as in reach
export const WATER_REACH_PX = 16;

// How long (ms) an actor waters once it is at the plant
export const WATER_DURATION_MS = 8000;

// How long (ms) the plant rests after anyone finished, was interrupted from, or gave up watering it. Shared by every actor.
export const WATER_COOLDOWN_MS = 5000;

// How far (sprite px) the water stream moves up and down while watering, and how long (ms) one full up-and-down takes.
// The movement is rounded to whole sprite pixels, so 2 gives three positions. 0 keeps the stream still.
export const WATER_BOB_PX = 2;
export const WATER_BOB_MS = 400;

// A trip to the plant that takes longer than this (ms) is given up
export const WATER_GIVE_UP_MS = 20000;
