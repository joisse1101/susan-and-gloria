## 1. Finding objects

Note: 1.1, 1.2, 2.1 and 2.2 replace what was built for a layer or tile property (`parseBehind` / `parseCanBehind`, base-only clipping, `WALK_BEHIND_SOLID_PX`). That code is reworked and the property reading removed (run `/opsx:apply`).

- [ ] 1.1 Add `WALK_BEHIND_STRIP_PX` (16) and `WALK_BEHIND_STRIP_FRACTION` (2/3) to `constants.ts`, commented, replacing `WALK_BEHIND_SOLID_PX`. Add a pure function `openStripPx(height)` and rework `findWalkBehindObjects` to take a combined solid grid and return `WalkBehindObject { bounds, baseY, openDepth }` per column run. Verify with tests: the strip is 16 for 32 and 48 px and 10 for 16 px; a 2-tall column is one object with `baseY` at the bottom tile's bottom; separate columns are separate objects; a gap splits.
- [ ] 1.2 In `loadOfficeMap.ts`, build the combined solid grid from every collider layer outside `TOP_LAYERS` (no property reading) and remove `parseCanBehind` and its tests. Verify with a test that a wall on one layer and a desk on another, touching in a column, are one object whose top is the wall's top and whose base is the lower wall's bottom.

## 2. Collision

- [ ] 2.1 Replace `clipToBase` with a pure helper that removes everything above the cut `bounds.y + openDepth` from a tile's opaque rects (beside `tileOpaqueRects`). Verify with tests: a rect fully above is dropped, one straddling the cut is trimmed, one below is kept; an `openDepth` of 0 changes nothing.
- [ ] 2.2 Use it for every solid tile of the collider layers in `loadOfficeMap`. Verify in `npm run dev` with `G`/`H`: the top strip of every wall and piece of furniture becomes walkable and the rest stays red; walk down into a lone wall (stops after 16 px), into a wall / desk / wall column (only the top of the upper wall opens) and up into furniture from the south (stopped as before).

## 3. Sorting

- [ ] 3.1 For the solid tiles of each object, keep the `TilemapLayer` visible but hide each such tile in it (after `onLayer` has scanned it) and draw it as an image from the tileset frame (flips honoured), with depth `baseY + FEET_LIFT * SPRITE_SCALE`. Keep layer order within an object. Verify the room looks identical to before when no character is near, and that non-collider layers are unchanged. Decide here how decor tiles on non-collider layers (e.g. `Wall Details`) inside an object's cells sort.
- [ ] 3.2 Confirm chairs and shadows sort correctly against the objects. Verify by dragging a chair behind and in front of an object.
- [ ] 3.3 Walk the player and both coworkers above and below an object and verify each is drawn behind, then in front, flipping where the feet cross the base line.

## 4. Fade

- [ ] 4.1 Add `WALK_BEHIND_ALPHA` and `WALK_BEHIND_FADE_MS` to the tuning with comments. Add a pure test-covered function deciding a piece's target alpha from the feet position and sprite bounds of each character (behind and overlapping gives faded; in front or beside gives 1).
- [ ] 4.2 Run the fade each frame in `OfficeScene.update()` for every object, easing alpha towards the target. Verify in `npm run dev`: the object fades when the player (and each coworker) is behind and overlapping, and returns when they leave, without a snap.

## 5. Over-the-player layers

- [ ] 5.1 Update `TOP_LAYERS` to layers that exist in the current `map.json` (confirm the intended layer with the user) and log a console message for any configured name that is missing. Verify by running with a deliberately wrong name, then restoring.

## 6. Map and docs

- [ ] 6.1 Verify routing with `G`, `H` and `C`: coworkers still reach desks and chairs, no spot in an open top strip traps a chair, and nobody can end up outside the room.
- [ ] 6.2 Document the automatic top-strip rule, the strip and fade tuning and the B alternative in the Office section of `CLAUDE.md`. Verify by re-reading for stale statements that all tile layers are under characters.
- [ ] 6.3 Run `npm test`, `npm run lint` and `npm run build`; then in `npm run dev` walk around the walls and every piece of furniture and confirm behind, in front, fade and collision all look right.
