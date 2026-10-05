## MODIFIED Requirements

### Requirement: Coming near the plant starts watering
Watering SHALL be offered to an actor when its feet are within 16 px of the plant's edge on any side, under the start rule in `office-interaction-trigger`. The reach SHALL be a distance in pixels, independent of the map's tile size, and adjustable without changing behaviour code.

#### Scenario: Coworker wanders near
- **WHEN** a coworker's feet come within 16 px of the plant while wandering, and it is not interrupted, off cooldown and the plant is free
- **THEN** it starts to go to the plant

#### Scenario: Further than 0.5 tile
- **WHEN** an actor passes the plant at more than 16 px from its edge
- **THEN** nothing starts

#### Scenario: Player stops near
- **WHEN** the player stands still within 16 px of the plant, off cooldown, with no interruption
- **THEN** the character starts to go to the plant

#### Scenario: Map on a finer grid
- **WHEN** the map is drawn with 16 px tiles instead of 32 px tiles
- **THEN** the reach is still 16 px
