## Purpose

Defines which things in The Office can be pushed, who can push them, what stops a push, and when a coworker cannot be pushed, so chairs and coworkers behave consistently when shoved.

## Requirements

### Requirement: Chairs and free coworkers are pushable
Loose chairs, Susan and Gloria SHALL be pushable by a driver, and pullable by the player with the pull key. The player SHALL push and pull but never be pushed or pulled.

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
A push SHALL start at a driver: a body moving under its own power, being the player walking or pulling a chair or coworker, or a coworker walking. The push SHALL travel along the chain of pushable bodies in front of the driver. A body with no driver behind it SHALL NOT push anything.

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

### Requirement: A pulled body trails the player and lets go when blocked
The player SHALL hold one pullable body at a time: with the pull key down, the nearest loose chair or free coworker within reach is grabbed, and it SHALL follow the player and SHALL NOT enter an obstacle. Because it trails behind the player, a blocked pulled body SHALL be let go of instead of stopping the player; it is also let go of when it lags too far behind, when the pull key is released, or when a coworker becomes immovable. An immovable coworker SHALL NOT be grabbed. Anything the pulled body pushes in front of it follows the chain rules above.

#### Scenario: Pulled chair snags
- **WHEN** the player pulls a chair and it catches on a desk or wall
- **THEN** the chair stays out of the obstacle, the player keeps walking and the chair is let go of

#### Scenario: Pulling a chair out of a corner
- **WHEN** the player pulls a chair that is wedged in a corner away from the corner
- **THEN** the chair follows the player out

#### Scenario: Pulling a free coworker
- **WHEN** the player holds the pull key next to a free coworker and walks away
- **THEN** the coworker follows the player and does not enter a wall, desk or other solid

#### Scenario: Pulled coworker snags
- **WHEN** a pulled coworker catches on a desk or wall
- **THEN** the coworker stays out of the obstacle, the player keeps walking and the coworker is let go of

#### Scenario: Pulled coworker enters an interaction
- **WHEN** a pulled coworker's speech bubble comes up
- **THEN** the coworker is let go of

#### Scenario: Grabbing an immovable coworker
- **WHEN** the player holds the pull key next to a coworker who is working or has a speech bubble up
- **THEN** the coworker is not grabbed and the player grabs a chair in reach instead, if any

#### Scenario: Nearest body wins
- **WHEN** a chair and a free coworker are both within reach
- **THEN** the nearer one is grabbed

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

### Requirement: Push feel is tunable
The values that set how pushing feels (mass of chairs and coworkers, drag, roll time, pull and push speed) SHALL live in one place, and every pushable body SHALL read them from there. Changing a value SHALL take effect without any other code change.

#### Scenario: Heavier chairs
- **WHEN** the chair mass is raised in the tuning values
- **THEN** chairs are harder to move and give way later than coworkers, with no other change

#### Scenario: More drag
- **WHEN** the chair drag is raised
- **THEN** a rolled chair coasts a shorter distance

### Requirement: A shoved coworker stops and replans
A coworker that is moved by a push, or pulled and then let go of, SHALL stop and plan a new route from where it ended up. A pull counts as one shove however long it lasts, and its walking steering SHALL be suspended while it is held. Pushing or pulling it repeatedly SHALL NOT make it replan forever: after the same number of bumps that make it give up after being blocked, it SHALL give up the trip instead.

#### Scenario: Shoved while wandering
- **WHEN** a wandering coworker is moved by a push from the player, a chair or the other coworker
- **THEN** it stops and chooses a new route from its new position

#### Scenario: Pulled while wandering
- **WHEN** the player pulls a wandering coworker and then lets go
- **THEN** it chooses a new route from where it was let go, and the whole pull counts as one bump

#### Scenario: Shoved repeatedly
- **WHEN** a coworker is shoved again and again during one trip
- **THEN** it gives up the trip after the usual bump limit instead of replanning forever
