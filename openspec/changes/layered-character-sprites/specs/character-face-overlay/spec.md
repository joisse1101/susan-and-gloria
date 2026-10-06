## ADDED Requirements

### Requirement: Each character has a face layer
Each character SHALL have a face layer showing eyes and mouth for every facing that looks towards the viewer, drawn under any accessory worn on the face (such as Gloria's glasses), and SHALL show none for facings that look away.

#### Scenario: Front view
- **WHEN** a character faces down
- **THEN** its face is drawn on its head with its glasses, if any, over it

#### Scenario: Back view
- **WHEN** a character faces up
- **THEN** no face is drawn

### Requirement: Neutral and blink expressions
Every face SHALL have a neutral and a blink expression, and an idle character SHALL blink at intervals, returning to neutral after each blink.

#### Scenario: Blinking
- **WHEN** a character has been neutral for a while
- **THEN** it briefly shows the blink expression and returns to neutral

### Requirement: Expressions can be set for a time
An expression SHALL be settable on a character for a duration, after which it returns to neutral, and a newer expression SHALL replace an older one. Setting an expression that does not exist SHALL have no effect.

#### Scenario: Timed expression
- **WHEN** an expression is set for two seconds
- **THEN** the face shows it for two seconds and then returns to neutral

#### Scenario: Replaced expression
- **WHEN** a second expression is set while the first is showing
- **THEN** the face shows the second

#### Scenario: Unknown expression
- **WHEN** an expression that was dropped or never made is requested
- **THEN** the face stays as it was

### Requirement: Further expressions are kept by user decision
Expressions beyond neutral and blink SHALL be exported and triggered only after the user has seen each in a zoomed preview and chosen to keep it.

#### Scenario: Dropped expression
- **WHEN** the user declines a candidate expression
- **THEN** it is not exported and nothing triggers it

#### Scenario: Kept expression
- **WHEN** the user keeps a candidate expression
- **THEN** it is exported and shown on its event (candidates: praise gives happy, chair jam or stolen chair gives annoyed, forgotten trip gives confused)
