## MODIFIED Requirements

### Requirement: Coworkers drag a chair to the desk
A chair is within reach of a work position when it is a loose chair no one else has claimed, it lies within 5 tiles of the work position in a straight line, and the walking route from the work position to it is no longer than 15 tiles. When a chair is within reach and can be dragged, a coworker SHALL walk to it by a routed path, take hold of it, drag it by a routed path to a spot half a tile behind the work position, then walk to the work position and sit in it. The drag route and the parking spot SHALL leave room for the chair itself, not just for the coworker: every cell on them SHALL have clear space around it for a chair-sized body, so the chair does not scrape desks, walls or corners. The walk to the chair, and every walk without a chair, only needs room for the coworker. A chair that is within reach but has no such drag route to the parking spot SHALL NOT be taken. When no chair can be fetched, the coworker SHALL work standing.

#### Scenario: Chair in reach
- **WHEN** a coworker is about to work and a free chair is within reach and can be dragged
- **THEN** it walks to the chair, drags it to half a tile behind the work position, steps to the work position and sits

#### Scenario: Chair close but the route is long
- **WHEN** the nearest free chair is within 5 tiles in a straight line but the walking route to it is longer than 15 tiles
- **THEN** that chair is not in reach and the coworker works standing, or uses another chair that is in reach

#### Scenario: Chair with no route
- **WHEN** a free chair is within 5 tiles in a straight line but walls or furniture leave no walking route to it
- **THEN** that chair is not in reach

#### Scenario: Chair already claimed
- **WHEN** another coworker is already fetching the nearest chair
- **THEN** this coworker chooses a different chair or works standing

#### Scenario: No chair in reach
- **WHEN** no free chair is within reach
- **THEN** the coworker works standing at the work position

#### Scenario: Drag route too narrow for the chair
- **WHEN** a free chair is within reach but every route from it to the parking spot passes a gap too narrow for a chair, though wide enough for the coworker
- **THEN** that chair is not taken, and the coworker chooses another chair or works standing

#### Scenario: Drag keeps clear of corners
- **WHEN** the coworker drags a chair past a desk corner
- **THEN** the route keeps far enough from the corner that the chair, which swings inside the turn, does not touch it

#### Scenario: Fetch is interrupted or fails
- **WHEN** the coworker is interrupted, or cannot complete the fetch in time
- **THEN** it lets go of the chair and no chair stays claimed

### Requirement: Chair reach can be inspected in a debug view
A debug view SHALL be available that shows, for each work position, the straight-line chair range, and which chairs are in reach and which are filtered out and why (claimed, recently jammed, too far, no route, route too long, no drag route). It SHALL be off by default and SHALL NOT change coworker behavior.

#### Scenario: Debug view on
- **WHEN** the debug view is switched on
- **THEN** chairs in reach are marked differently from chairs filtered out, and each filtered chair shows its reason

#### Scenario: Chair that cannot be dragged
- **WHEN** the debug view is on and a chair is within reach but has no route a chair can be dragged along
- **THEN** it is marked as filtered out with the reason "no drag route"

#### Scenario: Debug view off
- **WHEN** the debug view is off
- **THEN** nothing extra is drawn and coworkers behave identically

## ADDED Requirements

### Requirement: A jammed chair is given up
While a walker (coworker or player) is dragging a chair, the chair SHALL count as jammed when it stays further behind the walker than the towing distance allows, by more than a set margin, for longer than a set time. A walker whose chair jams SHALL let go of it, say a randomly chosen line from a list of "make do" phrases, and walk to the work position and work standing, unless the desk is occupied. The line SHALL be shown once per give-up. The jammed chair SHALL be left where it is, unclaimed, and SHALL NOT be taken again by anyone's chair trip until a cooldown has passed. The margin, the time and the cooldown SHALL be adjustable, and the phrase list SHALL be editable without changing behavior code.

