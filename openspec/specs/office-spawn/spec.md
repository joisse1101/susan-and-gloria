## Purpose

Places the player, coworkers and chairs on valid, reachable floor when The Office loads, so the map can be edited without re-entering start coordinates.

## Requirements

### Requirement: Humans spawn on random walkable floor
On map load, the player, Susan and Gloria SHALL each be placed on a randomly chosen cell that a coworker can stand on, taken from the map's walkable area rather than from fixed coordinates.

#### Scenario: Spawn is on walkable floor
- **WHEN** the Office loads on any valid map
- **THEN** the player, Susan and Gloria each stand on walkable floor, not inside a wall, desk or other solid

#### Scenario: Layout varies between loads
- **WHEN** the Office is loaded twice with different random sources
- **THEN** the spawn positions can differ between the two loads

### Requirement: Pushable objects spawn where they fit
On map load, each loose chair SHALL be placed on a randomly chosen cell where a whole chair fits, using the same fit rule that decides where a chair may be dragged.

#### Scenario: Chair fits where it spawns
- **WHEN** the Office loads
- **THEN** every chair is on a cell with enough free space around it for a chair, and none is touching a wall or desk

### Requirement: Spawns are reachable
A spawn cell SHALL be connected by walkable cells to the rest of the main floor. A walkable pocket sealed off from the main floor SHALL NOT be used.

#### Scenario: Sealed pocket
- **WHEN** the map has a walkable area fully enclosed by solids and not connected to the main floor
- **THEN** no character or chair spawns in it

### Requirement: Spawns do not overlap
Spawned characters and chairs SHALL be at least a minimum distance from one another, so nothing starts overlapping or pushed into another body.

#### Scenario: Minimum gap
- **WHEN** the Office loads
- **THEN** no two spawned characters or chairs are closer than the minimum gap

### Requirement: Spawns stay out of interaction zones
No character or chair SHALL spawn inside a desk's work zone or a plant's watering reach zone, so nobody starts mid-interaction and no chair starts where a coworker would have to shove it aside.

#### Scenario: Work zone
- **WHEN** the Office loads
- **THEN** no character or chair is inside any desk's work zone

#### Scenario: Plant reach zone
- **WHEN** the Office loads
- **THEN** no character or chair is inside any plant's watering reach zone

### Requirement: Spawn failure is explicit
If the map has too few valid cells to place everything with the minimum gap and outside the interaction zones, the Office SHALL still load, SHALL relax the gap first and the zone rule last before giving up on any one body, and SHALL report in the browser console what could not be placed as asked.

#### Scenario: Cramped map
- **WHEN** the map has fewer valid cells than needed to keep the full gap
- **THEN** the Office loads, everything is still on valid cells, and a console message says the gap was relaxed

#### Scenario: Almost no cells outside the zones
- **WHEN** the interaction zones leave too few cells for everything, even with no gap
- **THEN** the Office loads, the bodies that did not fit are placed inside a zone, and a console message says the zone rule was relaxed
