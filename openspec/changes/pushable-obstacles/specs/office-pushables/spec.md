## Purpose

Defines which things in The Office can be pushed, who can push them, what stops a push, and when a coworker cannot be pushed, so chairs and coworkers behave consistently when shoved.

## ADDED Requirements

### Requirement: Chairs and free coworkers are pushable
Loose chairs, Susan and Gloria SHALL be pushable by a driver. The player SHALL push but never be pushed.

#### Scenario: Player pushes a chair
- **WHEN** the player walks into a loose chair
- **THEN** the chair moves away from the player

#### Scenario: Player pushes a free coworker
- **WHEN** the player walks into a coworker who is not in an interaction
- **THEN** the coworker is moved away from the player

#### Scenario: Player is not pushed
- **WHEN** a coworker or a chair moves into the player
- **THEN** the player is not moved

### Requirement: A push starts at a driver
A push SHALL start at a driver: a body moving under its own power, being the player walking or pulling a chair, or a coworker walking. The push SHALL travel along the chain of pushable bodies in front of the driver. A body with no driver behind it SHALL NOT push anything.

#### Scenario: Chain from the player
- **WHEN** the player walks into a chair that touches a second chair
- **THEN** both chairs move

#### Scenario: Chair pushed into a coworker by the player
- **WHEN** the player pushes a chair into a free coworker
- **THEN** the coworker is moved along with the chair

#### Scenario: Coasting chair
- **WHEN** a chair is coasting after it was rolled away or let go of, and it meets a coworker
- **THEN** it stops against the coworker and the coworker is not moved

#### Scenario: Pulled chair
- **WHEN** the player drags a chair with the pull key into a free coworker
- **THEN** the coworker is moved as for a pushed chair

### Requirement: Coworkers shove each other and chairs
A walking free coworker SHALL move chairs and one other free coworker it walks into. It SHALL NOT push a coworker through a chair.

#### Scenario: Coworker walks into a chair
- **WHEN** a free coworker walks into a loose chair
- **THEN** the chair moves out of the way

#### Scenario: Coworker walks into a coworker
- **WHEN** a free coworker walks into the other free coworker
- **THEN** the other coworker is moved

#### Scenario: No relay through a chair
- **WHEN** a free coworker pushes a chair into the other coworker
- **THEN** the other coworker is not moved and the chair stops

### Requirement: A pushed body never enters an obstacle
A pushed body SHALL NOT end up inside a wall, desk or other solid furniture. If any body in a driven chain is blocked by a solid, an immovable coworker or the player, the whole chain SHALL stop, including the driver.

#### Scenario: Chair against a wall
- **WHEN** the player pushes a chair that is against a wall
- **THEN** the chair does not move and the player is stopped

#### Scenario: Chain against a wall
- **WHEN** the player pushes a chair into a second chair that is against a wall
- **THEN** neither chair moves and the player is stopped

#### Scenario: Coworker against a wall
- **WHEN** the player pushes a free coworker who is against a desk
- **THEN** the coworker does not move and the player is stopped

#### Scenario: Corners
- **WHEN** a driven chain is pushed diagonally into a corner of furniture or wall
- **THEN** no body in the chain ends up overlapping the corner

### Requirement: Coworkers in an interaction are immovable
A coworker SHALL NOT be pushable while it is in an interaction: while a speech bubble is up (noticed, thinking, talking), and from arriving at a work zone through fetching a chair, sitting and working. A seated coworker's chair SHALL also be immovable. An immovable coworker SHALL block a push like a wall.

#### Scenario: Talking coworker
- **WHEN** the player walks into a coworker whose speech bubble is up
- **THEN** the coworker does not move and the player is stopped

#### Scenario: Working coworker
- **WHEN** the player walks into a coworker who is working at a desk, seated or standing
- **THEN** neither the coworker nor their chair moves

#### Scenario: Interaction ends
- **WHEN** the coworker's interaction ends
- **THEN** the coworker is pushable again

#### Scenario: Walking to a desk
- **WHEN** a coworker is walking to a desk and has not yet reached the work zone
- **THEN** the coworker is pushable

### Requirement: A shoved coworker stops and replans
A coworker that is moved by a push SHALL stop and plan a new route from where it ended up. Pushing it repeatedly SHALL NOT make it replan forever: after the same number of bumps that make it give up after being blocked, it SHALL give up the trip instead.

#### Scenario: Shoved while wandering
- **WHEN** a wandering coworker is moved by a push from the player, a chair or the other coworker
- **THEN** it stops and chooses a new route from its new position

#### Scenario: Shoved repeatedly
- **WHEN** a coworker is shoved again and again during one trip
- **THEN** it gives up the trip after the usual bump limit instead of replanning forever
