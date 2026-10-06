## MODIFIED Requirements

### Requirement: Coworkers replan when bumped
When a wandering coworker is stopped by the player or by the other coworker, or is shoved by anyone, it SHALL choose a new destination and route from where it stands. How a body is shoved is specified by the `office-pushables` capability.

#### Scenario: Bumping the player
- **WHEN** the player stands in a coworker's way
- **THEN** the coworker picks a new route or destination instead of pushing against the player

#### Scenario: Shoved off the route
- **WHEN** a wandering coworker is shoved by the player, a chair or the other coworker
- **THEN** it stops and picks a new route or destination from its new position
