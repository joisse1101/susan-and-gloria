// Everything that sets how pushing and pulling feel, in one place. Edit, save, and Vite reloads the game.
// Speeds are px/s, drag is px/s^2, times are ms.

// Mass only matters when two movable bodies meet: the heavier one gives way later.
// Raise CHAIR_MASS and chairs resist being shoved by (or into) lighter things.
export const CHAIR_MASS = 1;
export const COWORKER_MASS = 2;

// How fast a free body slows down. Raise it and a shoved body coasts a shorter distance.
// COWORKER_DRAG only applies to a coworker that was shoved: raise it and it stops sooner, 0 and it stops dead.
export const CHAIR_DRAG = 600;
export const COWORKER_DRAG = 600;

// How long a rolled chair (one pushed away by whoever stood up) coasts under its temporary drag before normal drag returns.
// Raise it for a longer slide.
export const ROLL_MS = 500;

// Top speed of a chair. Raise it and a chair can be flung faster, and it can keep up with a faster player.
export const CHAIR_MAX_SPEED = 120;

// Top speed of each coworker, however they are moving (walking, shoved, pulled). One per coworker, so they can differ.
// Their normal walking speed is this times COWORKER_WALK_FRACTION, so raising a coworker's max also speeds up their walk.
export const COWORKER_MAX_SPEED = { susan: 80, gloria: 80 };
// How much of its max speed a coworker walks at normally (0.5 of 80 is the old walking speed of 40)
export const COWORKER_WALK_FRACTION = 0.5;

// The player's walking speed.
export const PLAYER_WALK_SPEED = 160;

// The player's speed while pulling (Shift) or pushing, per thing. When a push moves several things, the slowest one's speed wins.
// Keep the chair values near CHAIR_MAX_SPEED or gaps open up behind the player. A coworker is also held to its own COWORKER_MAX_SPEED, so the lower of the two applies.
export const PULL_CHAIR_SPEED = CHAIR_MAX_SPEED;
export const PULL_COWORKER_SPEED = 90;
export const PUSH_CHAIR_SPEED = CHAIR_MAX_SPEED;
export const PUSH_COWORKER_SPEED = 90;
