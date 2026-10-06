## Context

See proposal.md for motivation and specs/character-viewer/spec.md for behaviour. The layer build (`pixel-art/layers/charlib.py`, from `layered-character-sprites`) exports to `public/assets/characters/`: one 128x512 sheet per layer variant in `bodies/`, `bottom/`, `top/`, `hair/`, `face/`, `accessories/`; `layout.json` (cell size, animations with frame counts and a row per facing, mirrors, layer folders); `layer-order.json` (layers bottom to top per facing); `presets.json` (character to variant per layer, and face variant to expressions). Face files are named `<variant>-<expression>.png`; every other layer is `<variant>.png`. Nothing lists the variants that exist: `presets.json` only names the ones some character uses. The app is React 19 with a `HashRouter` (`src/App.tsx`), and `/office` already sits outside `MainLayout`.

## Goals / Non-Goals

**Goals:**
- Compose a character exactly as the build does, with no per-frame offsets.
- Add variants, animations or facings in the build and see them with no page change.
- Fast browsing: keyboard cycling, many previews at once.

**Non-Goals:**
- Using Phaser, `CharacterRig` or the game scene; the viewer must work before the rig exists.
- Saving, exporting or sharing outfits; a player-facing editor; shipping to Pages.
- Runtime recolouring (palette changes stay in the build).

## Decisions

**1. A canvas compositor, not Phaser.** A pure module takes the loaded sheets, layout, order and a selection `{layer: variant | hidden, expression}` plus (animation, facing, frame) and draws the 32x32 cell onto a canvas by `drawImage` per layer, in layer order, at integer scale with image smoothing off. Alternatives: reuse the game scene (rejected: needs `CharacterRig`, task 2.x, and a Phaser instance per preview), or an HTML `<img>` stack with CSS offsets (rejected: sprite-sheet cropping and per-frame animation is awkward and many previews would be slow). The module is split into a pure "which cells to draw, in what order" function (unit tested) and the canvas drawing.

**2. The build writes `variants.json`.** `export()` in `charlib.py` writes `public/assets/characters/variants.json`: for each layer type, the variant names whose sheet files exist, and for `face` the expressions per variant. It is written from the files actually present in the folders, so variants exported by any character's script show up. Alternatives: the page lists the folders (rejected: a static host cannot list directories), or the page reads `presets.json` only (rejected: variants no preset uses would be invisible, defeating the browsing purpose). `verify` in `build.py` checks every manifest entry has a file and every file an entry.

**3. Dev-only by `import.meta.env.DEV`.** The route is registered, and the page lazily imported, only when `import.meta.env.DEV` is true, so the production bundle tree-shakes it away; the route sits beside `/office` outside `MainLayout` and has no link. Alternative: ship it hidden (rejected by the non-goal; also keeps the Pages bundle unchanged). A build check greps the production `dist/` for the route.

**4. State is one selection object plus a clock.** Layer choices, hidden flags, preset, animation, facing, playing, frame and speed live in one reducer; previews are pure functions of (selection, animation, facing, time). One shared `requestAnimationFrame` clock drives every preview, so the strip and the grid stay in step and pausing stops them all. The main preview's frame can be stepped; the strip and grid always play, so a paused main preview is easy to compare against them.

**5. Images load once, by URL, into an `ImageBitmap`/`HTMLImageElement` cache.** The cache is keyed by sheet path; changing a layer's variant loads only the new sheet, and a failed load reports its path (spec: missing data). Sheets are tiny, so all variants are not preloaded.

**6. Keyboard map.** Up/down selects a layer row, left/right changes its variant, `h` hides it, `1`-`4` pick the animation, `[` and `]` change the facing, space plays or pauses, `,` and `.` step, `-` and `+` slow down or speed up. Shown on the page. Keys are ignored while a form control with text entry is focused.

**7. Expression is a face-layer sub-choice.** Face files are per expression, so the face row cycles variants and a second control cycles that variant's expressions from `variants.json`.

**8. The layer-by-layer row reuses the compositor.** A tile is the same cell-list function called with a selection holding one visible layer, so a tile can never differ from the layer's part of the composite. Tiles use the shared clock. A hidden layer's tile is built from the selection with that layer forced visible and drawn dimmed with a "hidden" tag; a layer absent from the facing's order is shown empty with a label.

**9. Hover highlight is an alpha parameter.** The cell-list function takes an optional highlighted layer and returns each cell with an alpha: 1 for the highlighted layer, `DIM_ALPHA` (named constant, about 0.25) for the other visible layers, 1 for all when nothing is highlighted. The page keeps `highlight` as separate state from the selection, set on pointer enter and leave of a layer title or tile and on keyboard focus of a row, and passes it to every preview. Alternatives: a solo toggle per layer (dropped, the tile row already shows a layer alone and the highlight shows it in context), or CSS opacity on separate stacked canvases (rejected: one canvas per preview is simpler and many previews stay cheap).

**10. Debug overlays are drawn after the layers.** The cell overlay draws the 32 px bounds on the preview canvas after compositing, scaled with the preview, and the layer-order list is plain text from `layer-order.json` for the current facing.

## Risks / Trade-offs

- [Viewer composite drifts from the game's] → a test composites a sample of cells with the pure function and compares them with the build's `composite` output for the same cells (via a golden PNG or a small Python-side check).
- [Manifest and files disagree] → the build verifies both directions and fails on a mismatch.
- [Grid cost: 16 animated previews, six `drawImage` calls each] → trivial at 32x32; one shared clock, redraw only when the frame changes.
- [Vite serves `public/` sheets from cache while the build rewrites them] → a reload button that re-requests the data with a cache-busting query.
- [Dev-only code slips into the production bundle] → the `import.meta.env.DEV` gate plus the `dist/` check above.
