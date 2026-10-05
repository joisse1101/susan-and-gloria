## Why

The player, Susan, Gloria and the chairs spawn at hardcoded coordinates in `OfficeScene.create()`. Every map edit can leave one of them inside furniture or in a sealed-off pocket, and the coordinates have to be re-picked by hand. The walkable grid already knows what is free, so spawns can be derived from it.

## What Changes

- On map load, each human sprite (player, Susan, Gloria) is placed on a random walkable cell that is reachable from the rest of the floor.
- Each pushable object (the chairs) is placed on a random cell where a chair fits (the clearance grid), also reachable.
- Spawns keep a minimum gap from each other so nothing starts overlapping.
- Spawns avoid desk work zones and plant reach zones, so nobody starts mid-interaction.
- The hardcoded spawn coordinates in `OfficeScene.create()` are removed. The number and kind of chairs stays in code; only their positions are random.
- The pick is a pure function with an injectable random source, so it is testable and a fixed seed can reproduce a layout.

## Capabilities

### New Capabilities
- `office-spawn`: where and how the player, coworkers and chairs are placed when the Office map loads.

### Modified Capabilities
<!-- None: no existing requirement mentions initial placement. -->

## Impact

- `src/game/office/OfficeScene.ts`: spawn calls replace the hardcoded `(x, y)` for the player, `createSheetCoworker` and `chairs.add`.
- New pure module under `src/game/office/` (next to `interaction/npc/WalkGrid.ts`) with tests.
- Reads `WalkGrid` and the clearance grid as they are; no change to them. Sits after the grids, desks and plants are built in `create()`.
- `WorkInteraction.ts` gains a small accessor returning the desks' work-zone rects; plant zones already come from `reachZone`.
- Docs: `CLAUDE.md` Office section gains a line on spawning.
