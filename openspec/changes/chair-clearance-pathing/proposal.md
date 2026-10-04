## Why

When a walker (Susan, Gloria or the player) drags a chair to a desk, the route is planned for the walker's own 24x8 px footprint, but the towed chair is 28x16 px and swings inside corners. The chair wedges against desks and walls while the walker keeps walking, and nothing notices until the 30 s time-out. Walkers also give up silently or abruptly in several ways that read as unnatural.

## What Changes

- Plan the pull part of a chair trip (take hold, drag, staging cell) on a second, "fat" walkable grid that only admits cells whose surroundings fit the chair, and keep the thin grid for every other walk. The footprint and the fat grid are tunable.
- A chair with no fat route from where it sits to the staging cell is skipped like any other unusable chair: the walker picks the next chair or works standing.
- Detect a jammed chair (it lags too far behind the walker for too long). The walker lets go of the chair, says a "make do" line, walks to the work spot and works standing. The jammed chair is left unclaimed and is not fetched again for a cooldown.
- Coworkers that lose a chair trip in a way that stops them reaching the spot (blocked repeatedly, trip too slow, no way back) now say a forgetful line, release the desk and go back to wandering. Today they silently walk straight at the spot and work wherever they end up.
- **BREAKING**: when the player loses a chair trip in those same ways, they say the forgetful line and get control back, with no work session started. Today they work standing where they are.
- Jam thresholds and cooldowns live in one tuning file, like the push and pull feel does.
- Debug aids: a key toggles a view of the fat grid; the chair-reach view gains a "no drag route" reason.

## Capabilities

### New Capabilities

### Modified Capabilities
- `office-npc-work`: chair fetch plans the drag on a clearance grid, jammed-chair give-up with a "make do" line, forgetful give-up then wander, tunable limits, and debug views.
- `office-player-work`: the player's give-up no longer ends in standing work, plus the jam give-up with a "make do" line and walk back to the spot.

## Impact

- `src/game/office/interaction/npc/`: `WalkGrid.ts` (footprint parameter), `chairReach.ts` (drag planned on the fat grid), `NpcSeats.ts` (jam detection, new give-up reasons, return to spot for the player), `WorkInteraction.ts` (forgetful give-up and wander for coworkers), `WalkGridOverlay.ts` and `ChairReachOverlay.ts` (debug views).
- `src/game/office/interaction/player/PlayerWork.ts`: session no longer starts after a forgetful give-up.
- `src/game/office/interaction/workPhrases.ts`: a new `JAM_PHRASES` list.
- `src/game/office/OfficeScene.ts`: builds the second grid and wires the new key.
- New `src/game/office/chairTuning.ts` beside `pushTuning.ts`.
- Unit tests beside `chairReach.test.ts` and `pathing.test.ts`. No new dependencies.
