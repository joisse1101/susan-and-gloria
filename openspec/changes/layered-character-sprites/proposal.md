## Why

Each character sheet is a flat image drawn by its own `build.py`: body, clothes, hair and accessories are fused, so changing one part (Gloria's glasses) means re-running several scripts, and Susan and Gloria only share the player's legs by copy-paste. Characters also turn in four directions only and always wear one fixed face. Separating the parts makes characters cheaper to author, lets parts be swapped in the game.

## What Changes

- Build each character from separate layers in the pixel-art studio: body, top clothes, bottom clothes, hair (front and back halves where the view needs it), accessories, and face. A shared layer library holds the body, walk cycles and exporting; each character's thin script defines only its top clothes, bottom clothes, hair, accessories and face.
- Sheets are organized pack style: one folder per layer type (`bodies`, `top`, `bottom`, `hair`, `accessories`, `face`), one file per variant, each file holding every animation stacked in rows. All files share the **same cell layout** (32x32 cells, same rows and columns per animation), so one frame index selects the matching frame in every layer. The build also generates a guide sheet labelling each animation row, and each character (Gloria, Susan, the player) is a preset naming one variant per layer.
- In the game each layer is its own sprite, stacked as one character: all layers share position, flip, alpha (walk-behind fade), animation frame and depth, with a per-facing layer order (for example hair-back behind the body in the up view). A layer can be swapped at runtime (outfit, hair, accessory) by changing its sheet.
- All sheets (Idle, Walk, WorkStanding, WorkSitting) keep the four cardinal facings: down, up, right, left.
- The face is one of these layers, a single static sheet (accessories worn on the face, such as Gloria's glasses, belong to the accessory layer, with the face drawn over it so the eyes show through the lenses); the back views have no face pixels. There are no expressions or blinking: the 32px sprite's 1px eyes are too small to carry them, so they were dropped.
- Pilot on Gloria (she has hair, tops, a skirt and an accessory), then Susan and the player after sign-off.

## Capabilities

### New Capabilities
- `character-sprite-layers`: how characters are authored and exported as layers (shared library, per-character scripts, one aligned sheet per layer, four cardinal facings) and how the layers are stacked and swapped in the game.
- `character-face-overlay`: the face layer (one static sheet per character, none for facings that look away).

### Modified Capabilities
- `office-sprite-scene`: the character requirement is stale (static frames, horizontal facing only) and becomes animated sprites (the four-way facing stays).

## Impact

- `pixel-art/` scripts: new shared layer library and per-character scripts replacing `gloria-idle`, `susan-idle` and the `npc-type` / `player-type` builds as the source of the sheets; sheets move from `public/assets/sprites/<name>/` to per-layer-type folders of variant files (with a layout JSON, a layer-order file and character presets; the guide sheet and previews are generated for authors and not committed).
- `src/game/office/interaction/player/playerSprite.ts` (anim creation for layered sheets), `OfficeScene.ts` and everywhere a character sprite's position, alpha, depth, flip, animation or `Shadows` follow is applied (they must apply to the whole layer stack), `furniture/SeatLayers.ts` (chair sandwich around the stack), `fadeWalkBehind`.
- Unchanged: all poses and walking keep four facings (`DIRECTIONS`, `Facing`, `workFacing.ts`); chair offsets, water props and shadows keep working with cardinal facings.
- No new runtime dependencies.
