## Purpose

A dev-only page for browsing layered characters: pick variants for each layer, pick an animation and facing, and see the composited sprite animate, so outfits and animations can be checked without rebuilding images or running the office.

## ADDED Requirements

### Requirement: The viewer is a dev-only page
The viewer SHALL be reachable at `/dev/characters` when the app runs from the dev server, SHALL NOT be linked from the site navigation, and SHALL NOT be present in the production build.

#### Scenario: Dev server
- **WHEN** the app runs from the dev server and `/dev/characters` is opened
- **THEN** the viewer is shown

#### Scenario: Production build
- **WHEN** the production build is made
- **THEN** it contains no viewer route and no viewer code

### Requirement: The viewer composites a character from the layer sheets
The viewer SHALL draw the selected character by stacking, in the layer order for the current facing, the cell of every visible layer's selected variant for the current animation, facing and frame, scaled up with nearest-neighbour so pixels stay sharp.

#### Scenario: Matches the build's composite
- **WHEN** a character preset is shown at a given animation, facing and frame
- **THEN** the pixels drawn are the same as the build's own composite of that preset at that cell

#### Scenario: Layer order follows the facing
- **WHEN** the facing changes to one whose layer order omits a layer (for example no face in the up view)
- **THEN** that layer is not drawn in that facing

### Requirement: Layer variants can be browsed
For each layer type (body, bottom, top, hair, face, accessories) the viewer SHALL list every available variant, let the user move to the previous or next variant by button or key, and let the user hide the layer. Moving past the last variant SHALL wrap to the first. A face layer SHALL also offer the expressions of the selected face variant.

#### Scenario: Cycling a layer
- **WHEN** the user moves to the next top
- **THEN** only the top layer changes in the preview and the other layers keep their variants

#### Scenario: Wrapping
- **WHEN** the user moves to the next variant while on the last one
- **THEN** the first variant is selected

#### Scenario: Hiding a layer
- **WHEN** a layer is hidden
- **THEN** the preview is drawn without it and the other layers are unchanged, and showing it again restores it

#### Scenario: Keyboard
- **WHEN** the user presses the documented keys to select a layer row and to move its variant
- **THEN** the same change happens as with the buttons, without needing the pointer

### Requirement: Presets can be loaded and left
The viewer SHALL list the character presets from the build, selecting one SHALL set every layer to that preset's variants, and changing any layer afterwards SHALL leave the other layers as they were.

#### Scenario: Loading a preset
- **WHEN** the user selects Gloria
- **THEN** every layer shows the variant named in her preset

### Requirement: Animations and facings can be browsed and played
The viewer SHALL offer every animation and every facing found in the layout data, SHALL play the selected animation at a selectable speed, and SHALL let the user pause and step one frame at a time in either direction, showing the current frame number.

#### Scenario: Selecting an animation
- **WHEN** the user selects walk and the right facing
- **THEN** the preview loops the four walk frames of the right row

#### Scenario: Pausing and stepping
- **WHEN** the user pauses and steps forward
- **THEN** the preview advances exactly one frame and shows its number, wrapping after the last frame

#### Scenario: Mirrored facing
- **WHEN** a facing that the layout marks as mirrored is selected
- **THEN** it is shown from its own row of the sheets, exactly as the game will use it

### Requirement: Many combinations can be seen at once
The viewer SHALL show every facing of the current animation side by side, and a grid of every animation and facing playing together, for the current layer selection, and a change to the selection SHALL update both.

#### Scenario: All facings
- **WHEN** the animation is walk
- **THEN** one preview per facing in the layout is shown in a row, all playing

#### Scenario: All animations
- **WHEN** the grid is shown
- **THEN** every animation and facing combination in the layout appears once, playing, and cycling a layer variant changes all of them

### Requirement: Layers can be inspected individually
The viewer SHALL show a layer-by-layer row for the current animation, facing and frame: the composite first, then each layer alone, each labelled with its layer name, all following the animation clock. A layer that is hidden SHALL still be shown in its own tile, marked as hidden, and SHALL NOT be drawn in the composite.

#### Scenario: One tile per layer
- **WHEN** the layer-by-layer row is shown
- **THEN** it has a composite tile and one tile per layer type, in layer order, each showing only that layer's selected variant

#### Scenario: Hidden layer
- **WHEN** a layer is hidden
- **THEN** the composite omits it and its own tile still shows it, marked as hidden

#### Scenario: Missing in a facing
- **WHEN** the facing's layer order omits a layer (for example the face in the up view)
- **THEN** that layer's tile is shown empty and labelled as not drawn in this facing

### Requirement: Hovering a layer highlights it
While the pointer is over a layer's title or its tile, or the layer's row has keyboard focus, the viewer SHALL draw every other visible layer at reduced opacity and the hovered layer at full opacity, in the main preview, the all-facings strip and the all-animations grid. Leaving or blurring SHALL restore full opacity. Highlighting SHALL change only opacity, never the selection or the hidden flags.

#### Scenario: Hover a title
- **WHEN** the pointer is over the hair layer's title
- **THEN** the hair is drawn at full opacity and the other visible layers at reduced opacity in every preview

#### Scenario: Leave
- **WHEN** the pointer leaves the title
- **THEN** every layer is drawn at full opacity again

#### Scenario: Keyboard focus
- **WHEN** a layer row is selected with the keyboard
- **THEN** it is highlighted the same way as by hover

#### Scenario: Hidden layer
- **WHEN** the title of a hidden layer is hovered
- **THEN** the previews are unchanged, because a hidden layer is not drawn

#### Scenario: Selection untouched
- **WHEN** a highlight starts and ends
- **THEN** no variant, hidden flag, animation or facing has changed

### Requirement: Debug overlays show the cell grid and the layer order
The viewer SHALL offer a toggle for a cell overlay that draws the 32 px cell bounds on the previews, and a toggle for a layer-order list that shows the draw order, bottom to top, for the current facing.

#### Scenario: Cell overlay
- **WHEN** the cell overlay is on
- **THEN** the cell bounds are drawn over the previews without changing the layer pixels

#### Scenario: Layer order list
- **WHEN** the layer-order list is on and the facing changes to up
- **THEN** the list shows the order for the up facing, without the face

### Requirement: Preview background and shadow are adjustable
The viewer SHALL offer a checkerboard and a flat green background, and SHALL allow the character's shadow to be shown under it.

#### Scenario: Background
- **WHEN** the user switches the background
- **THEN** the previews are drawn on it, without changing the layer pixels

### Requirement: The viewer follows the build's data
The viewer SHALL take its characters, variants, animations, facings, frame counts and layer order from the build's output files, so a variant, animation or facing added by the build appears without a code change to the viewer. The build SHALL write a variants manifest listing every variant file per layer type and the expressions of each face variant.

#### Scenario: New variant
- **WHEN** the build exports an additional hair variant and the page is reloaded
- **THEN** that variant is among the hair choices

#### Scenario: New animation
- **WHEN** the layout gains an animation row group
- **THEN** it is offered in the animation picker and appears in the grid

#### Scenario: Missing data
- **WHEN** a layout, manifest or sheet file cannot be loaded
- **THEN** the page says which file is missing instead of showing an empty preview
