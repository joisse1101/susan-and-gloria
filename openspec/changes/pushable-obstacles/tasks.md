## 1. Pure chain resolver

- [x] 1.1 Add `interaction/pushChain.ts` (no Phaser import): given body rects, push direction, drivers, immovable set and solid rects, return which bodies may move; verify with a new `pushChain.test.ts` that `npm test` passes
- [x] 1.2 Cover chains in tests: single chair, chair into chair, chair into wall (whole chain and driver blocked), diagonal into a corner, and coworker against a desk
- [x] 1.3 Cover driver rules in tests: coasting chair does not push a coworker, player-driven chair pushes a coworker, coworker-driven chain pushes chairs and one coworker but not a coworker through a chair, immovable coworker blocks like a wall, and a blocked trailing (pulled) chair is released without blocking its driver

## 2. Immovable predicate

- [x] 2.1 Add `isImmovable(name)` combining bubble up, desk visit past the work zone (fetch, seated, working) and seated state; verify by logging/inspecting it in the scene while talking, working and walking to a desk
- [x] 2.2 Make a seated coworker's chair immovable via `NpcSeats`; verify the player cannot shove a chair under a seated coworker

## 3. Wire the resolver into physics

- [x] 3.0 Add `pushTuning.ts` exporting chair/coworker mass, chair/coworker drag, `ROLL_MS`, pull/max speed and player push speed, each commented; move the existing `Chairs.ts` constants into it and make chairs, coworkers and the player read from it; verify `npm run build` passes, chairs move as before, and changing a value then reloading changes the feel
- [x] 3.1 Replace `yieldIfJammed`, `isJammed` and the double solid collider in `Chairs.ts` with resolver-driven process callbacks; verify chairs still slide and pull as before and cannot be pushed into walls or desks
- [x] 3.2 Make Susan and Gloria pushable in `OfficeScene.ts` (drop `body.pushable = false` for coworkers, keep it for the player); verify the player can shove a free coworker and cannot shove one with a bubble up or working
- [x] 3.3 Collect drivers each frame (player velocity, coworker walking velocity) and leave coasting chairs out; verify a rolled chair stops against a coworker while a player-pushed chair moves them
- [x] 3.4 Generalise pull to coworkers: grab the nearest loose chair or non-immovable coworker, hold one at a time, suspend a held coworker's steering, release when blocked, lagging, key up or it becomes immovable; verify the player can pull a free coworker around, cannot grab a working or talking one, and a bubble coming up frees a held one
- [x] 3.5 Set the player's push speed from the tuning values (default `PULL_SPEED`) while driving a chain; verify the chair or coworker keeps up without gaps opening

## 4. Shared shoved signal

- [x] 4.1 Expose a per-coworker "shoved this step" signal from the resolver step; verify it is set when displaced and not when merely blocked
- [x] 4.2 Raise the shoved signal once when a pulled coworker is released, not each frame it is held; verify a long pull causes a single replan and one bump
- [x] 4.3 Use it in `Wander.ts` in place of `isPushingChair` so a shoved coworker stops and replans, counting toward `MAX_BUMPS`; verify by shoving a wandering coworker repeatedly until it pauses
- [x] 4.4 Use it in `WorkInteraction.ts` so a coworker shoved on the way to a free desk replans to the same desk and keeps its claim, and one heading for an occupied desk turns away; verify with `/gloria-work` and shoving en route
- [x] 4.5 Make a coworker immovable from arriving at the work zone until work ends or it gives up; verify shoving a coworker working or fetching a chair has no effect and shoving after they stop works again
- [x] 4.6 Remove `PathFollower.isBlocked`'s chair parameter and `isPushingChair` host hooks no longer used; verify `npm run build` and `npm run lint` pass

## 5. Docs and final check

- [x] 5.1 Update the Office section of `CLAUDE.md` for pushables, drivers, the resolver and `pushTuning.ts` (what each value does)
- [ ] 5.2 Manual pass against `office-pushables` scenarios (wall, chain, corner, talking, working, walking to a desk, coasting chair) with `G` and `C` debug views, then run `npm test`, `npm run lint` and `npm run build`
