## Context

See proposal.md for the motivation. Today the "should I start" decision for work is written twice: `WorkInteraction` (coworkers: scheduled visits, `deskAt`/`contains`, `isBusy`, `cooldownUntil`) and `PlayerWork` with the pure `playerSession` (player: `inZone`, `moving`, `typing`, `bubble`, `done`). The parts that are already shared are keyed by an actor id: `WorkSlots` claims, `NpcSeats` (`'player'` or a coworker name), `PathFollower`, and the A* helpers (`findPath`, `nearestReachableCell`, `nearestWalkableCell`). The plant is on collider layers, so the walk grid blocks it and an actor can never stand on it. The water tiles have no `direction` property.

Sprite constraints: `WateringCan.png` is aligned cell for cell with the seated `Type.png` (hands at side x22-23, y20/22; front x14-17, y22-24). `WaterStream.png` is 48x16 (side, front, back), anchored to the can's rose. Standing watering sheets are drawn separately and put the hands on the same pixels, so neither sheet needs an offset.

## Goals / Non-Goals

**Goals:**
- One pure trigger function used by work and watering, for all three actors, with unit tests.
- Watering that reuses the existing routing, claims and interruption signals.
- Adjustable reach, cooldown and duration in one tuning place.

**Non-Goals:**
- Moving the rest of work (scheduled visits, chair trips, jams, desk-taken, phrase lists, timers) onto the shared pieces. They stay as they are.
- A shared trip runner for the bump, replan and give-up handling. Work's `updateVisit` interleaves it with desk-occupied checks, so it stays in work; the watering interaction implements its own small version, which can be merged later.
- A chance roll on starting, a water level or growth state for the plant, or a visual change to the plant.
- Drawing the standing watering sheets (done separately, before the sprite wiring task).

## Decisions

**1. The shared core is a pure decision, not a state machine.** `shouldStart(input)` takes `{ inReach, interrupted, onCooldown, free, stillRequired, standingStill }` and returns a boolean; a cooldown helper (`cooldownUntil` keyed by what rests: a plant, or a coworker for work) lives beside it. Both `WorkInteraction`/`PlayerWork` and the new watering interaction call it, each supplying their own inputs. Alternative: one generic session machine over all states (walking, fetching, doing). Rejected for now: work's states (chair fetch, walking back, jam) differ from watering's, and the request is to move only the trigger. `playerSession` keeps its states and calls the shared decision for its `idle -> fetching` edge. The shape leaves room to share more later.

**2. Actors are described by an adapter, not by their type.** An adapter gives `sprite`, `isInterrupted()`, `isStandingStill()`, `say()` and an owner id. Coworkers: interrupted = bubble up or pulled; stillRequired = false. Player: interrupted = movement key, typing or bubble; stillRequired = true. The watering interaction reads only the adapter, so it has no branch on "is this the player".

**3. The plant is one object, found by merging touching water tiles.** `collectTiles` reads `interaction = water`, dedupes cells (the pot and the leaves share a cell), and groups touching cells (4-neighbours) into a plant with a bounding rectangle. The reach zone is that rectangle grown by `WATER_REACH_TILES = 0.5` on all sides, and contains-tests use the actor's body centre, as the work zones do.

