## Purpose

Defines how The Office scene is drawn from the pixel-art asset pack, using static sprites, so that art can be swapped without changing game behavior.

## Requirements

### Requirement: Scene renders from pixel-art assets
The Office scene SHALL draw the player, Susan, Gloria and office props from the bundled pixel-art asset pack rather than generated placeholder shapes.

#### Scenario: Characters use pack art
- **WHEN** the Office page loads
- **THEN** the player, Susan and Gloria are displayed with distinct pixel-art sprites

#### Scenario: Props use pack art
- **WHEN** the Office page loads
- **THEN** desks and other furniture are displayed with pixel-art sprites from the pack

### Requirement: Pixel art is rendered crisply
The scene SHALL render pixel art without smoothing or blurring at any displayed scale.

#### Scenario: Scaled display
- **WHEN** the game canvas is displayed larger than the native art resolution
- **THEN** sprite edges remain sharp

### Requirement: Assets load on the deployed site
The scene SHALL load its art both in local development and from the `/susan-and-gloria/` base path on GitHub Pages.

#### Scenario: Deployed load
- **WHEN** the Office page is opened on the deployed site
- **THEN** all sprites load without missing-asset errors

### Requirement: Characters are static sprites with facing and movement cues
Characters SHALL be drawn as single static frames. The player sprite SHALL face the direction of horizontal movement, and SHALL show a visible walking cue while moving that stops when the player stops.

#### Scenario: Turning
- **WHEN** the player moves left and then right
- **THEN** the sprite faces left, then right

#### Scenario: Walking cue
- **WHEN** the player is moving
- **THEN** the sprite shows a walking cue
- **AND** the cue stops when the player stops

### Requirement: Overlap follows vertical position
When sprites overlap, the one lower on the screen SHALL be drawn in front. This SHALL hold for solid objects on the map (walls and furniture) as well as for placed sprites.

#### Scenario: Walking past a desk
- **WHEN** the player walks below a desk and then above it
- **THEN** the player is drawn in front of the desk, then behind it

#### Scenario: Walking past map furniture
- **WHEN** the player walks below and then above a solid object on the map (a wall or a piece of furniture)
- **THEN** the player is drawn in front of it, then behind it

### Requirement: Existing scene behavior is preserved
Player movement, collision with desks and the coworkers, the typing lock, and the player speech bubble SHALL continue to behave as before the art change.

#### Scenario: Collision
- **WHEN** the player walks into a desk or a coworker
- **THEN** the player is stopped

#### Scenario: Typing lock
- **WHEN** the chat input has focus
- **THEN** movement keys do not move the player

### Requirement: Asset attribution is provided
The repository SHALL include the asset pack's author, source and licence terms alongside the assets.

#### Scenario: Credit file present
- **WHEN** a maintainer looks in the assets folder
- **THEN** a credits file names the author and the CC-BY 4.0 licence
