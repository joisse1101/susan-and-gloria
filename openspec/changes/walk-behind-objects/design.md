## Context

`loadOfficeMap.ts` creates every tile layer as one `TilemapLayer` at depth `MAP_DEPTH` (-2), under every y-sorted sprite, except layers named in `TOP_LAYERS`, which sit at `MAP_TOP_DEPTH`. That list says `Room Boundary Bottom`, which is no longer in `map.json` (layers are now `Floor`, `Floor Details`, `Wall`, `Wall Details`, `Furniture 1-3`, `Wall Top`, `Room Boundary`; 16 px tiles). Layers with the Tiled `collider` property get one static body per opaque rect of each tile (`tileOpaqueRects`), so a tile blocks every pixel it draws. `WalkGrid` is built from those bodies.

Sprites sort with `depth = sprite bottom`, which is the feet body's bottom plus `FEET_LIFT * SPRITE_SCALE` (4 px). `place()` already makes base-only bodies for hand-placed props. See proposal.md for motivation and specs/office-walk-behind for requirements.

## Goals / Non-Goals

**Goals:**
- Every solid object can be walked behind by default, with no tags, properties or rects to maintain.
- One list of "walk-behind objects" feeds sorting, fading and collision, so the source of that list (combined colliders now; rects later) can change without touching those.

**Non-Goals:**
- Per-pixel hit tests for fading (bounding boxes are enough).
- Animated tiles, or objects that move. Objects are static.
- An opt-out for individual tiles or layers, and the rects alternative (B) below. Both can be added later.

## Decisions

**The seam: `WalkBehindObject { bounds, baseY, openDepth }`.** A function from the loaded map to a list of these. Sorting, fading and collision read only the list. `openDepth` is the height of the walkable top strip.

**An object is a vertical run of touching solid cells, from all collider layers combined.** Build one grid where a cell is solid if any collider layer has a non-empty tile there, then take the vertical runs per column. This is what makes wall / desk / wall one object (they sit on different layers) so only its topmost piece opens, and what makes a 2-tile shelf one object with one base line. `bounds.y` is the top of the run, `baseY` its bottom. Per-layer runs were rejected: the lower wall would get its own open strip, a pocket under the desk. *Also rejected: per-tile depth (`baseY` = each tile's own bottom).* A character in the upper tile's row would draw in front of its top half but behind the bottom half.

**Strip depth: `min(WALK_BEHIND_STRIP_PX, floor(WALK_BEHIND_STRIP_FRACTION * height))`.** 16 px and 2/3. A 32 px wall opens 16 px, a 16 px object 10 px, a 48 px stack 16 px. The fraction cap keeps at least a third of every object blocking, so nothing short becomes a walk-through. A pure function, test-covered.

**Collision: remove the top strip from each solid tile's opaque rects.** Reuse `tileOpaqueRects`; for each tile in an object, cut at `bounds.y + openDepth`: drop rects entirely above the cut and trim ones that straddle it. This applies to the tiles of every collider layer, so touching tiles on different layers are cut at the same line. The existing `WalkGrid` constructor reads the bodies, so routing, clearance and chair reach follow with no change.

**Rendering: hide solid tiles in their `TilemapLayer`, draw them as images.** Keep the layer objects visible (other code scans them for work and water tiles via `onLayer`; scan first), set `visible = false` on each solid tile, and add one image per such tile using a frame cut from the tileset texture (from `getTileTextureCoordinates`), honouring flips. Each image gets the depth of its object. A `TilemapLayer` is a single game object and cannot have per-tile depth, so this is the smallest change that gets one. Tiles on non-collider layers and on `TOP_LAYERS` layers stay in their layers, unchanged. Within one object, images keep the layer order (a small per-layer offset on the depth).

**Depth value: `baseY + FEET_LIFT * SPRITE_SCALE`.** Characters sort by sprite bottom, which is a few px below their feet. Adding the same offset to the object makes the draw order flip exactly where the feet body crosses the base line, and the same line drives the fade.

**Fade: per object, per frame, from the feet.** For each object, find characters whose feet are above `baseY` and whose sprite bounds overlap the object bounds. If there is one, the object's target alpha is `WALK_BEHIND_ALPHA`, otherwise 1. Move each object's alpha towards its target at a rate set by `WALK_BEHIND_FADE_MS`. With a few hundred objects (one per solid column) and three characters, a plain loop per frame is enough; no spatial index.

**Fade is per column.** On a wide desk or long wall made of many columns, only the columns the character overlaps fade. This is the natural consequence of the run-per-column rule. See open questions.

**Tuning in one place.** `WALK_BEHIND_STRIP_PX`, `WALK_BEHIND_STRIP_FRACTION`, `WALK_BEHIND_ALPHA` and `WALK_BEHIND_FADE_MS` live with the other tuning constants in `constants.ts`, commented. `WALK_BEHIND_STRIP_PX` is in map px.

**Fix `TOP_LAYERS`.** Point it at layers that exist, and log a console message for any configured name missing from the map so this cannot silently rot again. Which of `Wall Top` / `Room Boundary` is meant to draw over the player is an authoring decision to confirm when implementing. Layers in `TOP_LAYERS` take no part in objects.

## Alternatives for defining objects (not part of this change)

**B. Rectangles over the map.** Each object is a rect with its own `baseY` and strip depth, in the spirit of the recent work-area rects. Flexible: exceptions to the automatic rule, per-object depth. Cost: rects must be redrawn when furniture moves, and the map must hold or reference them (Sprite Fusion exports tile layers only, so they would live in a separate file or in code). It plugs into the same `WalkBehindObject` list. Hiding the covered tiles would still use the image-per-tile rendering above, picking tiles by rect.

Swapping or adding a source later means writing a new producer for the list; sorting, fade and collision stay.

## Risks / Trade-offs

- [One strip rule for all objects] -> fine for now; use B for exceptions.
- [Decor on a non-collider layer sitting on a solid (e.g. `Wall Details` on a wall) stays flat under characters, so a character in the open top strip would draw over the decor but behind the wall] -> decide at 3.1 whether non-collider tiles inside an object's cells join it for depth.
- [Open top strips change where coworkers can route and where chairs can be dragged, possibly into cramped spots, and desk work zones and spots (`spotAgainst`) sit near desk tops] -> the clearance grid already requires a chair footprint; check with `G`/`H`/`C` and watch coworkers reach every desk.
- [The long outer walls become walkable in their top strip, up to the floor bounds] -> floor bounds still limit the world; confirm nobody can end up outside the room.
- [Image-per-tile rendering costs draw calls versus one layer] -> solid tiles only, and the map is small (40x26 tiles); revisit if the map grows.

## Migration Plan

Nothing to author, but not inert: every collider on the map changes. Check collisions and routing with the `G`/`H`/`C` overlays, then walk around the walls and each piece of furniture. Rollback is reverting, or setting `WALK_BEHIND_STRIP_PX` to 0.

## Open Questions
- Should a wide object fade as a whole instead of per column? Deferrable: it changes only how objects are grouped for the fade, not the specs.
- Should non-collider decor tiles inside an object's cells sort and fade with it? See risks.
