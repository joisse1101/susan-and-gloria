## 1. Layer files (pilot: Gloria)

- [x] 1.1 Create the shared library under `pixel-art/` (body, walk cycles, layer export, mirroring) and verify it exports one variant file per layer type folder (`bodies`, `top`, `bottom`, `hair`, `accessories`, `face`), all animations stacked in rows on one cell grid
- [x] 1.1b Generate the layout JSON and the labelled guide PNG with the sheets, and verify every animation row and facing column in the layer files is identified in the guide
- [x] 1.1c Add character presets (one variant per layer type) and verify Gloria's preset builds her layer stack from the variant files
- [x] 1.3 Define Gloria in a thin script: top clothes (cardigan, blouse), bottom clothes (skirt), hair (bun), accessories (glasses), face; verify the layers composite back to her current four-facing `Idle.png` and `Walk.png`
- [x] 1.4 Write the per-facing layer-order JSON from the build and verify it lists every layer for every facing
- [x] 1.5 Verify a rebuild twice gives byte-identical files, and that editing only the skirt changes only the bottom-clothes sheet

- [x] 1.6 Add WorkStanding and WorkSitting (four cardinal facings, two frames each) to the layout and to every layer of Gloria, rebuilt from the layers rather than by editing the flat Idle sheets; verify each composites back to her current `WorkStanding.png` and `WorkSitting.png` pixel for pixel

- [x] 1.7 Replace the code-drawn body with the hand-drawn one (`pixel-art/layers/data/body-light.png`, idle and walk), rebuild Gloria's WorkStanding and WorkSitting from it and fit her cardigan to the new shoulders; verify the exported body's idle/walk rows equal the source and that a rebuild twice is byte-identical (her flat `Idle.png`/`Walk.png` no longer match by design; `build.py --flat` still compares them)

## 2. Character rig in the game

- [x] 2.1 Add `CharacterRig` (one sprite per layer, position, flip, animation frame, alpha, depth, destroy, `setLayer`) with unit tests for the pure parts (layer order, depth offsets) and a check that every operation reaches every layer
- [x] 2.2 Load layer sheets and layer-order data in `playerSprite.ts` and create per-layer anims; verify Gloria renders and animates identically to before in the office
- [x] 2.3 Route `OfficeScene` position/flip/anim updates, `fadeWalkBehind`, `Shadows` and the walk-behind fade through the rig; verify Gloria fades as one when walking behind furniture
- [x] 2.4 Make `SeatLayers` bracket the whole stack; verify a seated Gloria shows chair back behind, armrests in front, no layer popping
- [x] 2.5 Verify layer swap by swapping Gloria's top-clothes sheet at runtime (dev only) and checking only the top changes in every animation

## 3. Face

- [x] 3.1 Verify Gloria's face layer (down, right, left; none for up) is drawn over her glasses so the eyes show through the lenses, with a zoomed preview
- [x] 3.2 Remove the leftover expression plumbing: rename `face/gloria-neutral.png` to `face/gloria.png` and drop the `REST_EXPRESSION` suffix in `layeredCharacter.ts`; drop the `expressions` lists from `presets.json` and `variants.json`; remove the dev viewer's expression key (**E**) from `state.ts`, its tests and the viewer UI; verify Gloria's face still renders in the office and the viewer, and `npm run build`, `npm run lint` and `npm test` pass

## 4. Susan and the player

- [ ] 4.1 Split Susan's flat sheets (Idle, Walk, WorkStanding, WorkSitting) into draft layer files on the shared grid, one file per layer (body, shoes, bottom, top, hair, accessories, face), add her preset, and verify the layers composite back to her current art; then wait for the user's hand edits and sign-off
- [ ] 4.2 Do the same for the player, after sign-off on Susan; verify the layers composite back to the player's current art and wait for sign-off
- [ ] 4.3 After sign-off, remove the flat-sheet scripts (`gloria-idle`, `susan-idle`, `npc-type`, `player-type`), the one-off split scripts, the character `preview.png` files and the flat sheets nothing loads any more, and update `CLAUDE.md` for the layered pipeline; verify `npm run build`, `npm run lint` and `npm test` pass
