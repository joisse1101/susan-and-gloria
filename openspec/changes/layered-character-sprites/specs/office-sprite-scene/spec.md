## MODIFIED Requirements

### Requirement: Characters are static sprites with facing and movement cues
Characters SHALL be drawn as animated sprites. While walking or idle a character SHALL face one of four directions following its movement, and SHALL show a visible walking cue while moving that stops when it stops.

#### Scenario: Turning
- **WHEN** the player moves left and then right
- **THEN** the sprite faces left, then right

#### Scenario: Walking cue
- **WHEN** the player is moving
- **THEN** the sprite shows a walking cue
- **AND** the cue stops when the player stops
