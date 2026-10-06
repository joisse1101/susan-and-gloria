## ADDED Requirements

### Requirement: Coworkers are not pushable at their desk
From arriving at its work zone until it stops working, a coworker SHALL NOT be moved by a push, so fetching a chair, sitting and working happen at exact positions. Before that, while walking to the desk, it MAY be pushed as specified by `office-pushables`.

#### Scenario: Arriving at the zone
- **WHEN** a coworker reaches its work zone
- **THEN** it can no longer be pushed until it stops working or gives up

#### Scenario: Working done
- **WHEN** a coworker stops working or gives up the desk
- **THEN** it can be pushed again

## MODIFIED Requirements

### Requirement: A coworker gives up an occupied desk when it gets near
A desk is occupied when someone else holds it, or when the player is standing still at it, whether or not the player has started working. A player just walking through does not occupy it. A coworker heading for a desk, or fetching a chair for it, that finds the desk occupied SHALL give it up and say a "desk taken" phrase once it is within one tile of the work position, or as soon as it has to reroute because something blocked it or shoved it. If the desk is not occupied, being blocked or shoved SHALL only make it reroute to the same desk and keep its claim. Giving up SHALL let go of any chair it was fetching.

#### Scenario: Desk taken while fetching the chair
- **WHEN** a coworker is fetching a chair for a desk and the player starts working at that desk
- **THEN** the coworker carries on until it is within one tile of the work position, then lets go of the chair, says a desk-taken phrase and walks off

#### Scenario: Player standing at the desk, not working
- **WHEN** the player stands at the work position without having started to work, and a coworker coming back with the chair gets within one tile or is blocked by them
- **THEN** the coworker lets go of the chair, says a desk-taken phrase and gives up the desk

#### Scenario: Blocked and the desk is free
- **WHEN** something blocks a coworker on its way and the desk is not occupied
- **THEN** it plans a new route and carries on

#### Scenario: Blocked and the desk is occupied
- **WHEN** something blocks a coworker, so it has to reroute, and the desk is occupied
- **THEN** it gives the desk up, lets go of any chair and says a desk-taken phrase

#### Scenario: Shoved on the way to a free desk
- **WHEN** a coworker walking to a desk is shoved and the desk is not occupied
- **THEN** it stops, plans a new route to the same desk from where it ended up, and keeps its claim

#### Scenario: Shoved on the way to an occupied desk
- **WHEN** a coworker walking to a desk is shoved and the desk is occupied
- **THEN** it gives the desk up and says a desk-taken phrase
