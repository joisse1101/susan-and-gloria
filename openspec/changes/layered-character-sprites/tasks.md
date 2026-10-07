## 1. Shared layer library (pilot: Gloria)

- [x] 1.1 Create the shared library under `pixel-art/` (body, walk cycles, layer export, mirroring) and verify it exports one variant file per layer type folder (`bodies`, `top`, `bottom`, `hair`, `accessories`, `face`), all animations stacked in rows on one cell grid
- [x] 1.1b Generate the layout JSON and the labelled guide PNG with the sheets, and verify every animation row and facing column in the layer files is identified in the guide
- [x] 1.1c Add character presets (one variant per layer type) and verify Gloria's preset builds her layer stack from the variant files
- [ ] 1.2 Give the shared library a complete body (head, neck, torso, arms, hips, legs, feet) with a skin palette parameter, and verify it never shows outside the clothed silhouette (done: hidden underlay, feet from the player's frozen sheets); the pixel-for-pixel match against the player's `Walk.png` and `Idle.png` moves to 5.2, since the player's art is fused and needs colour segmentation
- [x] 1.3 Define Gloria in a thin script: top clothes (cardigan, blouse), bottom clothes (skirt), hair (bun), accessories (glasses), face; verify the layers composite back to her current four-facing `Idle.png` and `Walk.png`
- [x] 1.4 Write the per-facing layer-order JSON from the build and verify it lists every layer for every facing
- [x] 1.5 Verify a rebuild twice gives byte-identical files, and that editing only the skirt changes only the bottom-clothes sheet

- [x] 1.6 Add WorkStanding and WorkSitting (four cardinal facings, two frames each) to the layout and to every layer of Gloria, rebuilt from the layers rather than by editing the flat Idle sheets; verify each composites back to her current `WorkStanding.png` and `WorkSitting.png` pixel for pixel

- [x] 1.7 Replace the code-drawn body with the hand-drawn one (`pixel-art/layers/data/body-light.png`, idle and walk), rebuild Gloria's WorkStanding and WorkSitting from it and fit her cardigan to the new shoulders; verify the exported body's idle/walk rows equal the source and that a rebuild twice is byte-identical (her flat `Idle.png`/`Walk.png` no longer match by design; `build.py --flat` still compares them)

## 2. Character rig in the game

- [ ] 2.1 Add `CharacterRig` (one sprite per layer, position, flip, animation frame, alpha, depth, destroy, `setLayer`) with unit tests for the pure parts (layer order, depth offsets) and a check that every operation reaches every layer
- [ ] 2.2 Load layer sheets and layer-order data in `playerSprite.ts` and create per-layer anims; verify Gloria renders and animates identically to before in the office
- [ ] 2.3 Route `OfficeScene` position/flip/anim updates, `fadeWalkBehind`, `Shadows` and the walk-behind fade through the rig; verify Gloria fades as one when walking behind furniture
- [ ] 2.4 Make `SeatLayers` bracket the whole stack; verify a seated Gloria shows chair back behind, armrests in front, no layer popping
- [ ] 2.5 Verify layer swap by swapping Gloria's top-clothes sheet at runtime (dev only) and checking only the top changes in every animation

## 3. Eight directions

- [ ] 3.1 Add the SE, NE diagonal views (drawn) and mirrored SW, NW, W to the library for Idle and Walk; verify previews for all eight facings in the studio, zoomed, and get sign-off on Gloria
- [ ] 3.2 Make `facingFromVelocity` and `playerFacing` 8-way with hysteresis, with unit tests covering cardinals, diagonals, the 45-degree boundary and keeping the current facing at rest
- [ ] 3.3 Extend `DIRECTIONS`/`Facing`, anim creation and row mapping to eight facings for Idle and Walk only; verify work, sit and water code still receives cardinal facings and `npm test` passes
- [ ] 3.4 Snap diagonal facing to the nearest cardinal at desk and plant arrival; verify with unit tests and by walking into a desk diagonally

## 4. Face and expressions

- [ ] 4.1 Draw Gloria's neutral and blink faces for S, SE, E, NE (N has none) under her glasses and export one face sheet per expression; verify with a zoomed preview
- [ ] 4.2 Add the expression controller to the rig (`set(name, ms)`, return to neutral, unknown names ignored, blink timer) with unit tests for timing and replacement
- [ ] 4.3 Draw candidate expressions on Gloria (happy, annoyed, confused), show zoomed previews to the user and record keep or drop for each before exporting any; verify the decision is noted here
- [ ] 4.4 Wire kept expressions to their events (candidates: praise, chair jam, stolen chair, forgotten trip); verify each triggers in the office and returns to neutral

## 5. Susan and the player

- [ ] 5.1 After sign-off on Gloria, define Susan in the library and verify her layers composite to her current art, then add 8 directions, face and expressions
- [ ] 5.2 After sign-off on Susan, define the player the same way and verify it
- [ ] 5.3 Remove the superseded flat-sheet scripts (`gloria-idle`, `susan-idle`, `npc-type`, `player-type`) and update `CLAUDE.md` for the layered pipeline; verify `npm run build`, `npm run lint` and `npm test` pass
