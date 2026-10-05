## Purpose

Defines how Susan and Gloria choose a work desk, share desks without clashing with each other or the player, route to them, and fetch and sit in a chair before working.

## Requirements

### Requirement: A desk is used by one person at a time
Each work desk SHALL be either free or held by exactly one of Susan, Gloria or the player. A coworker SHALL only choose, or start working at, a desk that is free or already held by that coworker.

#### Scenario: Two coworkers choose at once
- **WHEN** both coworkers decide to visit a desk in the same moment and only one desk is free
- **THEN** exactly one of them holds it and the other does not choose it

#### Scenario: Desk is released
- **WHEN** a coworker finishes working, is interrupted, or gives up on a desk
- **THEN** the desk becomes free for anyone to choose

#### Scenario: A coworker holds one desk
- **WHEN** a coworker already holds a desk
- **THEN** it does not take a second one

### Requirement: Coworkers only visit free desks
A coworker making a deliberate visit SHALL choose at random among free desks. When every desk is held, it SHALL skip the visit and try again later.

#### Scenario: Some desks are held
- **WHEN** a coworker starts a visit and some desks are held
- **THEN** the chosen desk is one that nobody holds

#### Scenario: Every desk is held
- **WHEN** a coworker starts a visit and every desk is held
- **THEN** it does not visit and schedules its next visit for later

### Requirement: Wandering past a held desk does not start work
A coworker that wanders into the work zone of a desk held by someone else SHALL NOT start working and SHALL keep wandering.

#### Scenario: Passing a held desk
- **WHEN** a coworker walks into the zone of a desk someone else is using
- **THEN** it does not stop to work and continues its wander

#### Scenario: Passing a free desk
- **WHEN** a coworker walks into the zone of a free desk
- **THEN** it takes the desk and works there

### Requirement: The player occupies a desk while working
While the player is working at a desk, the desk SHALL be occupied: coworkers do not choose it, and a coworker that had claimed it but is not yet working there finds it occupied. The player SHALL never be prevented from working at a desk, and a coworker already working at a desk keeps it.

#### Scenario: Player works at a desk
- **WHEN** the player is working at a desk
- **THEN** coworkers do not choose it

#### Scenario: Player takes a claimed desk first
- **WHEN** a coworker has claimed a desk but is not working at it yet, and the player works there
- **THEN** the player is not interrupted and the desk is occupied for that coworker

#### Scenario: Coworker already working
- **WHEN** a coworker is already working at a desk and the player stands in its zone
- **THEN** the coworker keeps working and the desk stays the coworker's

### Requirement: A coworker turned away from a desk says so
When a coworker reaches a desk it claimed and cannot use it, it SHALL say a randomly chosen line from a list of "desk taken" phrases, release the desk and schedule a later visit. The list SHALL be editable without changing behavior code.

#### Scenario: Player is in the way
- **WHEN** a coworker arrives at its claimed desk and the player is standing there
- **THEN** it says one of the desk-taken phrases, gives the desk up and walks off

#### Scenario: Different lines over time
- **WHEN** a coworker is turned away several times
- **THEN** the line it says is chosen at random from the list

### Requirement: A coworker gives up an occupied desk when it gets near
A desk is occupied when someone else holds it, or when the player is standing still at it, whether or not the player has started working. A player just walking through does not occupy it. A coworker heading for a desk, or fetching a chair for it, that finds the desk occupied SHALL give it up and say a "desk taken" phrase once it is within one tile of the work position, or as soon as it has to reroute because something blocked it or shoved it. If the desk is not occupied, being blocked or shoved SHALL only make it reroute to the same desk and keep its claim. Giving up SHALL let go of any chair it was fetching.

#### Scenario: Desk taken while fetching the chair
- **WHEN** a coworker is fetching a chair for a desk and the player starts working at that desk
- **THEN** the coworker carries on until it is within one tile of the work position, then lets go of the chair, says a desk-taken phrase and walks off

