## 1. Pure chain resolver

- [ ] 1.1 Add `interaction/pushChain.ts` (no Phaser import): given body rects, push direction, drivers, immovable set and solid rects, return which bodies may move; verify with a new `pushChain.test.ts` that `npm test` passes
- [ ] 1.2 Cover chains in tests: single chair, chair into chair, chair into wall (whole chain and driver blocked), diagonal into a corner, and coworker against a desk
- [ ] 1.3 Cover driver rules in tests: coasting chair does not push a coworker, player-driven chair pushes a coworker, coworker-driven chain pushes chairs and one coworker but not a coworker through a chair, immovable coworker blocks like a wall

## 2. Immovable predicate

- [ ] 2.1 Add `isImmovable(name)` combining bubble up, desk visit past the work zone (fetch, seated, working) and seated state; verify by logging/inspecting it in the scene while talking, working and walking to a desk
- [ ] 2.2 Make a seated coworker's chair immovable via `NpcSeats`; verify the player cannot shove a chair under a seated coworker

## 3. Wire the resolver into physics

- [ ] 3.1 Replace `yieldIfJammed`, `isJammed` and the double solid collider in `Chairs.ts` with resolver-driven process callbacks; verify chairs still slide and pull as before and cannot be pushed into walls or desks
- [ ] 3.2 Make Susan and Gloria pushable in `OfficeScene.ts` (drop `body.pushable = false` for coworkers, keep it for the player); verify the player can shove a free coworker and cannot shove one with a bubble up or working
- [ ] 3.3 Collect drivers each frame (player velocity, coworker walking velocity) and leave coasting chairs out; verify a rolled chair stops against a coworker while a player-pushed chair moves them
- [ ] 3.4 Set the player's push speed to `PULL_SPEED` while driving a chain; verify the chair or coworker keeps up without gaps opening

## 4. Shared shoved signal

- [ ] 4.1 Expose a per-coworker "shoved this step" signal from the resolver step; verify it is set when displaced and not when merely blocked
- [ ] 4.2 Use it in `Wander.ts` in place of `isPushingChair` so a shoved coworker stops and replans, counting toward `MAX_BUMPS`; verify by shoving a wandering coworker repeatedly until it pauses
- [ ] 4.3 Use it in `WorkInteraction.ts` so a coworker shoved on the way to a free desk replans to the same desk and keeps its claim, and one heading for an occupied desk turns away; verify with `/gloria-work` and shoving en route
- [ ] 4.4 Make a coworker immovable from arriving at the work zone until work ends or it gives up; verify shoving a coworker working or fetching a chair has no effect and shoving after they stop works again
- [ ] 4.5 Remove `PathFollower.isBlocked`'s chair parameter and `isPushingChair` host hooks no longer used; verify `npm run build` and `npm run lint` pass

## 5. Docs and final check

- [ ] 5.1 Update the Office section of `CLAUDE.md` for pushables, drivers and the resolver
- [ ] 5.2 Manual pass against `office-pushables` scenarios (wall, chain, corner, talking, working, walking to a desk, coasting chair) with `G` and `C` debug views, then run `npm test`, `npm run lint` and `npm run build`
