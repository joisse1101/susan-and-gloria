## Context

See proposal.md for motivation. Current state (an uncommitted first pass on `feat/init-game`):

- `loadOfficeMap.ts` now holds a generalised `loadTiledMap(scene, obstacles, files, offset, onLayer)` plus an office wrapper. The offset was threaded through by hand: zones, images, depths and bounds each add it, and it uses `offset === (0,0)` as a stand-in for "this is the office" (to limit the physics world to the floor). It also still owns office-only things (the `Room Boundary Bottom` top layer, the Floor layer name, `OFFICE_MAP_KEY`).
- `loadBathroomMap.ts` finds `isJoin` cells in the raw Tiled JSON and calls `loadTiledMap`. It currently places the bathroom overlapping the office's wall column (to be changed to side by side).
- The walk grid (`WalkGrid`), spawn, pathing and chair reach all assume the world starts at (0,0). `WalkGrid` builds `cols = ceil(world.right / CELL)` from 0, so cells at negative x do not exist. That is what keeps coworkers out of the bathroom today, and it is worth keeping.
- The player's physics bounds are widened with `body.setBoundsRectangle`; `Chairs.keepOutOfPlayerArea` plus `resolvePush`'s `keepOut` argument stop pushed chairs and coworkers at the office's left edge.
- `WalkGridOverlay` draws one `WalkGrid` from cell (0,0), so it only covers the office. `PlantOverlay` and `ChairReachOverlay` draw per-object in world px and need no change.
- The bathroom export was re-saved in Sprite Fusion since the first pass (now 20x27 tiles, join tile at col 19 row 13). The join is found by data, so this is only a reminder not to hard-code numbers.

## Goals / Non-Goals

**Goals:**
- One map-agnostic loader that renders a map and builds its collision and walk-behind pieces at any offset, with no office-specific knowledge inside it.
- The office behaves exactly as before the refactor; the bathroom is then built on the same loader.
- Side-by-side placement from the `isJoin` tiles, as specified in `office-multi-map`.
- G and H overlays over every map.

**Non-Goals:**
- Letting Susan or Gloria enter the bathroom, or any interaction (work desks, plants, chairs) inside it.
- Making `WalkGrid`, pathfinding or spawn origin-independent. Coworkers staying on an origin-based grid is the intended boundary.
- A generic N-room layout engine. Two maps, one join; the placement function takes "the neighbouring map" so a third can follow, but no more is built now.
- Changing tuning, art or the Tiled/Sprite Fusion export format.

## Decisions

**1. Split the loader by responsibility, not by map.** `loadOfficeMap.ts` is split into: (a) a map-agnostic `loadTiledMap` module that takes a `MapSpec` (`mapKey`, `tilesetKey`, `baseUrl`, `offset`, `topLayers`, `limitsWorldToLayer?`) and returns `{ size, bounds, walkBehind }`; (b) the pure helpers it already uses (`walkBehind.ts`, tile opaque rects), which stay put; (c) thin wrappers, `loadOfficeMap` and `loadBathroom`, that hold each map's own constants (layer names, floor layer, keys) and nothing else. Office-only behaviour (limit the physics bounds to the Floor layer, `TOP_LAYERS = ['Room Boundary Bottom']`) comes in through the spec, not from guessing "is the office" from `offset === (0,0)`.
*Alternative: keep one function and special-case the offset* (what exists). Rejected: the zero-offset test breaks the moment the office is not at the origin, and every new per-map difference becomes another `if`.

**2. Work in the map's own coordinates and translate at the edges.** The solid-cell array, walk-behind object detection and `cutOf`/`objectAt` stay in local coordinates (they index arrays from 0). The offset is applied in exactly one place for each output: zone creation, image position, image depth (`offset.y + baseY + FEET_LIFT * SPRITE_SCALE`), and the returned piece `bounds`/`baseY`. A small `translate(rect, offset)` helper replaces the scattered `offset.x +`.
*Alternative: negative array indices / a shifted array.* Rejected: invites off-by-one bugs in code that is currently correct.