#### Scenario: Player standing at the desk, not working
- **WHEN** the player stands at the work position without having started to work, and a coworker coming back with the chair gets within one tile or is blocked by them
- **THEN** the coworker lets go of the chair, says a desk-taken phrase and gives up the desk

#### Scenario: Blocked and the desk is free
- **WHEN** something blocks a coworker on its way and the desk is not occupied
- **THEN** it plans a new route and carries on

#### Scenario: Blocked and the desk is occupied
- **WHEN** something blocks a coworker, so it has to reroute, and the desk is occupied
- **THEN** it gives the desk up, lets go of any chair and says a desk-taken phrase

#### Scenario: Shoved on the way to a free desk
- **WHEN** a coworker walking to a desk is shoved and the desk is not occupied
- **THEN** it stops, plans a new route to the same desk from where it ended up, and keeps its claim

#### Scenario: Shoved on the way to an occupied desk
- **WHEN** a coworker walking to a desk is shoved and the desk is occupied
- **THEN** it gives the desk up and says a desk-taken phrase

### Requirement: Coworkers route to the work zone
A coworker heading for a desk SHALL follow a collision-free route around walls and furniture, and SHALL give up and reschedule if it cannot get there in time.

#### Scenario: Furniture in the way
- **WHEN** furniture lies on the straight line to the desk
- **THEN** the coworker walks around it and reaches the work zone

#### Scenario: Desk cannot be reached
- **WHEN** no route to the desk exists, or the trip takes too long
- **THEN** the coworker releases the desk and schedules a later visit

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

### Requirement: Coworkers are not pushable at their desk
From arriving at its work zone until it stops working, a coworker SHALL NOT be moved by a push, so fetching a chair, sitting and working happen at exact positions. Before that, while walking to the desk, it MAY be pushed as specified by `office-pushables`.

#### Scenario: Arriving at the zone
- **WHEN** a coworker reaches its work zone
- **THEN** it can no longer be pushed until it stops working or gives up

#### Scenario: Working done
- **WHEN** a coworker stops working or gives up the desk
- **THEN** it can be pushed again

### Requirement: A jammed chair is given up
While a walker (coworker or player) is dragging a chair, the chair SHALL count as jammed when it stays further behind the walker than the towing distance allows, by more than a set margin, for longer than a set time. A walker whose chair jams SHALL let go of it, say a randomly chosen line from a list of "make do" phrases, and walk to the work position and work standing, unless the desk is occupied. The line SHALL be shown once per give-up. The jammed chair SHALL be left where it is, unclaimed, and SHALL NOT be taken again by anyone's chair trip until a cooldown has passed. The margin, the time and the cooldown SHALL be adjustable, and the phrase list SHALL be editable without changing behavior code.

#### Scenario: Chair wedges on the way
- **WHEN** a coworker is dragging a chair and the chair stops against something while the coworker keeps walking, until it is more than the margin behind for longer than the set time
- **THEN** the coworker lets go of the chair, says a "make do" line, walks to the work position and works standing

#### Scenario: Chair wedges on the last step
- **WHEN** the chair jams while the coworker is already on the work position
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

#### Scenario: Never works off the work position
- **WHEN** a coworker walks back to the work position after a jam or a stolen chair
- **THEN** it routes to the work position and starts working only once it is on it; if it cannot get onto it, it says a forgetful line, releases the desk and wanders instead

#### Scenario: Cannot walk back after a jam
- **WHEN** a walker has given up a jammed chair and there is no route back to the work position
- **THEN** the forgetful give-up applies instead of the "make do" line

### Requirement: A coworker that loses its chair trip forgets and wanders
When a coworker's chair trip ends in a way that stops it getting back to the work position (it is blocked again and again, the trip takes too long, or there is no route back), it SHALL let go of the chair, say a randomly chosen line from the list of forgetful phrases, release the desk and go back to wandering. It SHALL NOT start working, standing or otherwise. The next visit SHALL be scheduled as after a turned-away visit.

