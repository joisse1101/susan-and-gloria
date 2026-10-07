## Context

See proposal.md for motivation. Today each character's sheets (`Idle`, `Walk`, `WorkStanding`, `WorkSitting`, 32x32 cells, rows = down, up, right, left) are flat images produced by separate scripts (`pixel-art/gloria-idle`, `susan-idle`, `npc-type`, `player-type`). Susan and Gloria copy the player's legs pixel for pixel. Facing is chosen in `interaction/npc/workFacing.ts` (stronger velocity axis for coworkers, horizontal first for the player), and `DIRECTIONS` in `playerSprite.ts` maps rows to facings. Work and water code (`deskSpot.facingFor`, `SeatLayers` chair offsets, `waterPropLayout`) only ever uses the four cardinals. A character is currently one Phaser sprite, with `Shadows` and `SeatLayers` following it and `fadeWalkBehind` fading it.

Constraints: the layer sheets are hand-drawn source files, not generated (one-off scripts only seed Susan's and the player's drafts and are deleted at the end); the chair sandwich (chair one depth step behind, armrests one step in front) must still bracket the whole character.

## Goals / Non-Goals

**Goals:**
- Layers authored once in a shared library, exported as aligned sheets, stacked in the game and swappable.
- One place that owns "a character is a stack of sprites", so the rest of the scene treats it as one thing.

**Non-Goals:**
- Diagonal facings of any kind (all animations stay four-way).
- Changing pathfinding, desks or chair logic.
- A player-facing outfit editor (swapping is supported, not exposed in UI).
- Expressions and blinking (dropped: the sprite's 1px eyes are too small to carry them).

## Decisions

**1. Every layer is a runtime sprite on aligned sheets.** Layers: body, bottom clothes, top clothes, hair, accessories, face. Following the pack-style generator layout, each layer type has a folder and each variant is one file holding every animation stacked in rows, on the same cell grid as every other variant, so a single frame index applies to all of them and no per-frame offsets or anchors are needed. A hand-maintained layout JSON (animation, row, frames per facing) sits beside them, `pixel-art/layers/LAYOUT.md` documents the grid for authors, and the game reads the layout JSON rather than hardcoding rows. Characters are presets naming one variant per layer type. Top and bottom clothes stay separate layer types (the pack has a single outfit layer; we split it so tops and bottoms mix). Alternative considered: bake body/clothes/hair into one sheet and keep only the face separate (rejected by the user: parts must be swappable in the game). Alternative: baked composites per outfit, rejected as combinatorial.

**2. A `CharacterRig` owns the stack.** It creates one sprite per layer, and exposes the operations the scene currently performs on a single sprite: set position, flip, play animation / frame, set alpha, set depth, destroy, and layer swap (`setLayer(type, variant)`). Existing code that touches a character sprite directly (`OfficeScene` update, `fadeWalkBehind`, `Shadows`, `SeatLayers`, `PathFollower` hosts) goes through the rig or a thin facade. The physics body stays on a single base sprite (the body layer) so collision, pushing and `FEET_LIFT` are untouched; the other layers follow it each frame.

**3. Depth.** All layers sit within one depth step of the character's base depth, separated by tiny increments in the per-facing layer order, so the chair back (one step behind) and armrests (one step in front) still bracket the whole stack and y-sorting against furniture treats it as one. The layer order per facing comes from a small JSON the build writes (for example up view: hair over body; side view: far arm under body).

**4. Faces are layers too.** One static face sheet per character, same cell grid, no expressions or blinking. Accessories worn on the face (Gloria's glasses) are in the accessory layer. The face is drawn last, over the accessories, so the eyes show through the lenses and the glasses need no special handling. Hair fringe likewise sits in the hair layer above the face. This removes the need for an anchors file.

## Risks / Trade-offs

- [Six sprites per character multiplies per-frame work and every place that touched one sprite] → one rig as the single owner; sprites updated in one loop; only three characters, so cost is small. Verify with a test that rig operations apply to every layer.
- [Layers drift apart for one frame (position, frame, flip updated in different orders)] → the rig applies all state in a single update call; the physics body sprite is the only source of truth for position.
- [Depth fighting between layers or with chair layers] → layer order inside one depth step, covered by a scene check with a seated character.
- [Alpha mismatch during walk-behind fade] → fade acts on the rig, not on individual sprites.
- [Art for six layers and three characters] → shared body and walk cycles; pilot on Gloria and wait for sign-off before Susan and the player.

## Migration Plan

1. Build the shared library and Gloria's definition; export one sheet per layer, and first reproduce today's four-facing look to prove the layers composite back to the current art.
2. Add `CharacterRig` and route the scene's single-sprite operations through it, with Gloria on layered sheets and the others unchanged, so the game works throughout.
3. Add the face layer.
4. Split Susan, then the player, into draft layers on the same grid with a one-off script, and let the user refine each by hand. After sign-off, delete the scripts and previews.

Rollback: sheets are generated and tracked in git, so reverting restores the previous sheets and single-sprite loader.
