## 1. Desk occupancy

- [x] 1.1 Add the pure `WorkSlots` registry (`claim`, `release`, `isFree`, `claimRandom` with injected rng) and verify unit tests cover double-claim refused, one slot per owner, idempotent release, and `claimRandom` returning nothing when all are held
- [x] 1.2 Add `DESK_TAKEN_PHRASES` to `workPhrases.ts` and verify the list is exported and non-empty
- [x] 1.3 Give each work tile an id and route `updateVisit` through `claimRandom`; reschedule when it returns nothing; verify with a debug log that two coworkers never claim the same tile
- [x] 1.4 Make `shouldWork` and `approachWorkTile` pick the first claimable desk whose zone contains the coworker, so a held desk is passed over silently; verify a coworker wandering through a held zone keeps walking
- [x] 1.5 Release the desk in `scheduleVisit`, `cancel` and on finish; verify no claim remains after each exit path
- [x] 1.6 Make `PlayerWork` claim a free desk as `'player'` when it starts and release it on stop, never stealing; verify a coworker does not choose the desk the player is working at

## 2. Shared path following

- [x] 2.1 Extract the waypoint-following logic from `Wander` into a `PathFollower` and verify the existing wander behavior and `pathing.test.ts` still pass
- [x] 2.2 Add the pure goal-fallback helper (nearest walkable cell to a target) and verify unit tests cover an unwalkable goal, a walkable goal and an unreachable goal

## 3. Routed work visit

- [x] 3.1 Replace the straight-line walk in `updateVisit` with a `PathFollower` to the work zone, keeping the give-up timer; verify in play that a coworker walks around furniture to a desk
- [x] 3.2 Replace the straight-line step in `approachWorkTile` with a short final step onto the exact spot; verify the coworker ends flush against the desk and faces it
- [x] 3.3 When the claimed desk is unusable on arrival, say a random `DESK_TAKEN_PHRASES` line, then release and reschedule in the phrase's `onDone`; verify by standing in a desk's zone while a coworker visits

## 4. Routed chair fetch

- [ ] 4.0 Add the pure `chairsInReach` (5-tile straight-line filter, then routed length capped at 15 tiles, with a rejection reason per chair) and verify unit tests cover claimed, too-far, no-route, route-too-long, in-reach, and the nearest-by-route chair winning over the nearest-by-straight-line one
- [ ] 4.1 Add the pure `planChairFetch` (leg 1 to the chair, leg 2 drag to the staging point half a tile behind the spot, leg 3 to the spot) and verify unit tests against a real `WalkGrid` cover each facing, a blocked staging cell, and no reachable chair
- [ ] 4.2 Rework `NpcSeats` `go` and `return` to follow routed legs; verify a coworker reaches a chair around furniture
- [ ] 4.3 Rework `pull` to drag the chair kinematically along the routed leg to the staging point, then step to the spot and slide; verify the chair ends half a tile behind the work position and the coworker sits
- [ ] 4.4 Release chair and claim on give-up or interruption at every leg; verify no chair stays claimed afterwards
- [ ] 4.5 Keep `NpcSeats` keyed by `SeatUser` so the player can reuse it; verify the player's existing slide-to-feet seating still works

## 5. Chair reach debug view

- [ ] 5.1 Add the debug overlay (range circle per work position, in-reach chairs green with route length, rejected chairs red with reason) driven by `chairsInReach`, toggled by a key ignored while typing; verify it is off by default and toggling it does not change coworker behavior
- [ ] 5.2 Document the toggle key next to the other debug overlays in `CLAUDE.md`; verify the entry is present

## 6. Verification

- [ ] 6.1 Run `npm test`, `npm run lint` and `npm run build` and verify all pass
- [ ] 6.2 Play-test in `npm run dev`: both coworkers visit different desks, one turned away by the player says a phrase, a coworker fetches and sits in a chair around furniture