**3. Pure placement function with a test.** `placeBeside(neighbourJoin, ownJoin, tile)` returns the offset: `x = (neighbour.col - 1 - own.col) * tileW` (own join immediately left of the neighbour's), `y = (neighbour.row - own.row) * tileH`. Join discovery (`joinCells`) takes the parsed Tiled JSON and is pure too. Both are unit-tested without Phaser: the current office/bathroom numbers as one case, a moved join as another, and a gid carrying flip flags in its top bits as a third.

**4. Overlays: add a region, don't make the grid origin-free.** `WalkGrid` stays origin-based. For the bathroom the overlay builds a second `WalkGrid` over the bathroom's rectangle from obstacle bodies translated by `-offset` (a plain object with `getChildren()`, as `testGrid.ts` already does), and draws it translated back by `+offset`. `WalkGridOverlay` accepts a list of regions (`grid`, optional `clearGrid`, `offset`, free-cell colour); the office region keeps today's colours, the bathroom region uses a new "player only" colour for free cells and red for blocked ones. The cell → colour choice is a pure function so it can be tested.
*Alternatives:* (a) give `WalkGrid` an origin and cover the union. Cleanest overlay, but then coworkers could path into the bathroom, undoing a requirement, and it touches spawn, pathing, chair reach and about ten tests. (b) draw the bathroom with the office grid's colours. Rejected: it would show coworker-walkable green where coworkers can never go, which is the misleading thing an overlay must not do.

**5. Keep the player-only boundary exactly where it is.** Physics world bounds and the walk grid remain the office floor; the player's bounds are the union; chairs and coworkers hit the `keepOut` slab. Only the spec text changes (it is now written down). The slab is derived from the physics world's left edge, which is the office's left edge only because the bathroom is to its left; a code comment says so, next to the placement function's matching "own map is left of the neighbour" assumption.

**6. Verify before reuse.** The work lands in two steps so a regression is attributable. Step 1: refactor with the bathroom unloaded and prove the office is unchanged. Step 2: switch the bathroom to the new loader and side-by-side placement. "Unchanged" is checked by (a) the existing 278 tests plus new pure tests, (b) a before/after comparison of what the loader produces for the office (obstacle body rects, walk-behind piece bounds and depths, physics bounds), recorded from the pre-refactor code and compared, and (c) a manual play-through (see tasks.md).

## Risks / Trade-offs

- [Refactor changes office behaviour unnoticed; no Phaser-runtime tests exist] → Record the office loader's observable output from the current code first and assert the refactored code reproduces it; follow with the manual checklist in tasks.md. Any difference stops the work.
- [Hand-written fixtures drift from the real maps] → The comparison reads the real `map.json` and spritesheet (a dev-only dump in the running game), not a copy of the data.
- [A second `WalkGrid` for the overlay costs build time] → Built once at scene creation over a 20x27-tile region (about 3,500 cells at 8 px); negligible, and only the overlay uses it.
- [Side by side leaves two wall columns between the rooms away from the doorway] → That is the requested layout; the doorway openings are on the same rows, so the passage is a two-tile-deep opening.
- [Camera bounds span both maps, so the office is no longer centred when the window is wider than the office] → Accepted; the camera follows the player.
- [Re-exported bathroom art may move the door again] → Placement reads the join tile by data; the placement test covers a moved join.

## Migration Plan

No data or deployment migration. Commit the refactor (step 1) separately from the bathroom re-plumb (step 2) so step 1 can be reverted on its own. The uncommitted first pass in the working tree is the starting point and will be reshaped, not kept as is.

## Open Questions

- Should the overlay's "player only" colour sit with the other overlay colours as a constant at the top of `WalkGridOverlay.ts`? (Default: yes, like the existing colours.)
