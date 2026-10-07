## ADDED Requirements

### Requirement: Characters are authored as separate layers
Each character SHALL be authored as separate hand-drawn body, top clothes, bottom clothes, hair, accessory and face layers, each on the common cell grid.

#### Scenario: Changing one layer
- **WHEN** one layer of a character (for example Gloria's skirt, a bottom-clothes layer) is edited
- **THEN** only that layer's sheet file changes
- **AND** no other layer's or character's sheets change

### Requirement: Layer variants are aligned files in per-layer-type folders
Each layer variant (for example one hairstyle or one skirt) SHALL be exported as one file in the folder for its layer type (body, top clothes, bottom clothes, hair, accessories, face), holding every animation stacked in rows, with cells, rows and columns matching every other variant's file, so that the same frame of any combination of variants lines up without per-frame offsets.

#### Scenario: Aligned frames
- **WHEN** the same animation frame is drawn from one variant of every layer at the same position
- **THEN** the layers register exactly, forming one complete character

#### Scenario: Mixing variants
- **WHEN** a top from one character is combined with the bottom of another
- **THEN** the two register exactly in every animation and facing

### Requirement: Characters are presets of variants
Each character SHALL be defined as a preset naming one variant for each layer type, and every variant a preset names SHALL exist as a layer file.

#### Scenario: Preset
- **WHEN** a character preset names its body, top, bottom, hair, accessory and face variants
- **THEN** the game builds that character's layer stack from those files

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

### Requirement: All animations keep four facings
Every animation sheet (Idle, Walk, WorkStanding, WorkSitting) of every layer SHALL provide the four cardinal facings: down, up, right and left. Seating, chair offsets and watering props SHALL keep working with cardinal facings only.

#### Scenario: Walking
- **WHEN** a character walks
- **THEN** it shows the walk animation for one of the four cardinal facings

#### Scenario: Working at a desk
- **WHEN** a character works at a desk or waters a plant
- **THEN** it faces one of the four cardinal directions

### Requirement: Layer sheets are hand-drawn source files
All layer sheets and the layout, layer-order, preset and variant data SHALL be edited directly as files. The repository SHALL NOT keep a generator or preview image for the characters' layers once they are hand-drawn.

#### Scenario: Editing a sheet
- **WHEN** an artist edits a layer sheet and reloads the game or the character viewer
- **THEN** the change shows without running any build script
