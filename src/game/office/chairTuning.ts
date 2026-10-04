// Everything that sets how a chair trip copes with tight spaces and stuck chairs, in one place. Edit, save, and Vite
// reloads the game. Sizes are in 8 px grid cells or px, times are ms.

// Room the dragged chair needs on its route, in cells around the cell it is centred on: `side` cells left and right,
// `up` rows above, `down` rows below. The chair is 28x16 px, so 5x3 cells (40x24 px) leaves about 6 px sideways and
// 4 px up and down for it to swing at corners. Smaller values let chairs through tighter gaps (and jam more),
// larger ones make walkers skip chairs they could have fetched.
export const CHAIR_CLEARANCE_CELLS = { side: 2, up: 1, down: 1 };

// A towed chair counts as stuck when it trails this many px further behind the walker than the rope allows...
export const JAM_MARGIN_PX = 12;
// ...for this long. Raise either and a wedged chair is tolerated longer before the walker lets go of it.
export const JAM_TIME_MS = 1500;

// How long a chair that jammed is left alone by every chair trip. The cooldown stays with the chair if it is moved.
// 0 and it can be fetched again at once.
export const JAMMED_CHAIR_COOLDOWN_MS = 60000;
