## Why

Coworkers deliberately visit work desks and pull up a chair, but both trips are straight-line walks with no pathfinding, so they get stuck on furniture and give up. Nothing stops both coworkers (or a coworker and the player) from choosing the same desk. Now that wandering uses A* over a walk grid, the work trips should use it too.

## What Changes

- Each work tile tracks whether someone is using it. A coworker only ever picks, or starts working at, a desk nobody else holds. The slot is claimed in the same step as the pick, so two coworkers cannot choose the same desk.
- The player counts as occupying a desk while working, but is never blocked from one. A coworker that finds its claimed desk unusable (the player is in the way) says a random line from an editable "desk taken" phrase list, releases the desk and reschedules its visit.
- A coworker wandering into the zone of an occupied desk does not start working there and carries on wandering.
- The walk to a work zone follows the A* route instead of a straight line.
- Fetching a chair becomes three routed legs: walk to the chair, drag it to a spot half a tile behind the work position, then walk to the work position and sit.
- Pure logic (desk occupancy, the chair-drag plan, the goal fallback) is split out of Phaser code and unit tested.
- Out of scope: the player auto-walking to and dragging a chair. That is a follow-up change reusing the same seating logic.

## Capabilities

### New Capabilities
- `office-npc-work`: how coworkers choose a work desk, share desks without clashing, route to it, and fetch and seat a chair.

### Modified Capabilities
- `office-npc-wander`: the "other coworker behaviour is unchanged" requirement no longer holds for walking to a work zone and fetching a chair, which now use planned routes.

## Impact

- `src/game/office/interaction/npc/WorkInteraction.ts`, `NpcSeats.ts`, `Wander.ts` (shared routing)
- `src/game/office/interaction/workPhrases.ts` (new phrase list)
- `src/game/office/interaction/player/PlayerWork.ts` (claims a desk while working)
- `src/game/office/OfficeScene.ts` (wiring)
- New pure modules and Vitest tests beside `pathing.test.ts`
