## Why

Chairs can be shoved around, but the rule that keeps them out of walls is a set of flag tricks in `Chairs.ts` (`body.blocked`, a one-step `pushable` flip) that only handles one contact at a time, so chains of bodies can slip into obstacles. Susan and Gloria are also solid walls to everyone: nobody can shove them and they have no reaction to being shoved. The office should have one consistent rule for what can be pushed, by whom, and what stops a push.

## What Changes

- Chairs, Susan and Gloria become **pushable obstacles**; the player pushes but is never pushed.
- The player can also **pull** a free coworker with the pull key, the same way they pull a chair. A pulled coworker trails the player and is let go of if it is blocked, lags, or enters an interaction; being pulled and then let go makes it stop and replan.
- A push starts at a **driver**: a body moving under its own power this step (the player walking or pulling, a free coworker walking). It travels along the chain of bodies in front of the driver.
- A chair only pushes a coworker while the player is driving it (pushing or pulling); a coasting chair (after a roll, or let go of) stops against a coworker like against a wall.
- Coworkers can shove each other. A coworker driving a push moves chairs and one other coworker directly; it does not relay a push through a chair onto a coworker.
- **No pushable can be pushed into a solid**: if any body in a driven chain is blocked by a wall, desk, immovable coworker or the player, the whole chain stops, including the driver. This replaces the per-contact jam flags with one chain resolver.
- A coworker is **immovable while in an interaction**: talking, thinking or noticed (speech bubble up), and from arriving at a work zone through chair fetch, seating and working. A seated coworker's chair is immovable too.
- A coworker walking to a desk is still pushable. Any shove stops them and replans the route; they keep the desk claim. Repeated shoves reuse the existing bump limit before giving up.
- Wander and the work trips react to one shared "shoved" signal instead of each reading collision flags.

## Capabilities

### New Capabilities
- `office-pushables`: which bodies are pushable and pullable, who drives a push, the chain rule that stops it at solids, how pulled bodies trail the player, and when coworkers become immovable.

### Modified Capabilities
- `office-npc-wander`: a coworker that is shoved (not only bumped) stops and replans.
- `office-npc-work`: a coworker heading for a desk that is shoved replans to the same desk and keeps its claim (or gives up if the desk is occupied); arrival at the work zone makes it immovable.

## Impact

- `src/game/office/furniture/Chairs.ts`: jam flags and `yieldIfJammed` replaced by the chain resolver.
- New pure module for the chain resolver with Vitest tests (alongside the existing `interaction/npc/*.test.ts` style).
- `OfficeScene.ts`: collider wiring (player/coworker/chair colliders, `pushable` flags, coworker immovable predicate).
- New `src/game/office/pushTuning.ts`: mass, drag and speed constants for chairs, coworkers and the player in one tunable place.
- `Wander.ts`, `WorkInteraction.ts`, `PathFollower.ts`: shared shoved signal replaces `isBlocked`/`isPushingChair`.
- `CLAUDE.md` architecture notes for the Office section.
- No new dependencies; Arcade physics stays (Matter was considered and rejected as a rewrite for little gain).
