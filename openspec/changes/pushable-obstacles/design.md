## Context

See proposal.md for motivation. Today (`furniture/Chairs.ts`, `OfficeScene.ts`):

- Chairs are Arcade dynamic bodies. The player and both coworkers have `body.pushable = false`, so they are never moved; chairs slide out of their way.
- "Not into a wall" is enforced with `body.blocked` flags set by a solid collider that runs before and after the mover and chair-vs-chair colliders, plus `yieldIfJammed`, which flips a flag for one physics step. Arcade resolves one pair at a time, so a longer chain only works if each link was already flagged.
- Coworkers are solid to the player and to chairs. `PathFollower.isBlocked` (blocked or touching, except while sliding a chair) is read separately by `Wander` and `WorkInteraction`.
- "In an interaction" has no single predicate: a bubble up (`bubbles.isVisible`), a desk visit in `WorkInteraction`, seated state in `NpcSeats`.
- The walk grid is built from static solids only; chairs and bodies are not route obstacles (existing wander spec).

## Goals / Non-Goals

**Goals:**
- One explicit rule for push chains, testable without Phaser.
- Chairs, Susan and Gloria pushable under the spec's driver rules; interacting coworkers immovable.
- One shared "shoved" signal that both Wander and Work trips handle the same way.

**Non-Goals:**
- Changing the physics engine, the A* grid, or route planning around chairs and bodies.
- Pulling coworkers, or the player being pushed.
- Mass or friction tuning beyond what feels right; speeds are constants to tweak.

## Decisions

### 1. Keep Arcade, add a pure chain resolver in front of it
A pure module (`interaction/pushChain.ts`, no Phaser import) takes body rects, a push direction, which bodies are drivers, which are immovable, and the solid rects, and returns which bodies may move this step (or none, if the chain is blocked). A body may move only if every body in front of it, transitively, may move and it is not blocked by a solid or immovable body.

The Phaser side feeds it from the colliders' process callbacks and sets `body.immovable` / `body.pushable` for the step from its answer. This replaces `yieldIfJammed`, the `isJammed` checks and the double solid collider.

*Alternatives:* Matter (resolves stacks natively, but costs the A* grid, feet bodies, pull mechanic, `PathFollower` steering, tests and specs for a small gain); Arcade `mass` only (handles who yields first, not chains or drivers). Rejected. `mass` may still be set so chairs yield before coworkers.

### 2. Drivers, not body types, decide who pushes
Each frame the scene collects drivers: the player when it has non-zero velocity (walking or pulling a chair), a coworker while `PathFollower`/work walking sets its velocity. A chain is rooted at a driver and follows contacts in front of it. Coasting chairs (after `roll()` or release) are never drivers, so they stop against coworkers.

Coworker-driven chains are limited to one hop for coworkers: chairs and one other coworker directly, never a coworker through a chair. The resolver takes this as a depth/kind rule keyed on the driver's kind.

### 3. Immovable is a derived predicate, not stored state
`isImmovable(name)` combines: speech bubble up, desk visit past arrival at the zone (fetching, seated, working), and seated. It is read when building the resolver input each frame, so it cannot go stale. A seated coworker's chair is immovable through `NpcSeats`. Walking to a desk (before the zone) is pushable.

*Alternative:* toggle `body.pushable` at each interaction start/stop. Rejected: many start/stop sites (bubbles, thinking, work, seats), easy to leak a stuck state.

### 4. One shoved signal
The resolver step returns, per coworker, whether it was displaced by a push. `Wander` and `WorkInteraction` read it in place of `PathFollower.isBlocked(npc, pushingChair)` and `isPushingChair`; both react the same way: stop, replan from the current cell, count a bump toward `MAX_BUMPS`, give up after the limit. `isBlocked` stays only for being stopped by something that did not move (player, immovable coworker, solid). For a work trip the claim is kept on a shove; an occupied desk still ends in the existing turn-away.

### 5. Shove speed
While driving a chain the player moves at the existing `PULL_SPEED` (120) so chairs, capped at `MAX_SPEED`, keep up. Coworkers keep `WALK_SPEED`. Both are constants to adjust by feel.

## Risks / Trade-offs

- [Process-callback ordering in Arcade makes the resolver see stale positions] → resolver works on the bodies' positions at the start of the step and decides before separation; cover with tests for chains, corners, and a driver against a wall.
- [Tunnelling at corner or diagonal contacts] → same resolver tests; check axis-wise in the pure module; manual check with the walk-grid and chair-reach debug views.
- [A shoved coworker keeps replanning while the player keeps pushing] → bump limit from existing `MAX_BUMPS`, then the usual pause.
- [Coworker stuck in the player's way becomes a soft wall near furniture] → accepted; the blocked path already makes them replan.
- [Immovable at the zone edge: a coworker shoved into the zone counts as arrived] → accepted as harmless.
- [Larger scene wiring change touches colliders for four body kinds] → keep wiring in one place (`Chairs`/a small `Pushables` owner) and update CLAUDE.md.

## Open Questions

- Exact push speed and whether chairs should be lighter than coworkers (tune by feel after the first playtest).
