## Context

Coworkers share one feet-only hitbox (see `PLAYER_BODY`, `FEET_HEIGHT`, `FEET_LIFT`): 11 x 4 source px, so **22 x 8 px on screen** at `SPRITE_SCALE` 2. `Wander.ts` today picks a random angle and velocity and replans only when `blocked`/`touching` fires. Static collision comes from `loadOfficeMap` (per-tile opaque rects) and the `obstacles` group; loose chairs are dynamic and pushable. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Wander along collision-free shortest paths to randomly chosen reachable spots.
- Recover when blocked by the player or the other coworker.

**Non-Goals:**
- Changing work-zone walking (`WorkInteraction`) or chair fetching (`NpcSeats`).
- Path smoothing (see Optional follow-up below).

## Decisions

- **8x8 px grid.** The hitbox is 8 px tall, so one cell row matches it exactly; 8 px wide keeps paths smooth (a 16 px cell was considered and rejected as too coarse for a 22 px body). About 80 x 52 cells for a 640 x 416 map, trivial for A*.
- **Walkable = 3 cells wide, 1 tall.** The 22 px body fits in 24 px (3 cells) when centred on a cell. A cell is walkable only if it and its left and right neighbours are free of static obstacles. This is equivalent to inflating obstacles by the hitbox, so paths are followed by centre point.
- **Position measured from `body.center`.** The body sits low in the sprite, so sprite `x/y` is a few px above the feet. The grid models where feet can stand, and `WorkInteraction`/`NpcSeats` already use `body.center`.
- **8-direction movement with no corner cutting.** A diagonal step is allowed only if both orthogonal neighbours are walkable. Orthogonal cost 1, diagonal cost ~1.41, octile heuristic (Manhattan would overestimate). Velocity is normalised so diagonals are not ~41% faster.
- **Targets come from the reachable set.** Flood-fill from the current cell and pick randomly within it, so A* never fails on a walled-off cell.
- **Static grid built once** after `loadOfficeMap` from collision rects and `obstacles`. Dynamic things are not in the grid.
- **Chairs ignored.** They can be pushed, so they are not obstacles.
- **Replan on bump.** Reuse the existing `blocked`/`touching` check in `Wander.ts`. On a bump, replan from the current cell and pick a new target.
- **Debug overlay.** A toggleable overlay colours each cell green (walkable) or red (blocked) so the grid can be checked by eye. It is a development aid, not a player-facing feature.
- **Execution.** Merge runs in the same direction into waypoints, steer to each, and snap when within ~1-2 px.

## Risks / Trade-offs

- **Staircase look** from grid-aligned diagonal travel -> accepted for now; see Optional follow-up.
- **Thrashing** when the player blocks a doorway -> cap consecutive replans or pause briefly before the next attempt.
- **Diagonal facing** is a new case for `updateSheetAnim`, since random-angle wander already produced diagonals but paths will produce them deliberately -> verify facing looks right when implementing.

## Optional follow-up (not in scope; revisit if paths look jagged)

Line-of-sight path smoothing: after A*, drop waypoints whenever a straight line between two waypoints stays walkable for the full 22 x 8 footprint. This removes most of the staircase look but needs a swept footprint check. Only do it if the basic version looks too mechanical in the game.
