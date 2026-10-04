## Context

See proposal.md for motivation. Today `WorkInteraction.updateVisit` and `approachWorkTile` walk by setting velocity toward a point, and `NpcSeats` does the same for its `go`, `pull` and `return` phases. `Wander` already has the A* machinery (`findPath`, `toWaypoints`, `cellAt`, waypoint following) over the 8px `WalkGrid`, but it is private to `Wander`. Work tiles are a plain array in `WorkInteraction` with no occupancy. Only pure logic is unit tested (`pathing.test.ts`), so new logic that should be tested has to be free of Phaser.

## Goals / Non-Goals

**Goals:**
- One shared way for a coworker to follow a routed path, used by wander, the work visit and the chair legs.
- Race-free desk sharing, testable without Phaser.
- Keep `NpcSeats` generic over `SeatUser` so the player can reuse it in the follow-up.

**Non-Goals:**
- Player auto-walk and chair dragging (follow-up change).
- Putting chairs into the walk grid.
- Changing how seated work, the seat layers or shadows look.

## Decisions

**1. `WorkSlots`: a pure registry with an atomic `claimRandom`.** A class with no Phaser import: `claim(id, owner)`, `release(owner)`, `isFree(id, owner?)`, `claimRandom(candidates, owner, rng)`. One owner holds at most one slot, and `release(owner)` is idempotent so every exit path can call it. Pick and claim happen in one call, so the single-threaded update loop cannot interleave two coworkers' picks. Alternative: a `occupied` boolean on each tile entry. Rejected: it cannot answer "who holds it", so a coworker could not tell its own claim from someone else's, and it is awkward to test.

**2. Claim at the pick, not on arrival.** `updateVisit` claims when it chooses the tile. The incidental path (`shouldWork`) claims when the coworker is inside a zone whose desk it can take. Zone lookup returns the first desk whose zone contains the coworker *and* which it can claim, so two adjacent desks with overlapping zones do not refuse each other.

**3. Player is best-effort.** `PlayerWork` claims a desk as `'player'` when it starts working, if free. It never steals one. If a coworker arrives to find the player in its way, the approach timeout fires: it says a random `DESK_TAKEN_PHRASES` line, releases, and reschedules. Alternative: player steals the claim. Rejected: needs a notification path to the coworker, and the timeout path is needed anyway.

**4. Phrases beside the work phrases.** `DESK_TAKEN_PHRASES` lives in `workPhrases.ts` next to `WORK_PHRASES` and is picked with `GetRandom`, so the list is edited by adding a line.

**5. Extract a `PathFollower` from `Wander`.** It takes a start, a goal cell and a grid and exposes waypoints and a per-frame `step(npc)` that returns `moving | arrived | blocked`. Wander, the work visit and the chair legs each own one. Alternative: copy `follow` into each. Rejected: three copies of the snap-to-waypoint logic would drift.

**6. A goal fallback for the work spot.** The spot flush against the desk can lie on a cell `WalkGrid` marks unwalkable (it keeps a one-cell margin either side). A pure helper returns the nearest walkable cell to the goal; the final leg is a short straight step onto the exact spot. Chair legs use the same helper.

**7. Chair plan as a pure function.** `planChairFetch(grid, npcCell, chairCell, spot, facing)` returns the three legs: npc to a cell beside the chair; drag to the staging point half a tile (`SEAT_BACK` times 16px) behind the spot; staging to spot. Phaser code only executes it. This is the part tested against a real `WalkGrid`.

**7a. Chair reach is a two-step filter.** `FETCH_RANGE` (5 tiles, straight line, body centre to body centre) stays as the cheap first pass over unclaimed chairs. Survivors are then routed with `findPath` from the work position's nearest walkable cell, and a chair is in reach only if a route exists and its cost is at most `MAX_CHAIR_ROUTE_TILES = 15` (60 cells; path cost is in cells, divide by `CELL`-per-tile of 4). The nearest in-reach chair by route length wins, not by straight line. A pure `chairsInReach(grid, spotCell, chairs, claimed)` returns each chair with either its route length or a rejection reason (`claimed`, `too-far`, `no-route`, `route-too-long`); `planChairFetch` takes its first entry. Alternative: straight-line range only (today). Rejected: a chair behind a partition counts as near, and the coworker walks a long way or gives up. Both constants live at the top of `NpcSeats.ts` for tuning.

**8. Chair follows kinematically while dragged.** During the pull leg the chair is placed at a fixed offset behind the coworker's heading rather than given the coworker's velocity, so it does not swing wide at waypoint turns and catch on walls. Alternative: keep matching velocity (today's behavior). Rejected for corner snagging; it is easy to revert if kinematic placement looks wrong.

**8a. Debug overlay for chair reach.** Follows `WalkGridOverlay` and the work-zone `drawZones`: off by default, toggled by a key that is ignored while the chat input is focused, drawn above the floor. It consumes the same `chairsInReach` output as the real fetch, so the overlay cannot disagree with behavior. Per work position: a circle for the 5-tile range; green mark on in-reach chairs with the route length; red mark plus a short reason label on rejected ones. It only reads state. Alternative: console logging only. Rejected: reasons are hard to follow in text when several chairs and desks are involved.

**9. One release point for the turn-away.** The release and reschedule run when the phrase's `onDone` fires; `isBusy` keeps the coworker still while the bubble is up. The desk is held until then.

## Risks / Trade-offs

- [Chairs are not in the grid, so a chair can sit in a corridor and block a leg] → the leg's blocked-detection replans once, then gives up, releasing desk and chair.
- [Kinematic dragging can put the chair through a wall at a tight corner] → the grid's one-cell side margin already covers a chair narrower than the coworker; check by eye in play-testing.
- [A claim held through a long chat interruption] → released in `cancel`; the give-up timer bounds the rest.
- [`Wander`, work and seat code now share a follower, so a bug there affects all three] → covered by tests on the pure parts and the existing wander tests.
