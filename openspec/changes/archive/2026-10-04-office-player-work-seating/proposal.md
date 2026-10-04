## Why

Coworkers now walk a routed path to a chair, drag it behind the desk and sit. The player still has a shortcut: when they stand still in a work zone, the nearest chair simply slides to their feet. It looks different from the coworkers, ignores walls, and uses a different rule for which chair counts as in reach. The player should do the same chair trip the coworkers do.

## What Changes

- When the player stands still in a work zone and starts to work, and a loose chair is within reach (the same rule as coworkers: within 5 tiles in a straight line and a walking route of at most 15 tiles), the character takes over and walks to the chair by a routed path, drags it to half a tile behind the work position, steps onto the work position and sits. No chair in reach: they work standing, as before.
- The trip is automatic. Pressing any movement key, starting to type, or opening chat cancels it: the player lets go of the chair, which stays where it is, and gets control back immediately.
- The work period (and the thinking bubbles) start once the player is seated, or immediately when there is no chair.
- The player keeps holding the desk for the whole trip, so coworkers do not pick it, and is still never blocked from one.
- The old slide-to-the-feet seating for the player is removed. Hand-dragging a chair with Shift is unchanged.
- Out of scope: changing how coworkers fetch chairs, and any new way to start work (it still starts by standing still in the zone).

## Capabilities

### New Capabilities
- `office-player-work`: how the player's work seating works: the automatic chair trip, cancelling it, and when work starts.

### Modified Capabilities
<!-- none: the coworker rules live in the archived office-work-seating change (now `openspec/specs/office-npc-work`) and are reused, not changed -->

## Impact

- `src/game/office/interaction/player/PlayerWork.ts` (work session that outlives leaving the zone; starts the work timer when seated)
- `src/game/office/interaction/npc/NpcSeats.ts` (the player takes the same routed fetch as coworkers; the slide-to-feet branch goes)
- `src/game/office/interaction/npc/WorkInteraction.ts` (a way to get the desk's work spot and facing for the player)
- `src/game/office/OfficeScene.ts` (auto-walk takes over the player's velocity and animation; movement keys cancel)
- `CLAUDE.md` (the player and work-trip notes describe the old slide-to-the-feet seating)
- Reuses the archived `office-work-seating` change, already applied (it provides `chairReach.ts`, `PathFollower`, the routed `NpcSeats`).
