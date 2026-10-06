## Context

See `proposal.md` for why. Today `WorkInteraction.collectTiles` makes one `Desk` per work tile (`id = "tx,ty"`), with up to four sides whose zone is a one-tile strip `WORK_RANGE_TILES` (0.75) deep. Plants already do the merging we want: `mergePlants` dedupes cells across layers, flood-fills 4-neighbours and keeps the bounding `Rect`. Geometry is held in tile units (`Rect`) and converted with `tileSize` at the edges (`rectToPx`, `containsPx`, `spotAgainst`). The tile size is read from the map at runtime, so only tile-unit tuning constants depend on it.

## Goals / Non-Goals

**Goals:**
- One desk per run of touching work tiles, at most 32 px across, whatever the tile size.
- Zone depth and watering reach in px, same values as today at 32px tiles (24 px, 16 px).
- Reuse the plant merging code instead of writing a second flood fill.

**Non-Goals:**
- Re-cutting the tileset or redrawing `map.json`.
- Changing chair-fetch constants (already px), the walk grid (`CELL = 8`), or sprite sizes.
- Splitting a long merged desk into several seats. One merged desk is one seat per open side.

## Decisions

**1. One shared, pure grouping helper for plants and desks.** Add `groupTiles(cells)` to `zones.ts` (no Phaser, so it is unit tested once). It does what `mergePlants` does today: dedupes cells seen on several layers (keeping the first `direction` found, which only plants use), flood-fills 4-neighbours, and returns each group's bounding `Rect`, its `direction` and a top-left `id`. `mergePlants` becomes a thin wrapper that adds `tileSize`, and the work code calls the helper directly, so there is exactly one flood fill. The existing `plants.test.ts` merge cases move to a `zones` test against the helper and keep passing through `mergePlants`. *Alternative:* copy the loop into `WorkInteraction`. Rejected: two floods to keep in step.

**1b. The 32 px cap is a second, desk-only step.** `splitToMax(group, maxPx, tileSize)` in `zones.ts` cuts a group's cells into chunks by `floor((tx - x0) * tileSize / maxPx)` and `floor((ty - y0) * tileSize / maxPx)`, where `x0, y0` is the group's top-left; each non-empty chunk becomes a desk with its own bounding rect and top-left `id`. Cutting relative to the run (not to the world grid) makes the result depend only on the run, so identical desks anywhere behave the same. `MAX_DESK_PX = 32` lives next to the other work tuning. Plants do not use the cap. *Alternative:* a split key inside `groupTiles` (e.g. world-grid blocks). Rejected: desks that straddle a block boundary get cut and identical desks behave differently.

**1c. Share the small duplicated pieces.** The `Dir` type and the left/right/up/down table live in `zones.ts` (plants use it by name; work builds its four sides from it). The "grow a rect" step (`reachZone` for plants, `zoneFor` for desks) becomes `growRect`/`sideStrip` over `Rect` taking px, so reach and work depth share one px-to-tile conversion (decision 3). Nothing else is shared: plant `solid` bounds and `standSide` stay in `plants.ts`.

**2. A desk is a `Rect`, not a tile.** `Desk` becomes `{ id, rect, sides }`, `id` is `"x0,y0"` of the rect (same format as now, so a 1-tile desk keeps its id). `zoneFor` and `spotFor` take the rect. `spotFor` in `deskSpot.ts` already delegates to `spotAgainst(rect, …)`; the `tileRect(tx, ty)` wrapper is dropped from the work path. The `alongX` default for a desk becomes the rect's horizontal centre instead of `(tx + 0.5) * tileSize`. *Alternative:* keep tiles and add a "same desk" grouping key on top. Rejected: every call site (`openSides`, `sideAt`, `spotAndFacing`, `workSpots`, `targets`, `drawZones`) would still iterate tiles and need to map back.

**3. Depth and reach in px, converted at use.** `WORK_RANGE_PX = 24` and `WATER_REACH_PX = 16` replace the tile constants. Zones stay in tile units (they compose with `containsPx`), so the depth is `WORK_RANGE_PX / tileSize` where the zone is built, and `reachZone(plant, WATER_REACH_PX / plant.tileSize)`. *Alternative:* switch all zone geometry to px. Rejected: much larger diff for no behavioural gain.

**4. Open sides for a merged desk.** `openSides` currently tests that the flush spot is walkable. It keeps doing that, with the spot computed from the rect, so a side blocked by a wall or another desk is still dropped. A long desk side is one side, however much of it is blocked: if the spot at the entry point is walkable the side is open.

**5. Debug drawing.** `drawZones` and `targets` fill the desk `Rect` in red and the side zones in yellow, so a mis-tagged map shows up immediately with the existing key.

## Risks / Trade-offs

- [A run that is not a multiple of 32 px is cut in an unexpected place, e.g. a 48 px run becomes 32 + 16, which is two desks] → Keep desks a multiple of 32 px, or leave an untagged tile between neighbouring desks. Document in `CLAUDE.md`; the overlay shows the cut.
- [A tile tagged by mistake (stray work tile next to a desk) joins its desk silently] → The debug overlay shows the merged rect; add a console warning when a desk's rect covers more than one tile type? Left out, see Open Questions.
- [Zone is now as long as the desk, so `deskAt` matches earlier along a long desk edge] → That is the intent. The spot is still clamped to the edge, and the existing `occupied`/`playerIn` checks use the side's zone, which grows with it.
- [Existing tests assume a single tile] → Update `deskSpot.test.ts` and `plants.test.ts`, add merge tests (below).

## Migration Plan

Behaviour on the current 32px map is unchanged: every desk is already a single 32 px tile, so it stays its own desk (the cap stops neighbouring tiles from merging), with ids and zones identical (24 px deep, 16 px reach). The new 16px map can then be authored and tagged freely. Rollback is reverting the commit; the map file format does not change.

## Open Questions

- Whether to warn at load when a merged desk is larger than expected. Can be decided after seeing the new map.
