## MODIFIED Requirements

### Requirement: The trip gives up when it cannot finish
The automatic trip SHALL be abandoned and the chair let go when the player is blocked repeatedly, the trip takes too long or the way back to the work position is lost. The player SHALL then be left standing where they are and SHALL have control straight away. No work session SHALL start and the desk SHALL be released.

When the player gives up like this, they SHALL say a short forgetful line in their speech bubble (such as "what was I doing?" or "hmm?") so the sudden stop reads as natural. The line SHALL be shown once per give-up.

#### Scenario: Blocked repeatedly
- **WHEN** a coworker or furniture the route did not allow for blocks the trip again and again
- **THEN** the player lets go of the chair, says a forgetful line, gets control back and does not start working

#### Scenario: Trip takes too long
- **WHEN** the trip has not finished within the time limit
- **THEN** the player lets go of the chair, says a forgetful line, gets control back and does not start working

#### Scenario: Desk released
- **WHEN** the player gives up with a forgetful line
- **THEN** the desk is no longer held by the player, so coworkers may choose it

#### Scenario: Cancelled by the player
- **WHEN** the player cancels the trip with a key, typing or chat
- **THEN** no forgetful line is said, since the player chose to stop

## ADDED Requirements

### Requirement: A jammed chair ends the trip but not the work
When the chair the player is dragging jams (it stays further behind the player than the towing distance allows, by more than the set margin, for longer than the set time), the player SHALL let go of it, say a randomly chosen line from the "make do" phrases (such as "oh, never mind..." or "I'll make do..."), walk to the work position by a routed path and work standing there, and the work period SHALL start when they arrive. The line SHALL be shown once per give-up. The jam margin and time use the same adjustable values as for coworkers. If there is no route back to the work position, the forgetful give-up applies instead.

#### Scenario: Chair jams on the way
- **WHEN** the player's chair jams while being dragged and the work position can still be reached
- **THEN** the player lets go of the chair, says a "make do" line, walks to the work position and works standing

#### Scenario: Chair jams on the last step
- **WHEN** the chair jams while the player is already on the work position
- **THEN** the player says a "make do" line and works standing without walking anywhere

#### Scenario: Cancelled while walking back
- **WHEN** the player presses a movement key, starts typing or opens chat while walking back after a jam
- **THEN** the walk back stops, control returns, no work starts and no second line is said

#### Scenario: No way back
- **WHEN** a jam happens and there is no route back to the work position
- **THEN** the player says a forgetful line, gets control back and does not start working

#### Scenario: Jammed chair left behind
- **WHEN** the player has given up a jammed chair
- **THEN** it stays where it jammed, unclaimed, and is not chosen by any chair trip until the cooldown has passed
