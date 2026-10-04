## Context

See proposal.md for why. What the code does today:

- `WalkGrid` (8 px cells) marks a cell walkable when it and one neighbour either side are free. That models the walker's 22x8 px body. Every route (`planLeg`, `findPath`, `planChairFetch`) uses this one grid.
- A towed chair is a separate body of 28x16 px (a 14x8 body at scale 2). `NpcSeats.dragChair` chases a point on a short rope behind the walker with a velocity, so walls still stop it, but it takes the straight line to the walker, not the path, so it swings inside corners.
- `NpcSeats` only notices trouble through the walker (`PathFollower.isBlocked`, bump count) and a 30 s `GIVE_UP_MS`. A wedged chair is invisible to it.
- Give-ups today: a coworker (`abandon`) goes into phase `return`, replans on the thin grid to within 4 cells of the spot, walks the last bit straight for up to 2 s, then works standing wherever it is, silently. The player stops where they are, `hasGivenUp` makes `PlayerWork.startWork` say a forgetful line, and the work period starts anyway.
- Measured on the real map (rebuilt from `map.json`): six desk blocks, 3-tile aisles between columns, and one 32 px aisle between the two desk rows. A chair-sized footprint keeps 75-82% of the walker's cells in one connected region, and every chair and every staging cell stays in it. The loss is a one-cell fringe around the desks and walls.
- A player can take a claimed chair with the pull key: `Chairs.grab` considers every enabled chair, claimed or not. `Chairs.nearest` only skips claimed chairs for fetching.

## Goals / Non-Goals

**Goals:**
- The route the chair travels on leaves room for the chair, with margin for corner swing.
- A jammed chair is noticed within a couple of seconds and handled gracefully, for coworkers and the player.
- Every threshold is adjustable in one file; two debug views show the new behaviour.