**4. The stand spot is chosen by A*, with an optional override.** The goal is the nearest reachable walkable cell around the plant (`nearestReachableCell` towards the plant's centre, fallback radius as for work), found with the actor's own grid. A final straight step goes flush against the plant and sets facing toward it (`FACING` data, as for work). An optional `direction` tile property fixes the side, as work tiles do; absent, the nearest open side wins. Wall sides are blocked on the grid and so are never chosen.

**5. The player walks the same way a coworker does.** The player's trip uses `PathFollower` over `walkGrid`, driven from the player's update, ended by any key, typing or bubble. `playerSession` gains a `walking` state for it (the `fetching` pattern). While it runs the player's own velocity is overwritten, as during the chair trip.

**6. One claim per plant, using the existing slots.** The plant's id goes through `WorkSlots` with the actor's owner id, so the claim, release and "taken by someone else" rules are the ones desks have. Desks and plants live in separate slot sets so a plant never blocks a desk. An actor holds at most one thing (a desk or the plant) at a time.

**7. Watering's cooldown is per plant, shared by all actors (decided), and the player must leave reach.** The plant rests after it has been watered: once anyone finishes, is interrupted from, or gives up watering it, nobody waters it again until the cooldown has passed. A second plant would have its own cooldown. Work keeps its existing per-coworker cooldown, so the cooldown helper is keyed by whatever rests (a plant, or a coworker for work). For coworkers it is a timestamp checked in the trigger. For the player the cooldown plus a "left reach since it ended" flag (the existing `done` idea) stops standing still from restarting it at once. Values go in a tuning file with comments, like `chairTuning.ts` and `pushTuning.ts`.

**8. Sprites are overlays that follow the actor, drawn like the chair layers.** While watering, a can overlay and a stream overlay follow the sprite, using the can sheet's frame for the facing (down, up, right, left) and the stream cell for side, front or back. Back-view overlays are drawn behind the character, the others in front. The can overlay uses the standing sheet's frame timing. The back stream is used unchanged first.

**9. Work priority.** Work and watering never run together; an actor already heading for or doing one interaction does not start the other. When both could start in the same frame, work wins (its trips are rarer and deliberate).

**10. Shared building blocks, extracted from work before water is written.** Each is a small module that `WorkInteraction`/`PlayerWork` call, so water reuses it and nothing is copied:
- *Interaction registry.* Each actor is in at most one interaction. Interactions register in priority order (work, then water). The registry gives `Wander` one `updateInteractions(name)` in place of `updateWork`, fans an interrupt out as `cancelAll(name)` (replacing the direct `work.cancel` calls from `NpcBubbles` and `showNpcThinking`), and answers the scene's `isEngaged(name)` (pushability) and `pose(name)` (kind, facing, working) queries instead of `isAtDesk`/`isWorking`. The player is registered with the same interface.
- *Route to a rectangle.* `routeTo` generalised from a desk zone to a rectangle: the nearest walkable start, the goal as the nearest reachable cell to the rectangle's centre, A*, and a `PathFollower`.
- *Approach step.* The straight-line step onto the flush spot, with timeout, tolerance and facing, taking a rectangle and a side. `deskSpot.spotFor` is already pure and is generalised the same way.
- *Zones and tile scan.* The rectangle type, the contains test on the body centre, the tile-to-pixel conversion, and the scan for tiles with an `interaction` value, with the Phaser/Tiled property reader.
- *Say-then-hide.* Say a random line, then hide the bubble after the usual delay. Used by work's turn-away and make-do lines and by the praise line.
The order is fixed: extract these, switch work over, and get the existing tests plus new tests for each piece passing, then write the watering interaction on top.

## Risks / Trade-offs

- [Moving work onto the shared pieces could change its behaviour, in particular the registry touching the scene wiring] -> the abstraction is its own step with a gate: every existing test and new tests for each piece pass, and work is exercised in the game (`/gloria-work`, `/susan-work`, player at a desk, speaking to a working coworker), before any water code is written.
- [Moving the work trigger could change work behaviour] -> keep the change to calls into the pure function, keep the existing tests green, and add tests for the shared function covering exactly the conditions work uses today.
- [The player is taken over when they stop near the plant] -> the player only triggers when standing still, a movement key, typing or opening chat cancels it at any stage (walking there or watering), exactly as for the work session, no line is said, and the cooldown plus leave-reach rule stops a restart.
- [Pass-by watering by two coworkers wanders into the same spot] -> one claim per plant, and the second gives up and says a praise line ("good work", "looking good", "thanks", "that's beautiful") from an editable list, like the work phrases. The line is said once per encounter: it is not repeated until the newcomer has left the plant's reach and come back.
- [Plant against the north wall means the "up" case is rare] -> the back view is drawn as it is for now and judged in game; if it reads wrong, the stream design changes, not the interaction.
- [The player's walk to the plant can be blocked by chairs or furniture the grid does not model] -> same bump-and-replan and give-up rules as the other trips.

## Open Questions

- Exact values for the cooldown and the watering duration (to be tuned in the game).
