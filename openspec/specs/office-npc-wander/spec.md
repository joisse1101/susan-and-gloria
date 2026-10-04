## Purpose

Defines how Susan and Gloria choose where to wander in The Office and how they get there around obstacles, so their movement looks intentional instead of bumping into furniture.

## Requirements

### Requirement: Coworkers wander to reachable spots
An idle coworker SHALL pick a destination at random from the floor spots it can actually reach from where it stands, and walk there, pausing between trips.

#### Scenario: Destination is reachable
- **WHEN** a coworker starts a wander trip
- **THEN** the chosen destination is a spot the coworker can walk to without crossing an obstacle

#### Scenario: Walled-off areas are never chosen
- **WHEN** part of the floor is enclosed so the coworker cannot get into it
- **THEN** no destination is chosen inside that part

### Requirement: Coworkers walk around obstacles
A wandering coworker SHALL follow a shortest collision-free route to its destination, and its body SHALL NOT overlap walls or solid furniture along the way.

#### Scenario: Obstacle between coworker and destination
- **WHEN** furniture lies on the straight line to the destination
- **THEN** the coworker walks around it and arrives at the destination

#### Scenario: Narrow gaps
- **WHEN** a gap is narrower than the coworker's body
- **THEN** the coworker does not try to pass through it

#### Scenario: Corners
- **WHEN** the route turns around a corner of furniture or wall
- **THEN** the coworker does not clip into the corner

### Requirement: Coworkers may move diagonally
A wandering coworker SHALL be able to move diagonally as well as up, down, left and right, at the same speed in every direction.

#### Scenario: Diagonal speed
- **WHEN** a coworker walks diagonally
- **THEN** it covers distance at the same speed as when it walks straight

#### Scenario: Facing while walking
- **WHEN** a coworker walks in any direction
- **THEN** its sprite faces the direction it is moving

### Requirement: Coworkers replan when bumped
When a wandering coworker is stopped by the player or by the other coworker, it SHALL choose a new destination and route from where it stands.

#### Scenario: Bumping the player
- **WHEN** the player stands in a coworker's way
- **THEN** the coworker picks a new route or destination instead of pushing against the player

### Requirement: Loose chairs do not block wandering
Loose chairs SHALL NOT be treated as obstacles when a coworker plans a route, and a coworker MAY push a chair aside while walking.

#### Scenario: Chair on the route
- **WHEN** a loose chair lies on a coworker's route
- **THEN** the coworker walks the route and moves the chair rather than detouring around it

### Requirement: Other coworker behaviour is unchanged
Walking to a work zone, fetching a chair, and standing still while a speech bubble is up SHALL continue to behave as before.

#### Scenario: Speech bubble
- **WHEN** a coworker has a speech bubble up
- **THEN** it stands still instead of wandering
