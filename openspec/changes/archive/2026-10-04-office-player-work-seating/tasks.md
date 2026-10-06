## 1. Work session logic

- [x] 1.1 Extract the player's work session states (idle, fetching, working) and their transitions into a pure helper, and verify unit tests cover: start only when standing still in a zone, leaving the zone mid-trip does not stop it, a movement key or typing stops it from any state, and the work timer starts only on seated or no chair
- [x] 1.2 Rework `PlayerWork` to use it: claim the desk on start, enter fetching, start the work timer when the fetch finishes, release on stop; verify with the unit tests and by playing that leaving the zone on the trip keeps the session

## 2. Desk spot for the player

- [x] 2.1 Add `spotAndFacing(sprite)` to `WorkInteraction` (the flush spot and facing of the desk whose zone contains the player, or none) built on `spotFor`, which is first moved out of `WorkInteraction` into a pure function (it only uses a clamp); verify with unit tests of the spot and facing for each desk direction (up, down, left, right, none), matching the coworkers'

## 3. Routed fetch for the player

- [x] 3.1 Remove the player slide-to-feet branch (`pickNearestChair`, the player check in `ready`, the stale "player doesn't walk" comment on `SeatUser`) from `NpcSeats`, and add a `spot` parameter to `ready` so `ready('player', facing, spot)` takes the coworker path from where the player stands; verify a coworker's fetch is unchanged
- [x] 3.2 On abandon for the player, skip the `return` phase: let go of the chair, set the phase to `none` and continue as standing work at the current position; verify the chair is unclaimed and the session continues
- [x] 3.2a Add `FORGETFUL_PHRASES` to `workPhrases.ts`, have `NpcSeats` expose a one-shot "player gave up" flag, and have the scene show a random line in the player's bubble when it is set (not on a deliberate cancel); verify by playing that the line appears once on give-up, the work bubbles follow, and the session is not stopped by it
- [x] 3.3 In `OfficeScene`, skip key-driven velocity while a trip is active, make `updateWorkChair` call `ready` for the whole fetching phase (drop its `velocity === 0` gate), derive the cancel signal from the keys (`keyMoving`) instead of velocity, animate the player as walking from the trip's velocity, and cancel the trip on any movement key, typing or chat; verify by playing that a key press stops the trip instantly and returns control

- [x] 3.4 Add the **B** debug key in `OfficeScene`: it forces the player's current or next chair trip to fail as if blocked past the bump limit, then clears itself; verify the player gives up, says a forgetful line and works standing

## 4. Verification

- [x] 4.1 Run `npm test`, `npm run lint` and `npm run build` and verify all pass
- [x] 4.2 Play-test in `npm run dev`: stand still in a zone with a chair in reach and watch the player walk to it, drag it and sit; cancel with an arrow key mid-trip; stand in a zone with no chair in reach and confirm standing work; press **C** to compare the chair-reach overlay with what the player picks; stand still in a zone with a chair in reach and press **B** during the trip, and confirm the player gives up, says a forgetful line, leaves the chair and works standing
- [x] 4.3 Update `CLAUDE.md`: the work-trip note to include the player, the `PlayerWork` bullet that still says a chair "slides under them", and the debug aids list (add **B**)
