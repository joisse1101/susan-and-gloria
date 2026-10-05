## MODIFIED Requirements

### Requirement: Overlap follows vertical position
When sprites overlap, the one lower on the screen SHALL be drawn in front. This SHALL hold for furniture from the map's walk-behind layers as well as for placed sprites.

#### Scenario: Walking past a desk
- **WHEN** the player walks below a desk and then above it
- **THEN** the player is drawn in front of the desk, then behind it

#### Scenario: Walking past map furniture
- **WHEN** the player walks below and then above a piece of furniture on a walk-behind map layer
- **THEN** the player is drawn in front of it, then behind it
