## Purpose

Lets characters walk behind tall furniture on the map: the furniture draws in front of them, fades so they stay visible, and blocks only a set depth at its base.

## ADDED Requirements

### Requirement: Layers opt in with a property
A tile layer SHALL be treated as walk-behind when its Tiled layer properties include `behind` with a number, the depth in px that blocks, measured up from the base of each piece. A layer without `behind` SHALL keep its current behaviour.

#### Scenario: Opted-in layer
- **WHEN** a layer has `behind` set to 12
- **THEN** its furniture is walk-behind and blocks the bottom 12 px of each piece

#### Scenario: Layer without the property
- **WHEN** a layer has no `behind` property
- **THEN** it is drawn and blocks exactly as before

#### Scenario: Invalid value
- **WHEN** `behind` is not a non-negative number
- **THEN** the layer is treated as not opted in and a console message names the layer

### Requirement: Opted-in colliders block only their base
On an opted-in collider layer, a tile's collision SHALL cover only the opaque pixels within `behind` px of the base of its piece. Pixels higher than that SHALL NOT block movement, so a character can stand there, behind the object. The walkable area used for coworker routing SHALL follow the same reduced collision.

#### Scenario: Walking into the base
- **WHEN** the player walks into the bottom `behind` px of a shelf
- **THEN** the player is stopped

#### Scenario: Walking into the upper part
- **WHEN** the player walks up to the part of the shelf higher than `behind` px from its base
- **THEN** the player is not stopped and ends up standing behind the shelf

#### Scenario: Coworkers route behind
- **WHEN** a coworker wanders or walks to a desk
- **THEN** it may route through the area behind an object that the player can also stand in

### Requirement: Pieces are depth-sorted against characters
A walk-behind piece SHALL be drawn in front of a character whose feet are above the piece's base line, and behind a character whose feet are below it, so characters pass in front of and behind it correctly. Chairs SHALL sort the same way.

#### Scenario: Behind the object
- **WHEN** the player's feet are above the base line of a shelf and overlap its drawn area
- **THEN** the shelf is drawn over the player

#### Scenario: In front of the object
- **WHEN** the player's feet are below the base line of the shelf
- **THEN** the player is drawn over the shelf

### Requirement: Objects fade when a character is behind them
While a character is behind a walk-behind piece and overlaps its drawn pixels, the piece SHALL become partly transparent so the character stays visible. The piece SHALL return to fully opaque when no character is behind it, with a short fade rather than a snap.

#### Scenario: Fade on entering
- **WHEN** the player walks behind a shelf and overlaps it
- **THEN** the shelf fades to partly transparent

#### Scenario: Fade back on leaving
- **WHEN** the player steps out from behind the shelf
- **THEN** the shelf fades back to fully opaque

#### Scenario: Not behind, not faded
- **WHEN** a character is in front of a shelf, or beside it without overlapping its drawn area
- **THEN** the shelf stays fully opaque

#### Scenario: Coworker behind
- **WHEN** Susan or Gloria is behind a piece
- **THEN** the piece fades the same way as for the player

### Requirement: Fade strength is tunable in one place
The faded opacity and the fade time SHALL be set in one tuning location, with comments, and nothing else SHALL hardcode them.

#### Scenario: Changing the fade
- **WHEN** a maintainer changes the faded opacity value
- **THEN** every walk-behind piece fades to the new value without other edits

### Requirement: Over-the-player layers use current layer names
Layers drawn over characters SHALL be selected by names that exist in the current map, so a renamed or removed layer cannot silently stop working.

#### Scenario: Missing layer name
- **WHEN** a name configured as an over-the-player layer is not in the map
- **THEN** a console message names it

### Note: other ways to define walk-behind objects (non-normative)
The layer property above is the chosen way to mark objects. Two others have been considered and may replace or sit beside it later. They would change only where the list of objects comes from, not the sorting, fading or collision rules above:

- **Rects over the map**: each walk-behind object is a rectangle with its own base line and depth, like the work-area rectangles. Most flexible, but must be redrawn when furniture moves.
- **Auto-grouped tiles**: connected tiles on collider layers form one object each, with one global depth. Least authoring, but wrong where two pieces touch, such as a desk against a wall.