#### Scenario: Blocked repeatedly
- **WHEN** something the route did not allow for keeps blocking the coworker on its trip
- **THEN** it lets go of the chair, says a forgetful line, releases the desk and wanders

#### Scenario: Trip takes too long
- **WHEN** the chair trip has not finished within the time limit
- **THEN** it lets go of the chair, says a forgetful line, releases the desk and wanders

#### Scenario: No work after forgetting
- **WHEN** a coworker has just said a forgetful line
- **THEN** no work period starts and the desk is free for anyone else

### Requirement: A coworker whose chair is taken complains and makes do
When the player takes hold of a chair a coworker has claimed (walking to it or dragging it), the coworker SHALL let go of it, say a randomly chosen line from a list of "stolen" phrases (such as "oh, all yours!") followed by a randomly chosen "make do" line, joined in a single speech bubble, walk to the work position and work standing. The two lines SHALL be one bubble, shown once per give-up. If the desk is occupied, the desk-taken behavior applies instead. If there is no route back to the work position, the forgetful give-up applies instead. The chair SHALL stay with the player and SHALL NOT be on a jam cooldown.

#### Scenario: Player takes the claimed chair
- **WHEN** a coworker is walking to or dragging a chair and the player takes hold of that chair
- **THEN** the coworker says a stolen line followed by a make-do line in one bubble, walks to the work position and works standing

#### Scenario: Taken on the last step
- **WHEN** the player takes the chair while the coworker is already on the work position
- **THEN** it says the combined line and works standing without walking anywhere

#### Scenario: Desk occupied when the chair is taken
- **WHEN** the player takes the chair and the desk is occupied by someone else
- **THEN** the desk-taken behavior applies instead, with its own line

#### Scenario: No way back
- **WHEN** the chair is taken and there is no route back to the work position
- **THEN** the coworker says a forgetful line, releases the desk and wanders

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

### Requirement: A desk is a run of touching work tiles at most 32 px across
Map tiles with the property `interaction` set to `work` that touch (sharing an edge) SHALL form one desk, except that a desk SHALL be at most 32 px wide and 32 px tall. A touching run larger than that SHALL be cut into separate desks, starting from the run's top-left corner. A desk SHALL be held by at most one of Susan, Gloria or the player at a time, however many tiles it spans, so the number of people who can use a place does not depend on the map's tile size. The tile property `direction` SHALL NOT affect which tiles form a desk.

#### Scenario: A desk drawn with four small tiles
- **WHEN** four 16 px work tiles form a 2x2 block
- **THEN** they are one desk, and only one person can hold it at a time

#### Scenario: One large tile
- **WHEN** a single 32 px work tile is on the map
- **THEN** it is one desk

#### Scenario: A run longer than 32 px
- **WHEN** a touching run of work tiles is 64 px long
- **THEN** it is two desks of 32 px, cut from the run's start, and two people can work there at once

#### Scenario: A run that is not a multiple of 32 px
- **WHEN** a touching run of work tiles is 48 px long
- **THEN** it is one desk of 32 px and one of 16 px

#### Scenario: Same tile on two layers
- **WHEN** two work tiles on different layers occupy the same cell
- **THEN** they count as one tile of the desk

#### Scenario: Same layout on a finer grid
- **WHEN** the same desks are drawn with 16 px tiles instead of 32 px tiles
- **THEN** the same number of desks result, each held by one person at a time

### Requirement: The work zone has a fixed pixel depth along the whole desk edge
A desk's work zone on each open side SHALL span the full length of the desk's edge on that side and reach out a fixed distance in pixels, 24 px. The distance SHALL be adjustable without changing behaviour code and SHALL NOT depend on the map's tile size.

#### Scenario: Zone along a desk
- **WHEN** a desk is 32 px long on its left side
- **THEN** a coworker standing anywhere along that 32 px edge, within 24 px of it, is in the desk's zone

#### Scenario: Map on a finer grid
- **WHEN** the same desk is drawn with 16 px tiles instead of 32 px tiles
- **THEN** its zone has the same size in pixels
