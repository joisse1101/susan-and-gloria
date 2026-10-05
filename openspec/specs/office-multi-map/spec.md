## Purpose

Lets the game world be made of several maps standing side by side, starting with a bathroom left of the office, so rooms can be added without reshaping the office map. Defines how maps are placed, who may enter them, and that the debug overlays cover all of them.

## Requirements

### Requirement: Maps are placed side by side by their join tiles
An extra map SHALL be placed so that its join tile (the tile whose tileset entry has the boolean property `isJoin` set) is in the cell immediately beside the neighbouring map's join tile, on the same row. The two maps' wall columns SHALL NOT overlap: each map draws only its own cells. The placement SHALL be derived from the maps' data, not hard-coded, so moving a door in the map editor moves the room. A map with no join tile SHALL be reported as an error naming the map.

#### Scenario: Bathroom left of the office
- **WHEN** the game loads the office and the bathroom
- **THEN** the bathroom's right-hand join tile is in the cell directly left of the office's left-hand join tile, on the same row, and the doorway openings of the two maps line up

#### Scenario: No shared cells
- **WHEN** the bathroom and the office are both drawn
- **THEN** no world cell is drawn by both maps

#### Scenario: Missing join tile
- **WHEN** a map to be placed has no `isJoin` tile
- **THEN** loading fails with an error that names the map

### Requirement: Every map has the same collision, depth and walk-behind behaviour
Every loaded map SHALL block movement where its collider layers draw pixels, SHALL draw under characters except for its over-the-player layers, and SHALL support walking behind its solid objects exactly as the office does. A map placed away from the origin SHALL behave the same as if it were at the origin.

#### Scenario: Bathroom wall blocks
- **WHEN** the player walks into a bathroom wall
- **THEN** the player is stopped as by an office wall

#### Scenario: Behind a bathroom object
- **WHEN** the player's feet are above the base line of a bathroom stall and overlap its drawn area
- **THEN** the stall is drawn over the player and fades

#### Scenario: Office unchanged
- **WHEN** the office is loaded alongside the bathroom
- **THEN** its layout, collision, depth sorting and fading are the same as when it is loaded alone

### Requirement: Only the player can enter the bathroom
The player SHALL be able to walk from the office through the doorway into the bathroom and back. Susan and Gloria SHALL never route, wander, spawn or work in the bathroom, and loose chairs SHALL never spawn or be taken there. A coworker or chair that the player pushes or pulls toward the doorway SHALL stop at the office's edge instead of entering, and a pulled body SHALL be let go.

#### Scenario: Player walks in
- **WHEN** the player walks left through the doorway
- **THEN** the player enters the bathroom, and the camera can show it

#### Scenario: Coworkers stay out
- **WHEN** a coworker wanders, or the game spawns the characters and chairs
- **THEN** none of them is placed in or routed into the bathroom

#### Scenario: Pulling a coworker to the door
- **WHEN** the player pulls Susan toward the doorway and walks through it
- **THEN** Susan stops at the office's edge and is let go

### Requirement: Debug overlays cover the whole world
The walk-grid overlay (G) and the clearance overlay (H) SHALL tint cells over every map, including the bathroom. Cells a coworker could never use because they are outside the office SHALL be tinted distinctly from cells coworkers can use (blocked cells stay red). The plant and chair-reach overlays SHALL keep drawing wherever their subjects are. All overlays SHALL stay hidden by default and ignore their keys while the chat box is focused.

#### Scenario: Grid over the bathroom
- **WHEN** the player presses G
- **THEN** cells in the bathroom are tinted, free ones in the player-only colour and solid ones red, in line with the office tint

#### Scenario: Toggling
- **WHEN** the player presses G or H while typing in the chat box
- **THEN** nothing changes
