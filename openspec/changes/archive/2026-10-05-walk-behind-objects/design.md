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

**An object is a vertical run of touching solid 8 px cells, from all collider layers combined.** Cells are the walk grid's size (`CELL`). Mark a cell solid wherever any collider layer draws an opaque pixel in it (from each tile's opaque rects, so transparent tile parts and fully transparent tiles mark nothing), then take the vertical runs per column of cells. This is what makes wall / desk / wall one object (they sit on different layers) so only its topmost piece opens, and what keeps art that does not actually touch (a gap of at least one free cell) as separate objects. Whole 16 px tiles were rejected: a mostly transparent tile (a desk foot) fused two desks that do not touch. `bounds.y` is the top of the run, `baseY` its bottom, both snapped to 8 px. Per-layer runs were rejected: the lower wall would get its own open strip, a pocket under the desk. *Also rejected: per-tile depth (`baseY` = each tile's own bottom).* A character in the upper tile's row would draw in front of its top half but behind the bottom half.

**Objects joined to the top wall are not walk-behind.** A run whose top is at map y 0 (the top wall and whatever stands against it, plus the side walls, which also start at the top) gets no open strip, keeps its tiles in the map layers under every character, and never fades. Nobody walks behind the top wall, and a plant or desk against it would otherwise sort and fade as part of the wall (the plant fading while it is watered).

**Strip depth: `min(WALK_BEHIND_STRIP_PX, floor(WALK_BEHIND_STRIP_FRACTION * height))`, rounded down to whole cells.** 16 px and 2/3. A 32 px wall opens 16 px (top 2 cells), a 24 px run 16 px, a 16 px run 8 px, an 8 px run nothing, a 48 px stack 16 px. The fraction cap keeps at least a third of every object blocking, so nothing short becomes a walk-through. A pure function, test-covered.

**Collision: remove the top strip from the opaque rects.** Reuse `tileOpaqueRects`. Each rect is split at 8 px column boundaries, because neighbouring cell columns can have different cuts, and each piece is cut at `bounds.y + openDepth` of the run its cells belong to: drop what is entirely above the cut and trim what straddles it. This applies to the tiles of every collider layer, so touching art from different layers is cut at the same line. The existing `WalkGrid` constructor reads the bodies, so routing, clearance and chair reach follow with no change.

**Rendering: hide solid tiles in their `TilemapLayer`, draw them as images.** An object's bounds are 8 px cell columns, tiles are 16 px: each solid tile is assigned to the object of its centre column's lowest solid cell (decide at 3.1 how a tile that straddles two objects sorts). Keep the layer objects visible (other code scans them for work and water tiles via `onLayer`; scan first), set `visible = false` on each solid tile, and add one image per such tile using a frame cut from the tileset texture (from `getTileTextureCoordinates`), honouring flips. Each image gets the depth of its object. A `TilemapLayer` is a single game object and cannot have per-tile depth, so this is the smallest change that gets one. Tiles on non-collider layers and on `TOP_LAYERS` layers stay in their layers, unchanged. Within one object, images keep the layer order (a small per-layer offset on the depth).

**Depth value: `baseY + FEET_LIFT * SPRITE_SCALE`.** Characters sort by sprite bottom, which is a few px below their feet. Adding the same offset to the object makes the draw order flip exactly where the feet body crosses the base line, and the same line drives the fade.

**Fade: per tile, per frame, from the feet.** Each drawn tile is a piece `{ bounds (the tile), baseY (its object's base line), image, alpha }`. A piece's target is `WALK_BEHIND_ALPHA` when some character's feet are above `baseY` and its sprite bounds overlap the tile, otherwise 1; alpha eases to the target at a rate set by `WALK_BEHIND_FADE_MS`. Per tile (not per object) means only the edge being walked under fades, not the whole desk or wall. Tiles of the `TOP_LAYERS` layers (drawn over every character) are pieces with `baseY` = Infinity, so they fade wherever a sprite overlaps them. Posters and other decor fade with their tile. A plain loop over a few hundred pieces and three characters is enough; no spatial index.

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
- Should non-collider decor tiles inside an object's cells sort and fade with it? See risks.
