## Why

The map now marks the office plant with `interaction = water` tiles, and the watering can and water stream sprites exist, but nothing uses them. Susan, Gloria and the player should water the plant when they come near it. The work interaction already decides when to start (near a zone, not interrupted, off cooldown), but that logic exists twice, once for the coworkers and once for the player, so a second interaction should share it instead of adding a third copy.

## What Changes

- Add a watering interaction for Susan, Gloria and the player: coming within 0.5 tile of the plant makes them route there with the existing A* pathfinding, face the plant and water it for a while.
- Extract the common "should this actor start the interaction" decision from the work interaction into a shared, pure core: near enough, not interrupted, off cooldown, and (for the player) standing still. Work and watering both use it.
- Also extract the other logic water would otherwise copy from work, as shared building blocks that work then uses too: an interaction registry (one interaction per actor, cancel fan-out, "is it engaged" and pose queries), routing to a rectangle, the flush approach step, rectangle zones with the tile scan, and the say-then-hide line flow.
- The abstraction is done first, as its own step. The existing tests must pass, with new tests for the shared pieces, before any water interaction is written, so nothing in work breaks.
- Not moved: scheduled visits, chair trips, jam handling, desk-taken and forgetful handling, work's bump and give-up handling of a trip, and the work timers and phrase lists. Work behaviour does not change.
- Add a cooldown after watering so an actor does not water again every time it crosses the plant. There is no chance roll for now.
- Treat adjacent `water` tiles as one plant (one claim, one watering at a time).
- Load and draw `WateringCan.png` and `WaterStream.png` while someone is watering. The back-view stream is used as it is first and judged in the game.

Not in this change: drawing the standing watering pose sheets. They will be drawn separately, before the sprite wiring task is started, with the hands on the same pixels as the seated `WorkSitting.png` so the existing can and stream sheets line up unchanged.

## Capabilities

### New Capabilities
- `office-interaction-trigger`: the shared rule that decides when an actor (Susan, Gloria or the player) starts a tile interaction, with its cooldown and the player's stand-still condition.
- `office-plant-watering`: how the actors find, route to, face and water the plant, share it, are interrupted, and how the can and stream are shown.

### Modified Capabilities
<!-- None. Moving the work trigger into the shared core preserves the requirements in office-npc-work and office-player-work. -->

## Impact

- `src/game/office/interaction/npc/WorkInteraction.ts` and `interaction/player/PlayerWork.ts` / `playerSession.ts`: call the shared trigger instead of their own checks.
- New shared trigger module with unit tests (pure logic, as the other interaction code), and a new watering interaction using `PathFollower`, `findPath`, `nearestReachableCell` and `WorkSlots`-style claims.
- `OfficeScene.ts` and `Wander.ts`: wire the interaction in, and update the animations and overlays while watering.
- `map/loadOfficeMap.ts` or the interaction's `collectTiles`: read `interaction = water` tiles and merge adjacent ones.
- Assets: `public/assets/sprites/items/WateringCan.png`, `WaterStream.png` (already added), and the standing watering sheets (drawn separately).