#### Scenario: Chair wedges on the way
- **WHEN** a coworker is dragging a chair and the chair stops against something while the coworker keeps walking, until it is more than the margin behind for longer than the set time
- **THEN** the coworker lets go of the chair, says a "make do" line, walks to the work position and works standing

#### Scenario: Chair wedges on the last step
- **WHEN** the chair jams while the coworker is already on or beside the work position
- **THEN** the coworker lets go of it, says a "make do" line and works standing without walking anywhere

#### Scenario: A passing hold-up is not a jam
- **WHEN** the chair is held up by the player or another body for less than the set time and then moves on
- **THEN** the trip carries on as before and no line is said

#### Scenario: Desk occupied when the chair jams
- **WHEN** the chair jams and the desk is occupied by someone else
- **THEN** the desk-taken behavior applies instead, with its own line

#### Scenario: Jammed chair is not fetched again at once
- **WHEN** a chair has just been given up as jammed and a walker looks for a chair
- **THEN** that chair is not chosen until the cooldown has passed

#### Scenario: Moved jammed chair keeps its cooldown
- **WHEN** a chair has just been given up as jammed and someone then pushes or drags it elsewhere
- **THEN** it stays unavailable to chair trips until the cooldown that began at the jam has passed

#### Scenario: Cannot walk back after a jam
- **WHEN** a walker has given up a jammed chair and there is no route back to the work position
- **THEN** the forgetful give-up applies instead of the "make do" line

### Requirement: A coworker that loses its chair trip forgets and wanders
When a coworker's chair trip ends in a way that stops it getting back to the work position (the chair is taken by the player, it is blocked again and again, the trip takes too long, or there is no route back), it SHALL let go of the chair, say a randomly chosen line from the list of forgetful phrases, release the desk and go back to wandering. It SHALL NOT start working, standing or otherwise. The next visit SHALL be scheduled as after a turned-away visit.

#### Scenario: Player takes the claimed chair
- **WHEN** a coworker is walking to or dragging a chair and the player takes hold of that chair
- **THEN** the coworker says a forgetful line, releases the desk and wanders

#### Scenario: Blocked repeatedly
- **WHEN** something the route did not allow for keeps blocking the coworker on its trip
- **THEN** it lets go of the chair, says a forgetful line, releases the desk and wanders

#### Scenario: Trip takes too long
- **WHEN** the chair trip has not finished within the time limit
- **THEN** it lets go of the chair, says a forgetful line, releases the desk and wanders

#### Scenario: No work after forgetting
- **WHEN** a coworker has just said a forgetful line
- **THEN** no work period starts and the desk is free for anyone else

### Requirement: Chair trip limits are adjustable in one place
The footprint a chair needs on the drag route, the jam margin and time, and the cooldown before a jammed chair can be taken again SHALL be set in a single tuning file, each with a comment saying what it changes. They SHALL be changeable without editing behavior code.

#### Scenario: Jam time raised
- **WHEN** the jam time is raised in the tuning values
- **THEN** a wedged chair is tolerated for longer before the walker gives it up

#### Scenario: Cooldown lowered
- **WHEN** the cooldown for a jammed chair is lowered or set to zero
- **THEN** that chair can be chosen again sooner, or at once

### Requirement: The chair clearance grid can be shown in a debug view
A debug view, toggled by its own key, SHALL show which cells are walkable for a coworker alone, which are also clear enough for a dragged chair, and which are blocked. It SHALL be off by default, SHALL NOT change any behavior, and SHALL be ignored while the player is typing in chat.

#### Scenario: View on
- **WHEN** the clearance view is switched on
- **THEN** cells a chair can be dragged through, cells only a coworker can pass, and blocked cells are drawn in different colours

#### Scenario: Typing in chat
- **WHEN** the player presses the view's key while typing in chat
- **THEN** the view does not toggle

#### Scenario: View off
- **WHEN** the view is off
- **THEN** nothing extra is drawn
