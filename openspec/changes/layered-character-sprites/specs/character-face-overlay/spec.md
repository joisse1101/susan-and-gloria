## ADDED Requirements

### Requirement: Each character has a face layer
Each character SHALL have a face layer showing eyes and mouth for every facing that looks towards the viewer, drawn over any accessory worn on the face (such as Gloria's glasses) so its eyes show through the lenses, and SHALL show none for facings that look away.

#### Scenario: Front view
- **WHEN** a character faces down
- **THEN** its face is drawn on its head, over its glasses if any

#### Scenario: Back view
- **WHEN** a character faces up
- **THEN** no face is drawn
