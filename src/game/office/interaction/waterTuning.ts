// Tuning for watering the plant. Everything here is meant to be adjusted by hand.

// How far (in tiles) from the plant's edge on every side an actor counts as in reach: 0.5 = half a tile
export const WATER_REACH_TILES = 0.5;

// How long (ms) an actor waters once it is at the plant
export const WATER_DURATION_MS = 8000;

// How long (ms) the plant rests after anyone finished, was interrupted from, or gave up watering it. Shared by every actor.
export const WATER_COOLDOWN_MS = 20000;

// A trip to the plant that takes longer than this (ms) is given up
export const WATER_GIVE_UP_MS = 20000;
