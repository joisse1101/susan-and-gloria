## MODIFIED Requirements

### Requirement: Characters are static sprites with facing and movement cues
Characters SHALL be drawn as animated sprites. While walking or idle a character SHALL face one of eight directions following its movement, and SHALL show a visible walking cue while moving that stops when it stops. The facing SHALL NOT flicker when the movement direction sits near the boundary between two facings.

#### Scenario: Turning
- **WHEN** the player moves left and then right
- **THEN** the sprite faces left, then right

#### Scenario: Diagonal facing
- **WHEN** the player moves up and to the right
- **THEN** the sprite faces up-right

#### Scenario: Boundary movement
- **WHEN** a character moves along a direction close to the boundary between two facings
- **THEN** it keeps its current facing until the direction clearly belongs to the other

#### Scenario: Walking cue
- **WHEN** the player is moving
- **THEN** the sprite shows a walking cue
- **AND** the cue stops when the player stops
