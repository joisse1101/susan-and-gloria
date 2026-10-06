## 1. Shared building blocks (abstraction first)

Everything in this group is done, and every test passing, before any task in group 3.

- [x] 1.1 Add the pure start decision and the cooldown helper (keyed by what rests: a plant, shared by every actor, or a coworker for work, as before), with unit tests for each condition (reach, interrupted, cooldown, free, standing still), for "player must leave reach after a cancel", and for one plant's cooldown blocking every actor but not another plant; verify `npm test` passes
- [x] 1.2 Add the rectangle zone type, contains test, tile-to-pixel conversion and the `interaction` tile scan with the Phaser/Tiled property reader; verify with unit tests, including a tile property in both formats
- [x] 1.3 Generalise the route to a rectangle (nearest start, goal, A*, `PathFollower`); verify with unit tests on the test grid, including a blocked goal and a fallback goal
- [x] 1.4 Generalise the flush approach step and `spotFor` to a rectangle and a side, keeping the desk case; verify the existing `deskSpot` tests pass and add tests for a rectangle on each side
- [x] 1.5 Add the say-then-hide helper; verify with a unit test that it says one random line, hides after the delay, and does not hide a newer line
- [x] 1.6 Add the interaction registry (priority order, one per actor, `cancelAll`, `isEngaged`, `pose`, `updateInteractions`); verify with unit tests for exclusion, work winning a tie, and cancel fan-out
- [x] 1.7 Tune values (reach, cooldown, watering duration) in one commented tuning file; verify each is read from there and nowhere else

## 2. Work moved onto the shared pieces

- [x] 2.1 Switch `WorkInteraction` to the shared decision, zone and scan, route, approach step and say helper; verify the existing work tests pass unchanged
- [x] 2.2 Switch `PlayerWork`/`playerSession` to the shared decision, and register both with the registry; replace the direct `work.cancel` calls in `NpcBubbles` and `showNpcThinking` with `cancelAll`, `isAtDesk`/`isImmovable`/`isWorking` with the registry queries, and `updateWork` in `Wander` with `updateInteractions`; verify `npm test`, `npm run lint` and `npm run build` pass
- [x] 2.3 Gate: run the game and check work is unchanged before any water code is written: `/gloria-work` and `/susan-work` send a coworker to a desk and it works; a coworker wandering past a free desk works; the player standing still in a zone fetches a chair, and walking through does not; speaking to a working coworker stops its work; a coworker is not pushable at its desk. Record the result in this change (verified by the user in the game: all five checks hold)

## 3. Plant objects

- [x] 3.1 Collect `interaction = water` tiles with the shared scan, dedupe cells, merge touching cells into plants with a bounding rectangle and an optional `direction`; verify with a unit test using the real map's tiles (14,3 on two layers and 15,3) that they form one plant
- [x] 3.2 Add the plant's reach zone (0.5 tile on all sides) and a debug overlay for it; verify the overlay shows one zone around the two plant tiles

## 4. Watering interaction

- [x] 4.1 Add the actor adapter (sprite, interrupted, standing still, say, owner id) for Susan, Gloria and the player; verify with unit tests that interruptions match `office-interaction-trigger`
- [x] 4.2 Claim the plant with one holder at a time; verify with a unit test that a second actor cannot claim it and that every way out releases it
- [x] 4.3 Add the praise phrase list beside the work phrases, and have a newcomer who finds the plant being watered say one once per encounter (coworkers by mutter, the player in their bubble); verify with a unit test that the line is said once and not repeated until the newcomer has left reach and come back, and in the game that a coworker passing the watering player says one
- [x] 4.4 Route an actor to the nearest open spot beside the plant (shared route, bump-and-replan, give-up) and step flush and face it with the shared approach step; verify in the game that a coworker goes to the open side, never the wall side, and gives up cleanly when blocked
- [x] 4.5 Run the watering for the set duration, then free the plant and start the cooldown; verify a coworker waters, stops, and does not restart until the cooldown has passed
- [x] 4.6 Add the player's walk to the plant, cancelled by any movement key, typing or chat with no line said; verify the player is only taken over when standing still, and does not restart after a cancel until they have left reach
- [x] 4.6b Add the chat commands `/gloria-water` and `/susan-water` beside the work commands: the named coworker drops what it is doing and goes to the plant now, ignoring the reach, the cooldown and the start conditions but still needing the plant to be free; verify in the game that each sends that coworker to the plant, that they work while it is held, and that nothing happens when the plant is held
- [x] 4.7 Register watering with the registry after work; verify a coworker never does both, work wins a same-frame tie, speaking to a watering coworker stops it, and a coworker at the plant cannot be pushed

## 5. Sprites

No sprite prerequisite: `WorkStanding.png` (all three characters) and `WateringCanStanding.png` already exist; the stream is lifted by `STAND_LIFT` (3px) in code.

- [x] 5.1 Play the standing pose (`<name>-stand-<facing>` from `WorkStanding.png`) for the facing while watering; verify in the game that each character stands facing the plant in all four directions
- [x] 5.2 Load `WateringCanStanding.png` and `WaterStream.png`, draw the can and stream (raised by `STAND_LIFT`) as overlays following the actor (back view behind the character, the rest in front), and hide them when watering ends; verify the can lines up with the standing hands for all three characters in all four directions, with Gloria's front view offset by -1 y
- [x] 5.3 Judge all three views in the game, using the debug commands: the side stream from the left and right of the plant, the front stream from below it, and the back stream from the north-wall side. Check for each that the stream lands on the plant and that the can lines up with the hands; verify by running the game and recording a verdict per view in this change — Verdict (user, in game): all views (left, right, front, back) land on the plant and the can lines up with the hands for all three characters

## 6. Docs

- [x] 6.1 Update `CLAUDE.md`'s Office section for the registry, the shared building blocks, the watering interaction, the tuning file, the debug commands and the plant overlay; verify it matches the code as built, and that no mention of the old direct `work.cancel`, `isAtDesk`/`isWorking` wiring is left
