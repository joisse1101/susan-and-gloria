## 1. Reading the property and building objects

- [ ] 1.1 Add a pure function that, from per-layer tile grids and the `behind` value, returns `WalkBehindObject { bounds, baseY, solidDepth }` per column stack. Verify with tests: a 2-tall column is one object whose `baseY` is the bottom tile's bottom; separate columns are separate objects; a gap in a column splits it.
- [ ] 1.2 Read `behind` from layer properties in `loadOfficeMap.ts`; a missing property means not opted in, and a negative or non-number value logs a console message naming the layer and is ignored. Verify with a test for the parsing and by checking the console on a map with a bad value.

## 2. Collision

- [ ] 2.1 Clip a tile's opaque rects to the band from `baseY - behind` down (pure helper beside `tileOpaqueRects`). Verify with tests: a rect fully above is dropped, one straddling the cut is trimmed, one below is kept; `behind: 0` yields none.
- [ ] 2.2 Use it for opted-in collider layers in `loadOfficeMap`. Verify in `npm run dev` with `G`/`H`: cells behind an opted-in object become walkable and the base stays red; a layer without the property is unchanged.

## 3. Sorting

- [ ] 3.1 For opted-in layers, hide the `TilemapLayer` and draw each non-empty tile as an image from the tileset frame (flips honoured), with depth `baseY + FEET_LIFT * SPRITE_SCALE`. Verify the layer looks identical to before when no character is near, and that other layers are unchanged.
- [ ] 3.2 Confirm chairs and shadows sort correctly against the pieces. Verify by dragging a chair behind and in front of an opted-in object.
- [ ] 3.3 Walk the player and both coworkers above and below an opted-in object and verify each is drawn behind, then in front, flipping where the feet cross the base line.

## 4. Fade

- [ ] 4.1 Add `WALK_BEHIND_ALPHA` and `WALK_BEHIND_FADE_MS` to the tuning with comments. Add a pure test-covered function deciding a piece's target alpha from the feet position and sprite bounds of each character (behind and overlapping gives faded; in front or beside gives 1).
- [ ] 4.2 Run the fade each frame in `OfficeScene.update()` for every piece, easing alpha towards the target. Verify in `npm run dev`: the object fades when the player (and each coworker) is behind and overlapping, and returns when they leave, without a snap.

## 5. Over-the-player layers

- [ ] 5.1 Update `TOP_LAYERS` to layers that exist in the current `map.json` (confirm the intended layer with the user) and log a console message for any configured name that is missing. Verify by running with a deliberately wrong name, then restoring.

## 6. Map and docs

- [ ] 6.1 Add `behind` to the chosen layers in Tiled / Sprite Fusion, re-export `map.json`, and confirm the properties survived the export. Verify routing with `G`, `H` and `C`: coworkers still reach desks and chairs, and no spot behind an object traps a chair.
- [ ] 6.2 Document the `behind` property, the fade tuning and the B/C alternatives in the Office section of `CLAUDE.md`. Verify by re-reading for stale statements that all tile layers are under characters.
- [ ] 6.3 Run `npm test`, `npm run lint` and `npm run build`; then in `npm run dev` walk around every opted-in object and confirm behind, in front, fade and collision all look right.
