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
A desk is occupied when someone else holds it, or when the player is standing still at it, whether or not the player has started working. A player just walking through does not occupy it. A coworker heading for a desk, or fetching a chair for it, that finds the desk occupied SHALL give it up and say a "desk taken" phrase once it is within one tile of the work position, or as soon as it has to reroute because something blocked it. If the desk is not occupied, being blocked SHALL only make it reroute. Giving up SHALL let go of any chair it was fetching.

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

### Requirement: Coworkers route to the work zone
A coworker heading for a desk SHALL follow a collision-free route around walls and furniture, and SHALL give up and reschedule if it cannot get there in time.

#### Scenario: Furniture in the way
- **WHEN** furniture lies on the straight line to the desk
- **THEN** the coworker walks around it and reaches the work zone

#### Scenario: Desk cannot be reached
- **WHEN** no route to the desk exists, or the trip takes too long
- **THEN** the coworker releases the desk and schedules a later visit

### Requirement: Coworkers drag a chair to the desk
A chair is within reach of a work position when it is a loose chair no one else has claimed, it lies within 5 tiles of the work position in a straight line, and the walking route from the work position to it is no longer than 15 tiles. When a chair is within reach, a coworker SHALL walk to it by a routed path, take hold of it, drag it by a routed path to a spot half a tile behind the work position, then walk to the work position and sit in it. When no chair is within reach, it SHALL work standing.

#### Scenario: Chair in reach
- **WHEN** a coworker is about to work and a free chair is within reach
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

#### Scenario: Fetch is interrupted or fails
- **WHEN** the coworker is interrupted, or cannot complete the fetch in time
- **THEN** it lets go of the chair and no chair stays claimed

### Requirement: Chair reach can be inspected in a debug view
A debug view SHALL be available that shows, for each work position, the straight-line chair range, and which chairs are in reach and which are filtered out and why (claimed, too far, no route, route too long). It SHALL be off by default and SHALL NOT change coworker behavior.

#### Scenario: Debug view on
- **WHEN** the debug view is switched on
- **THEN** chairs in reach are marked differently from chairs filtered out, and each filtered chair shows its reason

#### Scenario: Debug view off
- **WHEN** the debug view is off
- **THEN** nothing extra is drawn and coworkers behave identically
