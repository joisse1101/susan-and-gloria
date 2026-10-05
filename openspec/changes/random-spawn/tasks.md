## 1. Pure spawn picking

- [x] 1.1 Add a reachable-region helper (flood fill of `walkGrid`, largest region) next to `WalkGrid.ts`, with tests: two separate areas give the larger one; a sealed pocket is excluded. Verify with `npm test`.
- [x] 1.2 Add `pickSpawns(grid, clearGrid, request, rng)` returning a position per requested body, using shuffled candidates and a minimum gap, relaxing the gap on failure. Verify with tests: every pick is walkable (chairs on clear cells) and in the main region; picks respect the gap; a cramped grid still places everything and reports the relaxation; a fixed RNG gives the same result twice.
- [x] 1.3 Make `pickSpawns` take interaction-zone rects and drop candidates whose body overlaps one, relaxing in the order gap, then zones, with a console message for each. Verify with tests: no pick overlaps a zone when enough cells exist; a grid whose cells are all in zones still places everything and reports the zone relaxation; the gap relaxes before the zones.
- [x] 1.4 Add a helper converting a cell centre to a sprite position so `body.center` lands on the cell centre. Verify with a test using fake body offsets.

## 2. Wire into the scene

- [ ] 2.0 Add an accessor on `WorkInteraction` returning every desk's work-zone rects, and collect plant zones with `reachZone(plant, WATER_REACH_PX)`. Verify with a test that the desk accessor returns the same zones `P` draws (yellow) on the current map.
- [ ] 2.1 In `OfficeScene.create()`, compute spawns once after `walkGrid`, `clearGrid`, the desks and the plants are built, passing the zone rects, and use them for the player, Susan, Gloria and each chair, removing the hardcoded coordinates. Verify in `npm run dev`: reload several times and the layout changes each time, with nobody inside furniture.
- [ ] 2.2 Check `Chairs.add` positions by body centre like the characters, adjusting the conversion if it uses the sprite centre. Verify chairs start flat on the floor and a chair spawned near a desk can still be fetched (`C` overlay).
- [x] 2.3 Throw a clear error if the main region is empty. Verify by temporarily loading a map with no floor, then restoring.

## 3. Docs and end-to-end check

- [x] 3.1 Add the spawn behaviour to the Office section of `CLAUDE.md` (where the picker lives, grids used, gap relaxation). Verify by re-reading for stale mentions of fixed start positions.
- [ ] 3.2 Run `npm test`, `npm run lint` and `npm run build`; then reload the Office ten times in `npm run dev` and confirm no spawn is stuck, overlapping, in a sealed area or inside a desk or plant zone (press `P` to see the zones).
