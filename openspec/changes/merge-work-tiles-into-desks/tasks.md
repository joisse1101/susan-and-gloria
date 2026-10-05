## 1. Shared tile-grouping helpers

- [x] 1.1 Add `groupTiles(cells)` to `src/game/office/interaction/zones.ts` (dedupe across layers, 4-neighbour flood fill, bounding `Rect`, `direction`, top-left `id`). Verify with new tests in `zones.test.ts`: single tile, 2x2 block, same cell on two layers, L-shape, two separate groups, independent of cell order.
- [x] 1.2 Add `splitToMax(group, maxPx, tileSize)` that cuts a group from its top-left into chunks of at most `maxPx` on each axis. Verify with tests at tile sizes 32 and 16: one 32 px tile stays one, a 2x2 block of 16 px tiles stays one, a 64 px run becomes two, a 48 px run becomes 32 + 16, an L-shape cuts on both axes, and the result is the same wherever the run sits on the map.
- [x] 1.3 Move the `Dir` type and the left/right/up/down table into `zones.ts`; use it from `plants.ts` and build `WorkInteraction.ts`'s four sides from it. Verify `npm test` and `npm run build` still pass.
- [x] 1.4 Add `growRect` and `sideStrip` (distance in px, converted by tile size, result in tile units). Verify with tests at tile sizes 32 and 16 that the px size is the same, and that `sideStrip` spans the whole edge on each of the four sides.
- [x] 1.5 Rewrite `mergePlants` in `plants.ts` on top of `groupTiles`, and `reachZone` on `growRect`. Verify the existing `plants.test.ts` cases pass unchanged (reach takes px, so the one reach test changes its argument from 0.5 to 16 and gets a 16 px-grid twin).

## 2. Pixel-based tuning

- [x] 2.1 Replace `WATER_REACH_TILES` with `WATER_REACH_PX = 16` in `waterTuning.ts`; update `WaterInteraction.ts` and `OfficeScene.ts`. Verify with a test that the reach zone is 16 px at tile sizes 32 and 16, and that `P` draws the same zone on the current map.
- [x] 2.2 Replace `WORK_RANGE_TILES` in `WorkInteraction.ts` with `WORK_RANGE_PX = 24` and add `MAX_DESK_PX = 32`, together in the work tuning. Verify with a test that a desk side zone is 24 px deep at both tile sizes.

## 3. Desks as merged rectangles

- [x] 3.1 Change `Desk` in `WorkInteraction.ts` to `{ id, rect, sides }` built from `groupTiles` then `splitToMax(MAX_DESK_PX)`; `collectTiles` feeds it the layer's work tiles. Verify with a test (pure part extracted if needed) that a 2x2 block of 16 px tiles is one desk, neighbouring 32 px tiles are separate desks, and ids on the current map equal today's `"tx,ty"`.
- [x] 3.2 Make `zoneFor` use `sideStrip` along the whole `rect` edge; update `openSides`, `sideAt`, `spotFor`, `spotAndFacing`, `workSpots` and `targets` to use the rect (centre `alongX` from the rect, not `(tx + 0.5) * tileSize`). Verify `deskSpot.test.ts` is updated for rect input and passes; a one-tile desk gives the same spot and zone as before.
- [x] 3.3 Update `drawZones` to fill the desk rect and its open side zones. Verify visually with `G`/`C`/`P` on the current map in `npm run dev`: the same overlays as before.
- [x] 3.4 Verify the slot rule in a test: a desk made of four tiles has one `WorkSlots` holder; two desks cut from a 64 px run can be held by two people.

## 4. Docs and end-to-end check

- [x] 4.1 Update `CLAUDE.md` (tile-sized strips, `WATER_REACH_TILES`, the new tuning names, the 32 px desk cap and the "keep desks a multiple of 32 px" caveat). Verify by re-reading the Office section for stale tile-unit wording.
- [ ] 4.2 Run `npm test`, `npm run lint` and `npm run build`; then in `npm run dev` confirm on the current 32px map that coworkers and the player still pick desks, sit and water exactly as before. Redraw a copy of the map at 16px with every sub-tile tagged and confirm one worker per desk.
