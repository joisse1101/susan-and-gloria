## Purpose

Lets characters walk into the top of solid objects on the map: the object draws in front of them, fades so they stay visible, and the top strip stops blocking. Every solid object works this way, with no authoring.

## Requirements

### Requirement: Solid objects are found from the combined colliders
An object SHALL be a vertical run of touching solid cells in one column. Cells are 8 px (the walk grid's size) and a cell is solid when any collider layer draws at least one non-transparent pixel in it, so transparent parts of a tile, and the gaps between art that does not touch, do not join objects. Touching cells from different layers SHALL belong to the same object. Tiles on non-collider layers SHALL NOT make a cell solid.

#### Scenario: Wall, desk, wall
- **WHEN** a wall, a desk and a wall touch in one column, the wall and the desk being on different layers
- **THEN** they are one object whose top is the top of the upper wall and whose base is the bottom of the lower wall

#### Scenario: Gap splits
- **WHEN** a column has an empty cell between two solid cells
- **THEN** they are two objects

### Requirement: The top strip of every object can be walked into
The top `WALK_BEHIND_STRIP_PX` (16 px) of an object SHALL NOT block movement, capped at `WALK_BEHIND_STRIP_FRACTION` (2/3) of the object's height and rounded down to whole 8 px cells. The rest of the object SHALL block exactly as before, and the walkable area used for coworker routing SHALL follow the same reduced collision. Both values SHALL be set in one tuning location, with comments.

#### Scenario: Lone wall
- **WHEN** the player walks down into a 32 px wall from the north
- **THEN** the player is not stopped in the top 16 px, and is stopped by the lower 16 px

#### Scenario: Wall, desk, wall
- **WHEN** the player walks down into a column of wall, desk and wall
- **THEN** only the top 16 px of the upper wall can be entered; the rest of the column blocks

#### Scenario: Objects joined to the top wall
- **WHEN** an object reaches the top edge of the map (the top wall, furniture or plants against it, the side walls)
- **THEN** it is not walk-behind: it blocks over its whole height, is drawn under every character, and does not fade

#### Scenario: Short object
- **WHEN** an object is 16 px tall
- **THEN** its top 8 px can be entered and its bottom 8 px still blocks

#### Scenario: From the front
- **WHEN** the player walks up to an object from the south
- **THEN** the player is stopped by the lower part, as before

#### Scenario: Coworkers route behind
- **WHEN** a coworker wanders or walks to a desk
- **THEN** it may route through the open top strip that the player can also stand in

### Requirement: Pieces are depth-sorted against characters
An object SHALL be drawn in front of a character whose feet are above the object's base line, and behind a character whose feet are below it, so characters pass in front of and behind it correctly. The base line is the bottom of the whole object, so a character in the open top strip is drawn behind all of it. Chairs SHALL sort the same way.

#### Scenario: Behind the object
- **WHEN** the player's feet are above the base line of a shelf and overlap its drawn area
- **THEN** the shelf is drawn over the player

#### Scenario: In front of the object
- **WHEN** the player's feet are below the base line of the shelf
- **THEN** the player is drawn over the shelf

### Requirement: Objects fade when a character is behind them
While a character is behind an object and overlaps its drawn pixels, only the part of the object the character overlaps (its tiles under the sprite, not the whole object) SHALL become partly transparent so the character stays visible. Layers drawn over the characters (the configured top layers, such as the room's bottom edge) SHALL do the same for the tiles a character is under. Each part SHALL return to fully opaque when no character is behind or under it, with a short fade rather than a snap.

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
- **WHEN** Susan or Gloria is behind an object
- **THEN** the object fades the same way as for the player

### Requirement: Fade strength is tunable in one place
The faded opacity and the fade time SHALL be set in one tuning location, with comments, and nothing else SHALL hardcode them.

#### Scenario: Changing the fade
- **WHEN** a maintainer changes the faded opacity value
- **THEN** every object fades to the new value without other edits

### Requirement: Over-the-player layers use current layer names
Layers drawn over characters SHALL be selected by names that exist in the current map, so a renamed or removed layer cannot silently stop working.

#### Scenario: Missing layer name
- **WHEN** a name configured as an over-the-player layer is not in the map
- **THEN** a console message names it

## Notes (non-normative)

### Other ways to define walk-behind objects
Objects come from the combined collider layers. Another source, rects drawn over the map with their own base line and strip depth, could later add exceptions or replace this. It would change only where the list of objects comes from, not the sorting, fading or collision rules above.
