## Purpose

Defines the one rule that decides when Susan, Gloria or the player starts a tile interaction (working at a desk, watering the plant), so every interaction and every actor starts the same way and differs only in what interrupts it.

## Requirements

### Requirement: One rule decides when an interaction starts
For every actor and every tile interaction, starting SHALL require all of: the actor is within the interaction's reach, the actor is not interrupted, the interaction is not on cooldown (watering's cooldown belongs to the plant, work's to the coworker), and nobody else holds the thing to be used. The same rule SHALL be used for Susan, Gloria and the player, and for work and watering alike.

#### Scenario: All conditions met
- **WHEN** an actor is within reach, not interrupted, off cooldown, and the thing is free
- **THEN** the interaction starts

#### Scenario: One condition fails
- **WHEN** any one of those conditions does not hold
- **THEN** the interaction does not start

#### Scenario: Same rule for work and watering
- **WHEN** an actor is near both a desk and the plant and meets the conditions for each
- **THEN** each interaction is decided by the same rule, and only one of them starts at a time

### Requirement: What interrupts an actor depends on the actor
A coworker SHALL count as interrupted while a speech bubble is up on them or while they are being pulled by the player. The player SHALL count as interrupted while a movement key is down, while typing in chat, or while a chat bubble is up. Interruptions SHALL not change which interactions are possible, only whether one starts or continues.

#### Scenario: Coworker with a bubble
- **WHEN** a coworker has a speech bubble up and is near the plant
- **THEN** watering does not start

#### Scenario: Player holding a movement key
- **WHEN** the player is near the plant but a movement key is down
- **THEN** watering does not start

#### Scenario: Player typing
- **WHEN** the player is near the plant and typing in chat
- **THEN** watering does not start

### Requirement: The player only triggers an interaction when standing still
The player SHALL start an interaction only when they are standing still within reach, never merely by walking through it. A coworker SHALL start one by walking into reach.

#### Scenario: Player walks past
- **WHEN** the player walks through the reach of the plant without stopping
- **THEN** nothing starts and their movement is not taken over

#### Scenario: Player stops near
- **WHEN** the player stands still within reach, not interrupted and off cooldown
- **THEN** the interaction starts

#### Scenario: Coworker walks past
- **WHEN** a coworker wandering through the reach of the plant meets the other conditions
- **THEN** the interaction starts

### Requirement: An interaction has a cooldown after it ends
After an actor finishes, is interrupted from, or gives up an interaction, the same interaction SHALL NOT start again until a cooldown has passed. Watering's cooldown SHALL belong to the plant and be shared by every actor: once anyone has watered it, nobody waters it again until the cooldown has passed. Work keeps its existing per-coworker cooldown. The player SHALL NOT restart an interaction just by remaining in place after it ended or was cancelled; they SHALL leave reach before it can start again. The cooldown length SHALL be adjustable without changing behaviour code. Starting is not random: when the conditions are met the interaction starts.

#### Scenario: Coworker finishes watering and stays near
- **WHEN** a coworker finishes watering and is still within reach
- **THEN** it does not start again until the cooldown has passed

#### Scenario: Cooldown over
- **WHEN** the cooldown has passed and the coworker is within reach, not interrupted and the plant is free
- **THEN** watering may start again

#### Scenario: Player cancels and stays still
- **WHEN** the player cancels watering with a movement key and then stands still within reach again
- **THEN** it does not restart until they have left reach

#### Scenario: Cooldown shared by all actors
- **WHEN** one actor has just watered the plant and another actor comes near it before the cooldown has passed
- **THEN** the second actor does not start watering it

#### Scenario: Cooldown per plant
- **WHEN** an actor has just watered one plant and comes near a different plant
- **THEN** the cooldown for the first plant does not stop it watering the second

### Requirement: An actor is in one interaction at a time
An actor SHALL be in at most one interaction at a time. While an actor is heading for or doing one, another SHALL NOT start. When two could start in the same moment, work SHALL win. An interrupt on an actor (a speech bubble on a coworker, a movement key, typing or chat for the player) SHALL end whichever interaction it is in, whatever kind it is. Whether an actor is in an interaction SHALL be what decides if a coworker can be pushed at its spot and which pose it plays.

#### Scenario: Busy with work
- **WHEN** an actor is heading for or working at a desk and passes the plant
- **THEN** watering does not start

#### Scenario: Same-moment tie
- **WHEN** an actor could start both work and watering in the same moment
- **THEN** work starts and watering does not

#### Scenario: Interrupt ends any interaction
- **WHEN** a coworker is spoken to while working, or while watering
- **THEN** that interaction ends either way, and its desk or plant is free

#### Scenario: Pushability follows the interaction
- **WHEN** a coworker is at its spot in either interaction
- **THEN** it cannot be pushed, and when the interaction ends it can be

### Requirement: Work uses the shared rule without changing
The work interaction SHALL decide when to start through the shared rule. The behaviour of work (desk claiming, chair trips, jams, give-ups, phrases, pushing) SHALL remain as specified in `office-npc-work`, `office-player-work` and `office-pushables`.

#### Scenario: Work behaves as before
- **WHEN** a coworker or the player starts working at a desk
- **THEN** the desk claim, chair trip and work period are exactly as before the shared rule existed
