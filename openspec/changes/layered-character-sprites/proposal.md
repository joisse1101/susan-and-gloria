## Why

Each character sheet is a flat image drawn by its own `build.py`: body, clothes, hair and accessories are fused, so changing one part (Gloria's glasses) means re-running several scripts, and Susan and Gloria only share the player's legs by copy-paste. Characters also turn in four directions only and always wear one fixed face. Separating the parts makes characters cheaper to author, lets parts be swapped in the game, and unlocks 8-direction walking and expressions.

## What Changes

- Build each character from separate layers in the pixel-art studio: body, top clothes, bottom clothes, hair (front and back halves where the view needs it), accessories, and face. A shared layer library holds the body, walk cycles and exporting; each character's thin script defines only its top clothes, bottom clothes, hair, accessories and face.
- Sheets are organized pack style: one folder per layer type (`bodies`, `top`, `bottom`, `hair`, `accessories`, `face`), one file per variant, each file holding every animation stacked in rows. All files share the **same cell layout** (32x32 cells, same rows and columns per animation), so one frame index selects the matching frame in every layer. The build also generates a guide sheet labelling each animation row, and each character (Gloria, Susan, the player) is a preset naming one variant per layer.
- In the game each layer is its own sprite, stacked as one character: all layers share position, flip, alpha (walk-behind fade), animation frame and depth, with a per-facing layer order (for example hair-back behind the body in the up view). A layer can be swapped at runtime (outfit, hair, accessory) by changing its sheet.
- Idle and Walk sheets grow from 4 to 8 facing rows: five views drawn (S, SE, E, NE, N), the three west-side views mirrored. WorkStanding and WorkSitting stay at 4 cardinal facings.
- The face is one of these layers, one sheet per expression (accessories worn on the face, such as Gloria's glasses, belong to the accessory layer drawn above it); the back views have no face pixels. Neutral and blink are committed. Further expressions (happy, annoyed, confused are candidates) are decided **during development**: each is drawn in the studio on the pilot character and shown as a zoomed preview, and the user keeps or drops it then. Only kept expressions are exported and wired up.
- An expression API (set an expression for a time, then back to neutral) is driven by idle blinking now, and by the existing speech events once expressions beyond neutral and blink are kept (candidate mapping: praise to happy, chair jam and chair stolen to annoyed, forgotten trip to confused).
- Facing selection for walking becomes 8-way with hysteresis, for the player and coworkers. Working, sitting and watering keep cardinal facings.
- Pilot on Gloria (she has hair, tops, a skirt and an accessory), then Susan and the player after sign-off.

## Capabilities

### New Capabilities
- `character-sprite-layers`: how characters are authored and exported as layers (shared library, per-character scripts, one aligned sheet per layer, 8-direction Idle and Walk, cardinal work sheets) and how the layers are stacked and swapped in the game.
- `character-face-overlay`: the face layer and expressions (per-expression face sheets, blinking, timed expressions, which expressions are kept).

### Modified Capabilities
- `office-sprite-scene`: the character requirement is stale (static frames, horizontal facing only) and becomes animated 8-direction facing for Idle and Walk.

## Impact

- `pixel-art/` scripts: new shared layer library and per-character scripts replacing `gloria-idle`, `susan-idle` and the `npc-type` / `player-type` builds as the source of the sheets; sheets move from `public/assets/sprites/<name>/` to per-layer-type folders of variant files (with a generated guide sheet, a layout JSON, a layer-order file and character presets).
- `src/game/office/interaction/player/playerSprite.ts` (`DIRECTIONS`, `Facing`, anim creation for layered 8-row Idle/Walk), `interaction/npc/workFacing.ts` and its tests (8-way facing, hysteresis), `OfficeScene.ts` and everywhere a character sprite's position, alpha, depth, flip, animation or `Shadows` follow is applied (they must apply to the whole layer stack), `furniture/SeatLayers.ts` (chair sandwich around the stack), `fadeWalkBehind`, the speech-event call sites in `interaction/npc/`.
- Unchanged: work, sit and water poses keep four facings; chair offsets, water props and shadows keep working with cardinal facings.
- No new runtime dependencies.
