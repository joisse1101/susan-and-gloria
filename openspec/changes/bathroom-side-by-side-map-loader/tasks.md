## 1. Baseline the office (before touching the loader)

- [x] 1.1 Stash or park the uncommitted bathroom first pass so the office loads alone, run `npm test`, `npm run lint` and `npx tsc -b`, and record that all pass (278 tests)
- [x] 1.2 Add a dev-only dump of the office loader's output (obstacle body rects, walk-behind piece bounds/`baseY`/depth, physics world bounds, `mapSize`) behind a `?dumpMap` query flag or console helper, run it on the unrefactored office, and save the result as `openspec/changes/bathroom-side-by-side-map-loader/office-baseline.json`; verify the file is non-empty and has all four sections
- [x] 1.3 Play the office once as the reference and write the manual checklist (task 6.1) from what you see; verify the checklist covers desks, plant, walls, behind-fading, chairs, spawn and the G/H/C/P overlays

## 2. Pure logic with tests

- [x] 2.1 Add `joinCells(map)` (Tiled JSON → cells of tiles whose tileset entry has `isJoin = true`, flip bits stripped) as a pure module and verify unit tests: one join, no join, flipped gid, join on several layers
- [x] 2.2 Add `placeBeside(neighbourJoin, ownJoin, tile)` returning the offset that puts the own join in the cell directly left of the neighbour's, same row, and verify unit tests: current office (0,12) / bathroom (19,13), a moved door, and that the two maps share no cell
- [x] 2.3 Add a pure `overlayCellColour(walkable, clearWalkable | undefined, region)` and verify unit tests for office green/yellow/red and bathroom player-only/red

## 3. Abstract the map loader (office only, bathroom still unloaded)

- [x] 3.1 Define `MapSpec` (`mapKey`, `tilesetKey`, `baseUrl`, `offset`, `topLayers`, optional floor layer that limits the physics world) and move the body of `loadTiledMap` into a map-agnostic module with no office constants, replacing the `offset === (0,0)` check; verify `npx tsc -b` is clean
- [x] 3.2 Apply the offset in one place per output (zones, images, depths, piece bounds/`baseY`) via a `translate` helper, keeping the solid-cell analysis in local coordinates; verify `npm test` still passes
- [x] 3.3 Reduce `loadOfficeMap.ts` to a wrapper holding only the office's constants (keys, `Room Boundary Bottom`, `Floor`) and verify it exports the same `loadOfficeMap` / `preloadOfficeMap` / `WalkBehindPiece` the scene uses
- [x] 3.4 Run the dev dump on the refactored office and verify it equals `office-baseline.json` (same body rects, same pieces and depths, same bounds); any difference blocks the next group

## 4. Verify the office is unchanged (human + code)

- [x] 4.1 Run `npm test`, `npm run lint`, `npm run build` and verify all pass
- [x] 4.2 Do the manual checklist from 1.3 against `npm run dev` with the bathroom unloaded and tick every line: layout and floor look identical; walls and desks block; walking into a top strip fades the object and draws it in front; coworkers walk to desks, fetch chairs and sit; the plant is watered; pushing/pulling chairs and Susan/Gloria works; spawn is random and valid; G, H, C, P overlays toggle and draw as before; chat box ignores the overlay keys
- [x] 4.3 Commit the refactor on its own (`refactor: abstract map loader from the office`) so it can be reverted separately

## 5. Rebuild the bathroom on the abstracted loader

- [x] 5.1 Rewrite `loadBathroomMap.ts` to use `joinCells` + `placeBeside` + the loader with a bathroom `MapSpec`, side by side with no shared cell, and verify a missing join tile throws an error naming the map
- [x] 5.2 Keep the player-only rules: physics world and walk grid stay the office floor, the player's bounds are the union, chairs/coworkers stop at the office's left edge via `keepOut`; add a comment in `Chairs.ts` that the slab assumes the bathroom is left of the office, and verify the existing `pushChain` keep-out test still passes
- [x] 5.3 Update the camera bounds to the union of both maps and verify the camera follows the player into the bathroom without showing void beyond the maps' edges

## 6. Overlays across the whole scene

- [ ] 6.1 Extend `WalkGridOverlay` to take a list of regions and build the bathroom region from a second `WalkGrid` over obstacle bodies translated by `-offset`, drawn translated back; add the "player only" colour constant; verify G and H show tinted bathroom cells (free = player-only colour, solid = red) and the office tint is unchanged
- [ ] 6.2 Verify P and C still draw correctly with the bathroom loaded (no change expected) and that all overlays stay hidden by default and ignore their keys while typing

## 7. Verify the combined world (human + code)

- [ ] 7.1 Run `npm test`, `npm run lint`, `npm run build` and verify all pass; re-run the dev dump for the office and verify it still equals `office-baseline.json` with the bathroom loaded
- [ ] 7.2 Manual: the two rooms sit side by side with the doorways lined up and no shared wall column; the player walks through the door both ways and the camera follows; bathroom walls and furniture block; walking behind bathroom objects draws and fades them
- [ ] 7.3 Manual: Susan and Gloria never wander, spawn or work in the bathroom (restart several times, then `/gloria-work` and `/susan-work`); pushing a chair or pulling Susan to the doorway stops at the office edge and lets go
- [ ] 7.4 Manual: press G and H and confirm the whole world, bathroom included, is tinted correctly
- [ ] 7.5 Update the bathroom paragraph in `CLAUDE.md` (side by side, abstracted loader, overlays) and the `loadOfficeMap.ts` line, and verify no stale mention of "overlap" or "drawn first" remains
