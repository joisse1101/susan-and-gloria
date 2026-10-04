## Purpose

Defines how Susan, Gloria and the player water the office plant: finding it on the map, walking to it, facing it, watering with the can and stream, sharing it, and stopping.

## Requirements

### Requirement: Waterable tiles form plants
Map tiles with the property `interaction` set to `water` SHALL be waterable. Waterable tiles that touch SHALL form one plant, however many tiles or layers they cover. A plant SHALL be used by one actor at a time.

#### Scenario: Two touching tiles
- **WHEN** two waterable tiles are side by side
- **THEN** they are one plant that one actor waters at a time

#### Scenario: Stacked tiles
- **WHEN** two waterable tiles on different layers occupy the same cell
- **THEN** the cell counts once

#### Scenario: Another actor is watering
- **WHEN** an actor is heading to or watering the plant and another actor comes near it
- **THEN** the second actor does not start watering it, says a praise line, and carries on

### Requirement: Coming near the plant starts watering
Watering SHALL be offered to an actor when its feet are within 0.5 tile of the plant's edge on any side, under the start rule in `office-interaction-trigger`. The reach SHALL be adjustable without changing behaviour code.

#### Scenario: Coworker wanders near
- **WHEN** a coworker's feet come within 0.5 tile of the plant while wandering, and it is not interrupted, off cooldown and the plant is free
- **THEN** it starts to go to the plant

#### Scenario: Further than 0.5 tile
- **WHEN** an actor passes the plant at more than 0.5 tile from its edge
- **THEN** nothing starts

#### Scenario: Player stops near
- **WHEN** the player stands still within 0.5 tile of the plant, off cooldown, with no interruption
- **THEN** the character starts to go to the plant

### Requirement: The actor routes to the plant
An actor that starts watering SHALL walk a collision-free route around walls and furniture to the nearest open spot beside the plant, then step flush against it and face it. The plant itself blocks walking, so the spot SHALL be next to it, not on it. The player's character SHALL walk the same kind of route automatically.

#### Scenario: Open side
- **WHEN** an actor starts watering from the open side of the plant
- **THEN** it walks to the nearest open spot beside the plant, faces the plant and waters it

#### Scenario: Furniture in the way
- **WHEN** furniture lies between the actor and the nearest open spot
- **THEN** it walks around it

#### Scenario: Wall side
- **WHEN** one side of the plant is against a wall
- **THEN** no actor stands on that side

#### Scenario: No route
- **WHEN** no open spot beside the plant can be reached, or the walk takes too long
- **THEN** the actor gives up, the plant is free again and the cooldown applies

### Requirement: Watering shows the can and the stream
While an actor waters, it SHALL stand at the spot facing the plant in a standing watering pose, with the watering can in its hands and water pouring from the can towards the plant, drawn for the way the actor faces. Both SHALL disappear when watering ends. All three characters SHALL use the same can and stream sprites.

#### Scenario: Plant to the side
- **WHEN** an actor waters from the left or right of the plant
- **THEN** the can is in its hands and the side stream pours towards the plant

#### Scenario: Plant below
- **WHEN** an actor waters with the plant in front of them
- **THEN** the can is at the belly and the front stream pours towards the camera

#### Scenario: Plant above
- **WHEN** an actor waters with the plant behind them in the picture
- **THEN** the can and the back stream are drawn behind the character

#### Scenario: Watering ends
- **WHEN** watering ends or is interrupted
- **THEN** the can and the stream are no longer drawn

### Requirement: Watering lasts a set time
Once at the spot, an actor SHALL water for a set duration, then stop, hand back the plant and start the cooldown. The duration SHALL be adjustable without changing behaviour code.

#### Scenario: Full watering
- **WHEN** an actor has watered for the full duration
- **THEN** it stops, the plant is free and the cooldown begins

### Requirement: Watering can be interrupted
A coworker SHALL stop watering, or stop going to the plant, when a speech bubble goes up on it (a notice, chat or a reply). The player SHALL stop when they press a movement key, start typing or open chat. Interrupting SHALL return control at once, free the plant and start the cooldown. The player SHALL say nothing when they cancel themselves.

#### Scenario: Coworker spoken to
- **WHEN** the player speaks and a coworker who is watering gets a bubble
- **THEN** it stops watering and the plant is free

#### Scenario: Player presses a key on the way
- **WHEN** the player presses a movement key while the character is walking to the plant
- **THEN** the walk stops and the player moves as they directed

#### Scenario: Player presses a key while watering
- **WHEN** the player presses a movement key while watering
- **THEN** watering stops and the player moves as they directed

### Requirement: The walk to the plant gives up when it cannot finish
A trip to the plant SHALL be abandoned when the actor is blocked repeatedly by something the route did not allow for, or takes too long. The actor SHALL be left where it is and free, the plant SHALL be freed and the cooldown SHALL apply. A coworker blocked and shoved SHALL replan to the same plant while the plant is still free for it.

#### Scenario: Blocked repeatedly
- **WHEN** something keeps blocking the actor on its way to the plant
- **THEN** it gives up and the plant is free

#### Scenario: Shoved once
- **WHEN** a coworker walking to the plant is shoved and the plant is still free for it
- **THEN** it plans a new route to the same plant and carries on

#### Scenario: Plant taken meanwhile
- **WHEN** another actor starts watering the plant first
- **THEN** the actor on its way gives up, says a praise line and carries on

### Requirement: Someone who finds the plant being watered praises it
When an actor comes near the plant while another actor is heading to it or watering it, the newcomer SHALL say a randomly chosen line from a list of praise phrases (such as "good work", "looking good", "thanks" or "that's beautiful"), then carry on. The line SHALL be said once per encounter: the newcomer SHALL NOT repeat it until it has left the plant's reach and come back. The list SHALL be editable without changing behaviour code. This applies to Susan, Gloria and the player, whoever is watering. A player who cancels, or who is walking through, says nothing.

#### Scenario: Coworker finds the player watering
- **WHEN** the player is watering and a coworker wanders near the plant
- **THEN** the coworker says a praise line and carries on

#### Scenario: Player finds a coworker watering
- **WHEN** a coworker is watering and the player stands still near the plant
- **THEN** the player says a praise line in their speech bubble

#### Scenario: Lingering near
- **WHEN** the newcomer stays near the plant after saying the line
- **THEN** it does not say another until it has left the plant's reach and come back

#### Scenario: Different lines over time
- **WHEN** several newcomers are praised over time
- **THEN** each line is chosen at random from the list

#### Scenario: Walking past
- **WHEN** the player walks through the plant's reach without stopping while someone waters
- **THEN** no line is said

### Requirement: Watering coworkers are not pushable at the plant
From reaching the spot until it stops, a coworker SHALL NOT be moved by a push. While walking to the plant it MAY be pushed as specified by `office-pushables`.

#### Scenario: At the spot
- **WHEN** a coworker is watering and the player walks into it
- **THEN** the coworker does not move

#### Scenario: On the way
- **WHEN** a coworker is walking to the plant and the player pushes it
- **THEN** it is pushed as for any walking coworker
