## Why

The layered character sheets (`layered-character-sprites`) are only visible by building them and opening `preview-*.png` or running the office. Checking how a variant looks, mixed with others, in every animation and facing means regenerating images and squinting at a static strip. A page that composites the layers live, with a way to step through the available variants and animations, makes authoring and sign-off much faster, and it works with the aligned-sheet format already built.

## What Changes

- Add a dev-only page at `/dev/characters` (not linked from the site, not part of the deployed GitHub Pages build) that composites a character from the exported layer sheets on a canvas, scaled up with nearest-neighbour.
- Pick a character preset, or pick one variant per layer type (body, bottom, top, hair, face, accessories). Each layer row has previous/next buttons, a hide toggle and keyboard cycling, so the available outfits can be gone through quickly.
- Pick the animation and facing, with play, pause, single-frame stepping and a speed control, and pick a background (checkerboard or green) with the shadow optionally shown.
- See many combinations at once: a strip of every facing for the current animation, and a grid of every animation and facing playing together.
- The page is driven by the build's output: the build additionally writes a variants manifest (every variant file per layer type, and each face variant's expressions), and the page reads it with `layout.json`, `layer-order.json` and `presets.json`, so new variants, animations and facings appear without changing the page.

## Capabilities

### New Capabilities
- `character-viewer`: the dev-only page for browsing and previewing layered characters (selecting variants, animations and facings, playing and stepping, the overview strip and grid) and the variants manifest it reads.

### Modified Capabilities
<!-- none: character-sprite-layers (from layered-character-sprites) is only read, not changed -->

## Impact

- New: `src/pages/` viewer page and a small compositing module, a dev-only route in `src/App.tsx` (excluded from production builds), and a `variants.json` written by `pixel-art/layers/charlib.py` `export()` into `public/assets/characters/`.
- Depends on the sheets, `layout.json`, `layer-order.json` and `presets.json` from `layered-character-sprites` (section 1, done). It does not depend on `CharacterRig` or the game scene.
- Non-goals: a player-facing outfit editor, saving or exporting outfits, editing pixels, and shipping the page to GitHub Pages.
- No new runtime dependencies.
