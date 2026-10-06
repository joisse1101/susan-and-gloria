## ADDED Requirements

### Requirement: Characters are authored as separate layers
Each character SHALL be authored as separate body, top clothes, bottom clothes, hair, accessory and face layers, with a shared library supplying the body, walk cycles and exporting, so that a character's own definition contains only its top clothes, bottom clothes, hair, accessories and face.

#### Scenario: Changing one layer
- **WHEN** one layer of a character (for example Gloria's skirt, a bottom-clothes layer) is changed and the sheets are rebuilt
- **THEN** only that layer's sheet differs in the regenerated output
- **AND** no other character's sheets change

#### Scenario: Shared body
- **WHEN** Susan, Gloria and the player are built
- **THEN** their bodies and walk cycles come from the same shared source, differing only in skin palette

### Requirement: Layer variants are aligned files in per-layer-type folders
Each layer variant (for example one hairstyle or one skirt) SHALL be exported as one file in the folder for its layer type (body, top clothes, bottom clothes, hair, accessories, face), holding every animation stacked in rows, with cells, rows and columns matching every other variant's file, so that the same frame of any combination of variants lines up without per-frame offsets.

#### Scenario: Aligned frames
- **WHEN** the same animation frame is drawn from one variant of every layer at the same position
- **THEN** the layers register exactly, forming one complete character

#### Scenario: Mixing variants
- **WHEN** a top from one character is combined with the bottom of another
- **THEN** the two register exactly in every animation and facing

### Requirement: Characters are presets of variants
Each character SHALL be defined as a preset naming one variant for each layer type, and the shared library SHALL build every variant referenced by a preset.

#### Scenario: Preset
- **WHEN** a character preset names its body, top, bottom, hair, accessory and face variants
- **THEN** the game builds that character's layer stack from those files

### Requirement: A guide sheet labels the animation rows
The build SHALL generate a guide sheet that labels each animation, facing and frame of the shared layout, and it SHALL be regenerated with the sheets.

#### Scenario: Reading the layout
- **WHEN** the guide sheet is opened
- **THEN** every animation row and facing column in the layer files is identified

### Requirement: Layers are separate sprites in the game
In the game each layer of a character SHALL be its own sprite, and all of a character's layers SHALL share its position, flip, animation frame, alpha and depth order against furniture, chairs and shadows, so the stack behaves as one character.

#### Scenario: Moving together
- **WHEN** a character walks
- **THEN** every layer moves and animates together with no visible gap or lag between layers

#### Scenario: Walking behind furniture
- **WHEN** a character walks behind a walk-behind object and fades
- **THEN** every layer fades by the same amount

#### Scenario: Seated
- **WHEN** a character sits in a chair
- **THEN** the whole layer stack is drawn between the chair's back and its armrests

### Requirement: Layer order depends on facing
The order in which a character's layers are drawn SHALL be defined per facing by the build, so that, for example, the hair is drawn over the head in the up view but the far arm is drawn under the body in a side view.

#### Scenario: Up view
- **WHEN** a character faces up
- **THEN** its hair is drawn over its head
- **AND** no face pixels are visible

### Requirement: Layers can be swapped at runtime
A character's top clothes, bottom clothes, hair and accessory layers SHALL each be replaceable at runtime by another variant of the same layer type, without affecting the other layers.

#### Scenario: Changing an outfit
- **WHEN** a character's top-clothes layer is swapped for another variant
- **THEN** only the top clothes change appearance, in every animation and facing

### Requirement: Idle and Walk have eight facings
The Idle and Walk sheets of every layer SHALL provide eight facings: down, down-right, right, up-right, up, up-left, left and down-left. The three west-side facings SHALL be mirrors of the east-side ones.

#### Scenario: Diagonal walk
- **WHEN** a character walks diagonally
- **THEN** it shows the walk animation for that diagonal facing

#### Scenario: Mirrored side
- **WHEN** a character faces down-left
- **THEN** its sprite is the mirror of its down-right art

### Requirement: Work poses keep four facings
WorkStanding and WorkSitting sheets SHALL keep the four cardinal facings, and seating, chair offsets and watering props SHALL keep working with cardinal facings only.

#### Scenario: Working at a desk
- **WHEN** a character works at a desk or waters a plant
- **THEN** it faces one of the four cardinal directions

### Requirement: Sheets are regenerated, not hand-edited
All layer sheets and layer-order data SHALL be produced by the build scripts, and rebuilding SHALL be deterministic.

#### Scenario: Rebuild
- **WHEN** the build is run twice without changes
- **THEN** both runs produce identical files
