## Purpose

Defines how the player gets a chair when they start working at a desk: an automatic routed trip like the coworkers' trip, which the player can cancel at any time.

## Requirements

### Requirement: The player fetches a chair automatically
When the player starts working at a work zone and a loose chair is within reach, the player's character SHALL walk to the chair by a routed path, take hold of it, drag it by a routed path to a spot half a tile behind the work position, then step onto the work position and sit in it. A chair is within reach under the same rule as for coworkers: loose, not claimed by anyone else, within 5 tiles in a straight line, and a walking route of at most 15 tiles. When no chair is within reach, the player SHALL work standing at their position.

#### Scenario: Chair in reach
- **WHEN** the player stands still in a work zone and a free chair is within reach
- **THEN** the character walks around any furniture to the chair, drags it to half a tile behind the work position, steps onto the work position and sits

#### Scenario: No chair in reach
- **WHEN** the player starts working and no free chair is within reach
- **THEN** the player works standing and no walking takes place

#### Scenario: Chair already claimed
- **WHEN** a coworker is already fetching the nearest chair
- **THEN** the player chooses another chair in reach or works standing

### Requirement: The player can cancel the chair trip at any time
While the automatic chair trip is under way the player SHALL be able to cancel it by pressing a movement key, by starting to type, or by opening chat. Cancelling SHALL return control immediately, SHALL leave the chair where it is, and SHALL leave no chair claimed.

#### Scenario: Movement key during the trip
- **WHEN** the player presses a movement key while the character is walking to or dragging the chair
- **THEN** the trip stops, the player moves as they directed, and the chair stays where it was left

#### Scenario: Typing during the trip
- **WHEN** the player starts typing in chat during the trip
- **THEN** the trip stops and the chair stays where it was left

#### Scenario: Cancelled chair can be fetched again
- **WHEN** the player cancels a trip and later stands still in a work zone again
- **THEN** a new trip may begin with any free chair in reach, including the one left behind

### Requirement: Work begins once the player is seated
The player's work period and its thinking bubbles SHALL start when the player is seated, or right away when no chair is being fetched. The trip itself SHALL NOT count towards the work period.

#### Scenario: Work after sitting
- **WHEN** the player finishes dragging the chair and sits
- **THEN** the work period starts at that moment

#### Scenario: Standing work
- **WHEN** no chair is in reach
- **THEN** the work period starts immediately

### Requirement: The player keeps the desk during the trip
From the moment the player starts working until they stop or cancel, the desk SHALL be held by the player so coworkers do not choose it, while the player is never prevented from working at a desk a coworker had claimed first.

#### Scenario: Coworker looks for a desk during the trip
- **WHEN** the player is walking to a chair for a desk and a coworker picks a desk to visit
- **THEN** the coworker does not pick that desk

#### Scenario: Leaving the zone on the trip
- **WHEN** the chair trip takes the player out of the desk's work zone
- **THEN** the work session continues and the desk stays held

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

### Requirement: Existing chair handling is unchanged
Hand-dragging a chair with the pull key SHALL continue to work as before, and a seated player SHALL look the same as before.

#### Scenario: Shift-drag
- **WHEN** the player holds the pull key beside a chair and moves
- **THEN** the chair is dragged along with them as before

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
