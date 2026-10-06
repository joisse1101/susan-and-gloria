## Why

The office map is moving from a 32x32 to a 16x16 tile grid with objects keeping their on-screen size, so every 32px object is now a 2x2 block of tiles. Work desks are currently one slot per tagged tile (`id = "tx,ty"`), so tagging all four sub-tiles of a desk end would create four slots and let four people claim the same seat. The work zone depth and the watering reach are also written in tile units, so they would silently halve in pixels.

## What Changes

- The tile grouping, the side-direction table and the "zone grown from a rect" step become one shared, unit-tested helper in `zones.ts` used by both plants and desks, so the two cannot drift apart.
- Touching `interaction = work` tiles merge into **one desk**, the way touching `water` tiles already merge into one plant, but a desk is at most **32 px** across on each axis (`MAX_DESK_PX`): a longer run is cut, from its top-left, into separate desks. One person per desk. A desk has one `WorkSlots` id (its top-left tile), one work position per open side, and one zone per side. The tile `direction` property is not used (since `2b6b622`).
- The zone on each side spans the full length of the merged desk edge instead of one tile, and sits the same pixel depth off it as today.
- The work zone depth and the watering reach are specified and tuned in **pixels**, so changing the map's tile size does not change behaviour. Their values stay what they are today at 32px tiles: 24 px and 16 px.
- Debug overlays (`G`/`C`/`P` work and plant drawings) draw the merged desk rectangle.

No change to the map file format. The author tags every sub-tile of a desk with `interaction = work`. On the current 32px map every desk is already one tile, so nothing changes there.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `office-npc-work`: a desk is a run of touching work tiles at most 32 px across, not a single tile; one holder per desk; the work zone is a fixed pixel depth along the whole desk edge.
- `office-plant-watering`: the reach from the plant's edge is a pixel distance (16 px) rather than "0.5 tile".

## Impact

- `src/game/office/interaction/npc/WorkInteraction.ts` (`collectTiles`, `zoneFor`, `Desk`, `spotFor` callers, `drawZones`, `targets`), `deskSpot.ts` (`spotFor` takes a rect), `zones.ts` / `plants.ts` (shared tile-merging helper), `waterTuning.ts`, `OfficeScene.ts`.
- Tests: new tests for merging work tiles; `deskSpot.test.ts` and `plants.test.ts` updated.
- `CLAUDE.md` mentions of tile-sized strips and `WATER_REACH_TILES`.
- Not in scope: re-cutting the tileset and redrawing `map.json` at 16px (the author's own work), and the chair-fetch constants, which are already in pixels.
