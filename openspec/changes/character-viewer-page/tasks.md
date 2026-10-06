## 1. Build output for the viewer

- [x] 1.1 Make `charlib.export()` write `public/assets/characters/variants.json` (variant names per layer type from the files present, and each face variant's expressions), and verify it lists Gloria's current variants
- [x] 1.2 Extend `build.py` verification to fail when a manifest entry has no file or a file has no entry, and verify it by temporarily adding a stray sheet and removing it again

## 2. Compositor

- [x] 2.1 Add the pure function that turns (selection, animation, facing, frame, layout, layer order) into the ordered list of cells to draw, with unit tests for layer order per facing, hidden layers, the missing face in the up view and mirrored facings
- [x] 2.2 Let the cell-list function take an optional highlighted layer and return a per-cell alpha (`DIM_ALPHA`), with unit tests for the highlighted layer at full alpha, other visible layers dimmed, hidden layers absent and no highlight meaning all at full alpha
- [x] 2.3 Add the canvas drawing and the sheet cache (nearest-neighbour, integer scale, failed loads report the path), and verify one cell of Gloria's preset matches the build's composite for the same cell pixel for pixel

## 3. The page

- [x] 3.1 Add the dev-only `/dev/characters` route (gated by `import.meta.env.DEV`, outside `MainLayout`, not linked) with data loading from the build's JSON files, and verify it opens from `npm run dev` and shows a clear message for a missing file
- [x] 3.2 Add the preset picker and the layer rows (previous/next with wrap, hide toggle, face expressions), and verify cycling one layer leaves the others unchanged
- [x] 3.3 Add the animation and facing pickers, the shared clock, play/pause, frame stepping with the frame number and the speed control, and verify walk-right loops four frames and stepping wraps
- [x] 3.4 Add the all-facings strip and the all-animations grid, and verify cycling a layer updates every preview
- [x] 3.5 Add the layer-by-layer row (composite tile plus one tile per layer, hidden layers dimmed and tagged, absent layers labelled empty), and verify each tile equals that layer's part of the composite
- [x] 3.6 Add hover and keyboard-focus highlight on layer titles and tiles, applied to the main preview, strip and grid, and verify leaving restores full opacity and the selection and hidden flags never change
- [x] 3.7 Add the cell overlay and the layer-order list toggles, and verify the grid lines up with the 32 px cells and the list drops the face in the up facing
- [x] 3.8 Add the background switch (checkerboard, green) and the optional shadow, and verify the layer pixels are unchanged by the switch
- [x] 3.9 Add the keyboard map with an on-page legend and verify every control is usable without the pointer and keys (including the overlay toggles) are ignored while typing in a text field
- [x] 3.10 Add the reload-data button with a cache-busting query and verify a rebuilt sheet shows without a hard refresh

## 4. Checks

- [x] 4.1 Verify a variant, animation or facing added to the build appears in the viewer with no page change (temporarily export a second hair variant, then remove it)
- [x] 4.2 Verify `npm run build` produces a `dist/` with no viewer route or code, and that `npm run lint` and `npm test` pass
- [x] 4.3 Add a short "Character viewer" entry to `CLAUDE.md` (route, keys, the manifest) and verify it matches the page
