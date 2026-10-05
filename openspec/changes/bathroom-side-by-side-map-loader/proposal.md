## Why

The bathroom was first added as a quick proof: it was bolted onto `loadOfficeMap.ts` by threading an offset through the office loader, its wall column overlapped the office's, and the debug overlays (walk grid, clearance grid) still only draw over the office floor. The result works but is hard to extend (any third room would repeat the hack), the shared wall is wrong (the maps should sit side by side, not share a column), and the overlays hide half the world. We want a map loader that is not shaped around "the office", with the bathroom as its first real second user.

## What Changes

- **Side by side, no overlap**: the bathroom's `isJoin` tile sits in the cell immediately left of the office's `isJoin` tile on the same row. The two wall columns are separate; the doorways line up. (Replaces the overlapping placement; the "bathroom drawn first so the office wall wins" rule goes away.)
- **Overlays cover every map**: **G** and **H** (walk grid, clearance grid) draw over the whole world, bathroom included. Cells in the bathroom that coworkers can never use are tinted as "player only" rather than as ordinary walkable. **P** and **C** keep working as they do; they draw wherever their subject is, so they already follow the world.
- **Abstract the map loading**: pull the rendering and collision logic out of `loadOfficeMap.ts` into a map-agnostic loader that takes a map description (files, offset, whether it limits the physics world) and returns its size, bounds and walk-behind pieces. `loadOfficeMap.ts` becomes a thin office wrapper; `loadBathroomMap.ts` becomes the placement logic (find joins, compute offset) over the same loader.
- **Verify the refactor before relying on it**: the office must look and behave exactly as before the refactor (code checks plus a manual play-through), and only then is the bathroom rebuilt on the abstracted loader.
- No change to who may enter the bathroom: the player can, Susan, Gloria and chairs cannot.

## Capabilities

### New Capabilities
- `office-multi-map`: how extra maps are placed beside the office by their `isJoin` tiles, who may enter them, how their collision/walk-behind/depth work, and that the debug overlays cover the whole world.

### Modified Capabilities
- `office-pushables`: the "pushed body never enters an obstacle" rule gains the player-only area: chairs and coworkers are stopped at the edge of the area only the player may enter.
- `office-walk-behind`: the behaviour applies to every loaded map, not just the office (each map is analysed in its own coordinates, then placed).

## Impact

- Code: `src/game/office/map/loadOfficeMap.ts` (split), new map-agnostic loader module, `src/game/office/map/loadBathroomMap.ts`, `OfficeScene.ts` (world/player bounds, overlay construction), `interaction/npc/WalkGridOverlay.ts` (and a way to build a grid for a region away from the origin), `furniture/Chairs.ts` + `interaction/pushChain.ts` (already carry the keep-out rule, now specified).
- Tests: new pure tests for the placement maths and the overlay region/cell classification; existing 278 tests must still pass.
- Assets: `public/assets/map/bathroom/` was re-exported from Sprite Fusion since the first pass, so join-tile positions must be re-read, not assumed.
- No dependency, API or deployment changes.
