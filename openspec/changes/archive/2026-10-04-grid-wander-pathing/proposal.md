## Why

Susan and Gloria currently wander by picking a random direction and walking until they bump into something. They push into walls and furniture, stall, and never head anywhere on purpose. Pathfinding over a walkable grid makes the wander look intentional and keeps them out of obstacles.

## What Changes

- Build a walkable-cell grid (8x8 px cells) of the Office map from the map's collision rects and solid furniture.
- A cell is walkable only if a coworker's hitbox centred on it would overlap no obstacle (a free run 3 cells wide and 1 cell tall).
- Wander picks a random cell from those reachable from the coworker's current cell, finds the shortest path with A* (8-direction movement, no corner cutting), and walks it.
- When a coworker bumps into the player or the other coworker, it replans from where it stands.
- Loose chairs are ignored when planning; coworkers may still push them.
- Replaces the random-direction wander in `Wander.ts`. Work-zone walking and chair fetching are unchanged.

## Capabilities

### New Capabilities
- `office-npc-wander`: how Susan and Gloria choose where to wander and how they get there around obstacles.

### Modified Capabilities

## Impact

- `src/game/office/interaction/npc/Wander.ts` (rewritten), plus a new grid and pathfinding module beside it.
- `OfficeScene.ts` builds the grid once after `loadOfficeMap` and hands it to `Wander`.
- No new dependencies and no change to the agent graph.
