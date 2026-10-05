## Context

`loadOfficeMap.ts` creates every tile layer as one `TilemapLayer` at depth `MAP_DEPTH` (-2), under every y-sorted sprite, except layers named in `TOP_LAYERS`, which sit at `MAP_TOP_DEPTH`. That list says `Room Boundary Bottom`, which is no longer in `map.json` (layers are now `Floor`, `Floor Details`, `Wall`, `Wall Details`, `Furniture 1-3`, `Wall Top`, `Room Boundary`; 16 px tiles). Layers with the Tiled `collider` property get one static body per opaque rect of each tile (`tileOpaqueRects`), so a tile blocks every pixel it draws. `WalkGrid` is built from those bodies.

Sprites sort with `depth = sprite bottom`, which is the feet body's bottom plus `FEET_LIFT * SPRITE_SCALE` (4 px). `place()` already makes base-only bodies for hand-placed props. See proposal.md for motivation and specs/office-walk-behind for requirements.

## Goals / Non-Goals

**Goals:**
- Authoring is one layer property (`behind`, in map px) in Tiled / Sprite Fusion.
- One list of "walk-behind objects" feeds sorting, fading and collision, so the source of that list (layer property now; rects or auto-grouping later) can change without touching those.

**Non-Goals:**
- Per-pixel hit tests for fading (bounding boxes are enough).
- Animated tiles, or objects that move. Walk-behind pieces are static.
- Implementing the alternative sources (B, C) below.

## Decisions

**The seam: `WalkBehindObject { bounds, baseY, solidDepth }`.** A function from the loaded map to a list of these. Sorting, fading and collision read only the list. Option A produces it from layer properties.

**Option A: a piece is a vertical stack of tiles in one column of an opted-in layer.** Touching non-empty tiles in the same column, on the same layer, form one piece. `baseY` is the bottom of the lowest tile in the stack. This is what makes a 2-tile-tall shelf one object rather than two with different depth lines, without needing any grouping metadata. `solidDepth` is the layer's `behind` value. *Rejected alternative: per-tile depth (`baseY` = each tile's own bottom).* A character standing in the upper tile's row would draw in front of the top half but behind the bottom half.

**Rendering: hide the opted-in `TilemapLayer`, draw its tiles as images.** Keep the layer object (other code scans it for work and water tiles via `onLayer`), set it invisible, and add one image per non-empty tile using a frame cut from the tileset texture (from `getTileTextureCoordinates`), honouring flips. Each image gets the depth of its stack. A `TilemapLayer` is a single game object and cannot have per-tile depth, so this is the smallest change that gets one. Non-opted-in layers are unchanged.

**Depth value: `baseY + FEET_LIFT * SPRITE_SCALE`.** Characters sort by sprite bottom, which is 4 px below their feet. Adding the same offset to the piece makes the draw order flip exactly where the feet body crosses the base line, and the same line drives the fade.

**Collision: clip each tile's opaque rects to `baseY - behind` and below.** Reuse `tileOpaqueRects`; drop rects entirely above the cut and trim ones that straddle it. The existing `WalkGrid` constructor reads the bodies, so routing, clearance and chair reach follow with no change. `behind: 0` removes the blocking altogether (decor you can fully walk through), which is allowed.

**Fade: per piece, per frame, from the feet.** For each piece, find characters whose feet are above `baseY` and whose sprite bounds overlap the piece bounds. If there is one, the piece's target alpha is `WALK_BEHIND_ALPHA`, otherwise 1. Move each piece's alpha towards its target at a rate set by `WALK_BEHIND_FADE_MS`. With a handful of pieces and three characters, a plain loop per frame is enough; no spatial index.

**Fade is per column stack.** On a wide desk made of several columns, only the columns the character overlaps fade. This is the natural consequence of the stack-per-column rule. See open questions.

**Tuning in one place.** `WALK_BEHIND_ALPHA` and `WALK_BEHIND_FADE_MS` live with the other tuning constants, commented. The depth in px is in the map (`behind`), in map px, so it does not depend on tile size.

**Fix `TOP_LAYERS`.** Point it at layers that exist, and log a console message for any configured name missing from the map so this cannot silently rot again. Which of `Wall Top` / `Room Boundary` is meant to draw over the player is an authoring decision to confirm when implementing.

## Alternatives for defining objects (not part of this change)

Both plug into the same `WalkBehindObject` list.

**B. Rectangles over the map.** Each object is a rect with its own `baseY` and `solidDepth`, in the spirit of the recent work-area rects. Flexible: one object can span layers, depth differs per object, no need to split layers by depth. Cost: rects must be redrawn when furniture moves, and the map must hold or reference them (Sprite Fusion exports tile layers only, so they would live in a separate file or in code). Hiding the covered tiles would still use the image-per-tile rendering above, picking tiles by rect.

**C. Auto-group connected tiles.** On collider layers, 4-connected non-empty tiles form one object, with a single global depth and base from the group's bottom edge. Zero authoring. Wrong where two pieces touch (a desk against a wall merges with the wall), and one depth value for everything. Could work as a default with A's property as an override.

Swapping source later means writing a new producer for the list; sorting, fade and collision stay.

## Risks / Trade-offs

- [One layer per depth value: `behind` is per layer, so furniture with different depths must sit on different layers] → pick values per layer sensibly, or move to B for per-object depth.
- [A tall object made of two tiles in different layers will not be one stack] → author such objects on one layer.
- [Image-per-tile rendering costs draw calls versus one layer] → opted-in layers only, and the map is small (40x26 tiles); revisit if the map grows.
- [Reducing collision changes where coworkers can route and where chairs can be dragged, possibly into cramped spots behind furniture] → the clearance grid already requires a chair footprint; check with `G`/`H`/`C` after enabling a layer.
- [Re-exporting `map.json` may drop layer properties] → document the property in `CLAUDE.md` and check after each export.

## Migration Plan

Nothing opts in until a layer is given `behind`, so the change is inert on the current map apart from the `TOP_LAYERS` fix. Enable one layer first (for example the tallest furniture layer), check collisions and routing with the debug overlays, then the others. Rollback is removing the property.

## Open Questions
- Should a wide object fade as a whole instead of per column? Deferrable: it changes only how pieces are grouped for the fade, not the specs.
