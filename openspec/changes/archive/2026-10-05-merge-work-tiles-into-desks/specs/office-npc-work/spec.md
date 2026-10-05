## ADDED Requirements

### Requirement: A desk is a run of touching work tiles at most 32 px across
Map tiles with the property `interaction` set to `work` that touch (sharing an edge) SHALL form one desk, except that a desk SHALL be at most 32 px wide and 32 px tall. A touching run larger than that SHALL be cut into separate desks, starting from the run's top-left corner. A desk SHALL be held by at most one of Susan, Gloria or the player at a time, however many tiles it spans, so the number of people who can use a place does not depend on the map's tile size. The tile property `direction` SHALL NOT affect which tiles form a desk.

#### Scenario: A desk drawn with four small tiles
- **WHEN** four 16 px work tiles form a 2x2 block
- **THEN** they are one desk, and only one person can hold it at a time

#### Scenario: One large tile
- **WHEN** a single 32 px work tile is on the map
- **THEN** it is one desk

#### Scenario: A run longer than 32 px
- **WHEN** a touching run of work tiles is 64 px long
- **THEN** it is two desks of 32 px, cut from the run's start, and two people can work there at once

#### Scenario: A run that is not a multiple of 32 px
- **WHEN** a touching run of work tiles is 48 px long
- **THEN** it is one desk of 32 px and one of 16 px

#### Scenario: Same tile on two layers
- **WHEN** two work tiles on different layers occupy the same cell
- **THEN** they count as one tile of the desk

#### Scenario: Same layout on a finer grid
- **WHEN** the same desks are drawn with 16 px tiles instead of 32 px tiles
- **THEN** the same number of desks result, each held by one person at a time

### Requirement: The work zone has a fixed pixel depth along the whole desk edge
A desk's work zone on each open side SHALL span the full length of the desk's edge on that side and reach out a fixed distance in pixels, 24 px. The distance SHALL be adjustable without changing behaviour code and SHALL NOT depend on the map's tile size.

#### Scenario: Zone along a desk
- **WHEN** a desk is 32 px long on its left side
- **THEN** a coworker standing anywhere along that 32 px edge, within 24 px of it, is in the desk's zone

#### Scenario: Map on a finer grid
- **WHEN** the same desk is drawn with 16 px tiles instead of 32 px tiles
- **THEN** its zone has the same size in pixels
