## MODIFIED Requirements

### Requirement: Solid objects are found from the combined colliders
An object SHALL be a vertical run of touching solid cells in one column. Cells are 8 px (the walk grid's size) and a cell is solid when any collider layer draws at least one non-transparent pixel in it, so transparent parts of a tile, and the gaps between art that does not touch, do not join objects. Touching cells from different layers SHALL belong to the same object. Tiles on non-collider layers SHALL NOT make a cell solid. Each loaded map SHALL be analysed on its own, so objects of different maps never join, wherever the maps are placed in the world.

#### Scenario: Wall, desk, wall
- **WHEN** a wall, a desk and a wall touch in one column, the wall and the desk being on different layers
- **THEN** they are one object whose top is the top of the upper wall and whose base is the bottom of the lower wall

#### Scenario: Gap splits
- **WHEN** a column has an empty cell between two solid cells
- **THEN** they are two objects

#### Scenario: Maps side by side
- **WHEN** a wall of the bathroom stands against a wall of the office
- **THEN** they are separate objects, each with its own top, base and open strip