**Non-Goals:**
- A direction-aware planner (the map's aisles are wide enough that the simple footprint costs nothing; see Decisions).
- Changing the push/pull physics, the reach limits (5 tiles, 15 route tiles), or desk-sharing rules.
- Checking the first few pixels when a chair starts out inside the fringe and is pulled clear: that stretch is short and unplanned, and the jam detector covers it.

## Decisions

**1. A second grid with a bigger footprint, used only for the pull.**
`WalkGrid` takes a footprint (cells either side, rows up, rows down) in place of the hard-coded `SIDE_CELLS = 1`. The thin grid is `{ side: 1, up: 0, down: 0 }`, as today. The clearance grid is `{ side: 2, up: 1, down: 1 }`, a 5x3-cell box (40x24 px): the 28x16 px chair centred on a cell spans cells -2..+2 across and -1..+1 down, and the cell test is stricter than the pixel size by about 6 px (sideways) and 4 px (up and down), which is the margin for corner swing. Both grids are built once in `OfficeScene` from the same obstacles. The clearance grid is used for: the staging cell, the drag leg in `planChairFetch`, `NpcSeats.startPull` and the replans inside `pull()`. Everything else, including the walk to the chair, `abandon`'s return and wandering, stays on the thin grid.
- *Alternative: direction-aware A\* (width needed depends on travel direction).* More accurate in 1-tile corridors, but the A\* edge checks and diagonals get complicated, and on this map it would change nothing. Revisit if a map with real 1-tile chokepoints appears; the footprint is a tuning value, so it can be loosened first.
- *Alternative: plan thin, then simulate the chair along the path.* Duplicates the physics and is hard to unit test.
- *Alternative: one fat grid for everything.* Needlessly shrinks the walker's own space (no walking along desk edges).

**2. Reach filter stays thin; the drag decides.**
`chairsInReach` keeps measuring the walker's route from the spot to the chair, because the 5-tile and 15-tile limits describe that walk. The usability of a chair is decided by `planChairFetch`: it returns `null` when there is no clearance-grid route from the chair to the staging cell. `pickChairByRoute` already skips a chair whose plan is `null`, so the next chair is tried, else the walker works standing. The drag start cell is snapped to the clearance grid, and a chair with no clearance cell near it (jammed in the fringe) is rejected the same way.
- The chair-reach debug overlay needs to show "no drag route", so it calls `planChairFetch` for chairs that pass the reach filter. That needs each work spot's facing vector (`SEAT_BACK`), so `workSpots()` also returns it. The overlay only reads state.

**3. Jam detection: lag behind the rope, held for a time.**
While in the pull phase (and the final step onto the spot), each frame compute `lag = distance(walker centre, chair centre) - rope`. The `rope` is the touching distance `dragChair` already uses. If `lag` exceeds `JAM_MARGIN_PX` the jam timer runs; if it drops back under, the timer resets; when it reaches `JAM_TIME_MS` the chair is jammed. The decision is a small pure function (state in, state out) in its own file so it can be unit tested without Phaser. Defaults: 12 px and 1500 ms.
- *Alternative: chair velocity is zero while the walker moves.* Fails when the chair creeps along a wall, which is a jam in all but name.
- *Alternative: rely on the 30 s timer.* This is the problem being fixed.
- The existing 30 s limit stays as the "trip takes too long" give-up (forgetful). A jam is the quicker, more specific case and fires first.

**4. Two give-up outcomes, reported as flags like `hasBumped`.**
`NpcSeats.abandon` takes a reason. `NpcSeats` stays free of speech and desk logic; it exposes one read-once signal per walker, `hasGivenUp(name)`, now returning `'jam' | 'lost' | undefined`, and its `return` phase works for the player too.
- `'jam'`: walker lets go, the chair is marked jammed in `Chairs` (cooldown), and `NpcSeats` walks the walker back on a thin-grid route to the spot (skipped if already on or beside it), then `ready()` returns true so work starts standing. If no route exists, it is treated as `'lost'`.
- `'stolen'` (the player took the claimed chair): handled like `'jam'` (walk back, or make do on the spot, forgetful with no route back), except the chair is not put on cooldown (the player holds it) and the host says a `STOLEN_PHRASES_NICE` line followed by a `JAM_PHRASES` line, in one bubble.
- `'lost'` (blocked repeatedly, 30 s, or no route back): walker lets go and stops. No walking back.
- The host reacts: `WorkInteraction` (coworkers) says a `JAM_PHRASES` line for `'jam'` (a `STOLEN_PHRASES_NICE` line and a `JAM_PHRASES` line joined into one bubble for `'stolen'`) and carries on, or for `'lost'` says a `FORGETFUL_PHRASES` line, releases the desk and calls `scheduleVisit` with the usual cooldown, as `turnAway` does, so the coworker goes back to wandering. `PlayerWork` says the `JAM_PHRASES` line at the moment of the jam and starts work on arrival, or for `'lost'` says the forgetful line, releases the desk and drops back to idle without starting work. The desk-taken check runs first, so an occupied desk still gives the desk-taken line.
- A movement key, typing or chat while the player walks back cancels it through the existing cancel path: no work, no second line.

**5. Taking the chair is detected on `Chairs`.**
`Chairs` gets `isHeld(chair)` (true while `held` is that chair). In the `go` and `pull` phases `NpcSeats` treats a held, claimed chair as `'lost'`. This also covers the player pulling their own chair with Shift.

**6. A cooldown on the chair, not on the walker.**
`Chairs` keeps `jammedUntil` per chair. `pickChairByRoute` treats a chair on cooldown as unavailable and the overlay labels it "recently jammed". Putting it on the chair means no one (neither coworker nor player) re-fetches a chair that just wedged. The cooldown follows the chair, not its position: if the chair is moved afterwards, it stays blocked until the cooldown that began at the jam ends. That is simpler than tracking movement, and the cooldown is short. The registry is a small pure module with the clock passed in, so it is unit tested.

**9. Decisions live in pure functions, so they can be tested.**
The repo only unit-tests pure logic, and most of the new behaviour would otherwise sit in Phaser-bound classes. Each decision is extracted and tested; the classes only gather inputs and act on the result:
- `giveUpOutcome(reason, atSpot, routeBack, deskOccupied)` returns what the walker does: jam with a walk back, jam on the spot (no walking), forgetful stop, or desk-taken. It encodes the precedence rules (desk-taken first; a jam with no route back becomes forgetful; a chair held by the player is lost).
- `fetchCandidates(...)` combines `chairsInReach`, the cooldown and `planChairFetch` into the ordered list of usable chairs plus a reason for each rejected one. `NpcSeats.pickChairByRoute` and `ChairReachOverlay` both call it, so the overlay cannot disagree with the fetch.
- The jam check takes the lag (computed by a pure `chairLag`, which also owns the rope length), the time, and the limits, and returns the new timer state. Its state resets when a leg is replanned or the phase changes.
- `playerSession.ts` gains inputs for the lost, jam and arrived events, so the player's transitions are tested like the existing ones.
- The read-once give-up signal (`hasGivenUp`) is a small helper that is tested with a fake.

**7. Tuning file.**
New `src/game/office/chairTuning.ts` beside `pushTuning.ts`, in the same style (a comment per value, units in the header): `CHAIR_CLEARANCE_CELLS` (the footprint, with the derivation in the comment), `JAM_MARGIN_PX`, `JAM_TIME_MS`, `JAMMED_CHAIR_COOLDOWN_MS` (default 60000). Phrase lists stay in `workPhrases.ts`: a new `JAM_PHRASES` ("oh, never mind...", "I'll make do...", "good enough...", and similar), with `FORGETFUL_PHRASES` shared by the player and coworkers.

**8. Debug views.**
- Key **H** toggles a clearance view. `WalkGridOverlay` is generalised to draw both grids: green where the chair fits, yellow where only the walker does, red blocked. It is built once like the existing G overlay and ignores the key while typing.
- The **C** view gains the reasons "recently jammed" and "no drag route".

## Risks / Trade-offs

- [Symmetric footprint is conservative; a map with 1-tile gaps would lose chair routes] → The footprint is one tuning value; chairs then simply go unused (walkers work standing). Direction-aware planning is the documented next step.
- [Jam detector false positives, such as the player standing in the chair's way for a moment] → Time threshold plus margin; both tunable. A jam by a transient body resets when lag drops.
- [Jam detector false negatives: a chair that creeps along a wall just under the margin] → The 30 s limit still ends the trip, with the forgetful outcome.
- [Player behaviour changes (BREAKING): after a forgetful give-up they no longer work standing] → It is the intended behaviour and is stated as a modified requirement.
- [A jammed chair left in an aisle may block others] → It is a normal loose chair and can be pushed or pulled; the cooldown stops it being re-fetched in the meantime.
- [`workSpots()` change touches the overlay source interface] → Debug code only; covered by a test of the pure drag plan.
