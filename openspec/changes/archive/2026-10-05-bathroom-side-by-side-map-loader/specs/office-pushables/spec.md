## MODIFIED Requirements

### Requirement: A pushed body never enters an obstacle
A pushed body SHALL NOT end up inside a wall, desk or other solid furniture. If any body in a driven chain is blocked by a solid, an immovable coworker or the player, the whole chain SHALL stop, including the driver. Chairs and coworkers SHALL also be stopped at the edge of the area only the player may enter (the bathroom), the same way; the player SHALL NOT be stopped there.

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

#### Scenario: Chair at the player-only area
- **WHEN** the player pushes a chair toward the bathroom doorway
- **THEN** the chair stops at the office's edge and the player is stopped

#### Scenario: Player crosses alone
- **WHEN** the player walks through the doorway with nothing in front
- **THEN** the player is not stopped at the office's edge
