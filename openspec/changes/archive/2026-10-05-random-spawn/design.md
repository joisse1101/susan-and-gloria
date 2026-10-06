## Context

`OfficeScene.create()` builds `walkGrid` and `clearGrid` (8 px cells, `WalkGrid.ts`) from the static solids *before* it creates the player, coworkers and chairs, then places them at literal coordinates. Both grids already answer "can a walker / a chair stand here". The coworkers' and player's collision body is one cell tall and 22 px wide (`PLAYER_BODY`, `FEET_HEIGHT`), lifted `FEET_LIFT` off the sprite's bottom, so the grid describes the *body*, not the sprite. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- One pure function that, given the two grids, a random source and what to place, returns a position for each body.
- No change to `WalkGrid`; no new map metadata.

**Non-Goals:**
- Respawning, or re-randomising after load.
- Choosing "sensible" spots (near the door, away from desks) beyond keeping out of interaction zones.
- Randomising how many chairs there are.

## Decisions

**Reachable = in the largest 4-connected region of `walkGrid`.** Flood-fill the walkable cells once, keep the biggest region, and draw every candidate from it. A sealed pocket is walkable by the grid's rules but nobody could ever leave it. *Alternative:* flood-fill from a fixed seed (the old player spot). Rejected: it reintroduces a hand-set coordinate that breaks on the next map edit.

**Chairs use `clearGrid` cells that are also in that region.** `clearGrid` walkable cells are a subset of `walkGrid`'s (a larger footprint), so intersecting with the main region keeps chairs on the floor people can reach. This also keeps a spawned chair inside the `chairReach` route rules.

**Place by body centre, not sprite position.** The grid describes the feet body. For each pick, compute the offset between the sprite's `body.center` and its position, and set the position so `body.center` is the cell centre. Otherwise the sprite is a few px off and can start inside a solid.

**Interaction zones are filtered out of the candidates first.** Each candidate cell's body rectangle is tested against a list of zone rects (every desk's work zone, every plant's reach zone) and dropped if it overlaps one. `pickSpawns` takes the zones as plain `Rect`s, so it stays pure; the scene collects them. Desk zones come from a small accessor on `WorkInteraction` (alongside `workSpots()`/`targets()`), plant zones from `reachZone(plant, WATER_REACH_PX)`. Chairs use the same list, so no chair starts where a coworker needs to stand to water. *Alternative:* filter only humans. Rejected: a chair in a work zone is not stuck, but a coworker heading there would have to shove it, which looks like a bug at load.

**Minimum gap by rejection, relaxed on failure.** Shuffle the candidate cells with the injected RNG, take cells in order, and skip any closer than `gap` px to one already taken. If a body cannot be placed, halve the gap and retry, down to 0. Only if it still cannot be placed does the zone rule go, and the body is then placed from the unfiltered cells; each relaxation logs to the console. This always terminates because a cell can be used once. Characters and chairs share one gap pass so a chair never lands under a person. The gap relaxes before the zones because overlapping bodies are a worse start than standing at a desk.

**Pure and seedable.** `pickSpawns(grid, clearGrid, request, rng)` returns `{ id, x, y }[]`. `rng` defaults to `Math.random` at the call site only. Tests pass a fixed sequence; this also gives a way to reproduce a bad layout by logging the seed later if needed.

**Order in `create()`.** Compute all spawns once, after both grids exist and after `WorkInteraction` has collected its desks and the plants are built (the zones come from them), then use the results where the player, `createSheetCoworker` and `chairs.add` are called today. Spawn positions are only read at creation, so nothing needs to change after that.

## Risks / Trade-offs

- [A tiny reachable region (or none) after a bad map edit] → the gap relaxation and console message; if no cell exists at all, throw a clear error naming the map, as for the missing tileset.
- [Zones remove many cells on a small map, leaving few candidates and a clustered layout] → the gap relaxes first and the zones last, with console messages saying which.
- [Random layouts make bugs harder to reproduce] → seedable function; add seed logging only if it proves needed.
