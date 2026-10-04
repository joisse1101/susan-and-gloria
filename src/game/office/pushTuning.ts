// Everything that sets how pushing and pulling feel, in one place. Edit, save, and Vite reloads the game.
// Speeds are px/s, drag is px/s^2, times are ms.

// Mass only matters when two movable bodies meet: the heavier one gives way later.
// Raise CHAIR_MASS and chairs resist being shoved by (or into) lighter things.
export const CHAIR_MASS = 1;
export const COWORKER_MASS = 1;

// How fast a free body slows down. Raise it and a shoved body coasts a shorter distance.
// COWORKER_DRAG is 0 because coworkers set their own velocity every frame; raise it to make a shoved coworker slide to a stop.
export const CHAIR_DRAG = 600;
export const COWORKER_DRAG = 0;

// How long a rolled chair (one pushed away by whoever stood up) coasts under its temporary drag before normal drag returns.
// Raise it for a longer slide.
export const ROLL_MS = 500;

// Top speed of a chair. Raise it and a chair can be flung faster, and it can keep up with a faster player.
export const CHAIR_MAX_SPEED = 120;

// The player's walking speed, and the speed while pulling something. Pulling is capped at CHAIR_MAX_SPEED so
// the chair keeps up; raise both together.
export const PLAYER_WALK_SPEED = 160;
export const PULL_SPEED = CHAIR_MAX_SPEED;
// The speed while driving a push chain (read once pushing at walking pace is wired in). Raise it and the player shoves faster.
export const PLAYER_PUSH_SPEED = PULL_SPEED;
