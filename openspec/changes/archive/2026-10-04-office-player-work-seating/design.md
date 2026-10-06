## Context

Coworkers fetch chairs through `NpcSeats` (routed legs, rope-towed chair, `chairReach.ts`), delivered by the `office-work-seating` change. `NpcSeats` is already keyed by `SeatUser = NpcName | 'player'`, but its player branch is the old shortcut: `pickNearestChair` then an immediate slide to the feet. `PlayerWork` starts work when the player stands still in a work zone and stops when they move, type, or leave the zone. The scene zeroes the player's velocity every frame and then applies the arrow keys, then reads velocity for `moving` and animation. Player and coworkers share the same feet body, so the `WalkGrid` fits the player.

## Goals / Non-Goals

**Goals:**
- The player's chair trip uses the exact fetch the coworkers use, so there is one set of rules for reach, routes and dragging.
- The player can always take control back, with no stuck state.
- The work period starts when the player sits.

**Non-Goals:**
- Changing coworker fetching.
- A new way to start working.
- Changing Shift-drag or the seated look.

## Decisions

**1. Reuse the coworker branch of `NpcSeats` for the player.** `ready('player', facing)` takes the same path as for coworkers (`pickChairByRoute`, `go`, `pull`, step onto the spot, slide, `seated`). The player branch (`pickNearestChair` and the early `beginSlide`) is deleted. Alternative: a separate player controller. Rejected: it would copy the legs and drift from the coworkers.

**2. The scene hands the player's velocity to `NpcSeats` during the trip.** While a trip is active the scene skips the key-driven velocity, calls `npcSeats.ready('player', ...)` which sets the velocity, and treats the player as walking for animation (facing from velocity) even though no key is down. `updateWorkChair` today only calls `ready` when the player's velocity is zero, and `moving` is derived from velocity; both would break once auto-walk sets a velocity, so `updateWorkChair` must call `ready` for the whole fetching phase and the cancel signal must come from the keys, not the velocity. Order in `update`: compute whether any movement key is down first (`keyMoving`), cancel the trip if so, otherwise run the trip, then animate. `moving` for `PlayerWork` stays "a movement key is down", so a key press is the cancel signal and auto-walk never counts as the player moving. Alternative: let the trip drive keys virtually. Rejected: it would fight the real keys.

**3. `PlayerWork` becomes a session with a fetch phase.** States: idle, fetching, working. Start (standing still in a zone, as now) claims the desk and enters fetching. The zone check applies only to starting; once started, leaving the zone does not stop the session (the trip leaves it). Stop conditions: a movement key, typing, a bubble, or the work period ending. Fetching ends when `ready` returns true (seated, or no chair), which starts the work timer. Alternative: keep stopping on leaving the zone. Rejected: the trip itself leaves it. The transitions are a pure function so they can be unit tested.

**4. Spot and facing come from the desk.** The player steps onto the same flush spot a coworker uses, and faces the desk, so the chair parks on the right side. `WorkInteraction` exposes `spotAndFacing(sprite)` for the desk whose zone contains the player, and `NpcSeats.ready(name, facing, spot)` takes the spot as a parameter (today it records the unit's current position as the spot, which is right for coworkers who are already there, but wrong for the player). There is no separate pre-step: the routed fetch starts from wherever the player stands, and the existing last step of the pull (`stepOntoSpot`) puts them on the spot. Alternative: use the player's current position and last walked facing. Rejected: the facing is arbitrary and the chair could park beside the desk.

**5. Give-up and cancel reuse `release`.** A cancel (key, typing, chat, bubble) calls `NpcSeats.release('player')` and `PlayerWork`'s stop, which free the chair and the desk claim. `NpcSeats` already abandons after repeated bumps or `GIVE_UP_MS`; for the player, abandon does not walk back to the spot (they are the one who decides where to go): `abandon` has a player branch that skips the `return` phase, sets the phase to `none` and lets go of the chair, so `ready` returns true and the session continues as standing work at the player's current position. The return phase is for coworkers only. On giving up the player also says a forgetful line ("what was I doing?", "hmm?") from a new `FORGETFUL_PHRASES` list in `interaction/workPhrases.ts`, next to the coworkers' `DESK_TAKEN_PHRASES`, shown once in the player's speech bubble. `NpcSeats` only reports that the player gave up (a one-shot flag, read like `hasBumped`); the scene shows the line. The line is not a stop condition for `PlayerWork`, and the work timer starts right after it. A deliberate cancel (key, typing, chat) says nothing.

**7. A debug key (**B**).** Giving up is hard to trigger by hand, and a chat command cannot work since a trip stops while typing, so pressing **B** in `OfficeScene` makes the player's trip fail as if it were blocked: it sets a flag that `NpcSeats` reads as "blocked beyond the bump limit" for the player's current or next trip, then clears it once the give-up happens. It changes no rules, only forces the existing give-up path, and is a debug aid like the **G** and **C** keys.

**8. Testing.** Only pure logic is unit tested (the repo cannot run Phaser in tests): the session state transitions (decision 3) and the desk spot and facing for each desk direction (`spotFor` is moved out of `WorkInteraction` into a pure function; it only uses a clamp). The routed fetch, drag, seating and cancel run on Phaser, so they are verified by play-testing (task 4.2), as the coworkers' were.

**6. Seated player is unchanged.** `SeatLayers`, `isSeated('player')` and the type animation stay as is; only how the player gets seated changes.

## Risks / Trade-offs

- [Taking control of the player is jarring] → any movement key cancels instantly; the trip only starts after the player stood still in the zone.
- [Auto-walk through a coworker or the player's own bump] → the same bump counting as coworkers; give up after repeated bumps and work standing.
- [Starting a session at the edge of a zone then walking out confuses `PlayerWork`'s old zone rule] → the zone check moves to start only (decision 3), covered by a unit test of the state transitions.
- [A cancelled trip leaves the chair in the aisle] → by design; it is loose and can be pushed or fetched again.
