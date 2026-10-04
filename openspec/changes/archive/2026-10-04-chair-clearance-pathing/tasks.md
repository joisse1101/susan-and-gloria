## 1. Tuning and phrases

- [x] 1.1 Add `src/game/office/chairTuning.ts` (same style as `pushTuning.ts`, a comment per value) with `CHAIR_CLEARANCE_CELLS` `{ side: 2, up: 1, down: 1 }`, `JAM_MARGIN_PX` 12, `JAM_TIME_MS` 1500 and `JAMMED_CHAIR_COOLDOWN_MS` 60000; verify `npm run build` type-checks
- [x] 1.2 Add `JAM_PHRASES` to `interaction/workPhrases.ts` ("oh, never mind...", "I'll make do...", "good enough..." and a few more) and note that `FORGETFUL_PHRASES` is now shared with coworkers; verify the exports type-check

## 2. Clearance grid

- [x] 2.1 Give `WalkGrid` a footprint parameter (cells either side, rows up, rows down) defaulting to today's `{ side: 1, up: 0, down: 0 }`, and extend `makeGrid` in `testGrid.ts` to pass it; verify the existing `pathing.test.ts` and `chairReach.test.ts` still pass unchanged
- [x] 2.2 Add grid tests: the default footprint gives cell-for-cell the same grid as the old hard-coded rule on a mixed grid; cells near the world border count as blocked for every footprint; a 24 px corridor that the thin grid walks but the clearance grid rejects; a 32 px aisle that passes both; a cell kept away from a desk corner by the clearance grid; verify `npm test` passes
- [x] 2.3 Build the clearance grid once in `OfficeScene` beside `walkGrid` from `CHAIR_CLEARANCE_CELLS`, and pass it to `NpcSeats`; verify the game loads with both grids

## 3. Chair planning on the clearance grid

- [x] 3.1 Change `planChairFetch` to take both grids: thin for the walk to the chair, clearance for the staging cell and the drag leg (drag start snapped to a clearance cell; `null` when none or no route); verify with new `chairReach.test.ts` cases for each facing, a chair with no clearance route (plan is `null` though the thin grid has one), a chair jammed in the fringe, and the staging fallback within 4 cells when the exact staging cell is blocked on the clearance grid
- [x] 3.2 Extract the pure `fetchCandidates()` (reach filter, cooldown, drag plan; ordered usable chairs plus a reason for each rejected one: claimed, recently jammed, too far, no route, route too long, no drag route) and use it from `NpcSeats.pickChairByRoute`; verify with tests for reason precedence, a cooling-down chair being skipped, and the order of the usable chairs by route length
- [x] 3.3 Use the clearance grid for the replans in `NpcSeats.startPull` and `pull()`; verify by reading that `go`, `abandon` and `returnToSpot` still use the thin grid, and that `npm test` passes

## 4. Jam detection and cooldown

- [x] 4.1 Add a pure `chairLag` (centre distance minus the rope, with the rope length computed from the bodies' half sizes along the direction) and test it: axis-aligned and diagonal directions, and the starting grab distance staying under the margin; verify `npm test` passes
- [x] 4.2 Add the pure jam check in its own file (state, lag, now, limits in; jammed flag and new state out) and test it: lag under the margin never jams, lag held over the margin for the time jams, a dip under the margin resets the timer, a stationary walker with a steady small lag never jams, and a leg replan or phase change resets the state; verify `npm test` passes
- [x] 4.3 Add the pure jam cooldown registry (clock passed in) and test it: blocked until the cooldown ends, expires after it, a cooldown of 0 never blocks, and moving the chair does not reset it; then add `Chairs.markJammed`, `isCoolingDown` and `isHeld` on top of it; verify `npm test` passes
- [x] 4.4 In `NpcSeats` run the jam check during `pull` and the final step, and treat a held, claimed chair in `go`/`pull` as lost; verify in the game by wedging a towed chair (and by taking a claimed chair with Shift) that the trip ends within a couple of seconds

## 5. Give-up outcomes

- [x] 5.1 Add the pure `giveUpOutcome(reason, atSpot, routeBack, deskOccupied)` and test every combination: jam with a route back, jam on or beside the spot, jam with no route (forgetful), lost reasons (taken by the player, blocked repeatedly, too slow), and desk occupied winning over both; verify `npm test` passes
- [x] 5.2 Give `NpcSeats.abandon` a reason and make `hasGivenUp(name)` return `'jam' | 'lost' | undefined` once per give-up (a small helper, tested with a fake: returns the reason once, then clears); run the `return` phase for the player as well as coworkers on a thin-grid route; verify the helper tests pass
- [x] 5.3 In `WorkInteraction`, act on the outcome: `'jam'` says a `JAM_PHRASES` line and carries on to work standing, `'stolen'` says a `STOLEN_PHRASES_NICE` line followed by a `JAM_PHRASES` line in one bubble and does the same; `'lost'` says a `FORGETFUL_PHRASES` line, ends the fetch, releases the chair and desk, and schedules the next visit with the usual cooldown, with no work; desk-taken first. Add a `WorkSlots` test that a released desk can be chosen by another walker; verify in the game by taking a coworker's chair with Shift that it complains, makes do and works standing
- [x] 5.4 Add the lost, jam and arrived inputs to `playerSession.ts` and test the transitions: lost goes to idle with no work; jam goes to walking back, then working on arrival; a cancel while walking back goes to idle with no second line; the existing 5 tests still pass
- [x] 5.5 In `PlayerWork`, say the forgetful line and release the desk on `'lost'`; say the `JAM_PHRASES` line at the jam and start work on arrival on `'jam'`; cancel the walk back on any movement key, typing or chat; verify each in the game, including the **B** debug key still forcing a give-up
- [x] 5.6 Remove the coworker's straight 2 s walk as the fallback when no route back exists (keep the final straight step onto the spot after a routed return); verify by reading `abandon` and `returnToSpot`

## 6. Debug views

- [x] 6.1 Generalise `WalkGridOverlay` to draw both grids (green chair fits, yellow walker only, red blocked) on its own key, **H**, ignored while typing; verify in the game that the view matches the picture of the map's desk fringe
- [x] 6.2 Make `workSpots()` carry each spot's facing vector and make `ChairReachOverlay` use `fetchCandidates()`, so it shows "recently jammed" and "no drag route" and stays read-only; verify with the **C** key that a chair left in the fringe shows "no drag route" and a just-jammed chair shows "recently jammed"

## 7. Docs and wrap-up

- [x] 7.1 Update `CLAUDE.md` (chair fetch uses the clearance grid for the pull, jam detection and give-up outcomes, `chairTuning.ts`, the **H** key and the new overlay reasons); verify the text matches the code
- [x] 7.2 Run `npm test`, `npm run lint` and `npm run build`, then play through a coworker fetch, a player fetch, a forced jam, a stolen chair and a cancel; verify each outcome matches its spec scenario
