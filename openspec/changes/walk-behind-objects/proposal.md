## Why

Characters always draw in front of the map's furniture tiles, and a collider tile blocks every opaque pixel it draws. A character can never pass behind a shelf or desk, so the room reads flat. `place()` already sorts and uses base-only bodies for hand-placed props, but tilemap furniture does not.

## What Changes

- A tile layer can opt in to "walk behind" with Tiled layer properties (option A): a `behind` property gives the depth in px that blocks, measured up from the base of each piece.
- Opted-in layers are drawn depth-sorted against characters and chairs instead of flat under everything. A character whose feet are above an object's base line is drawn behind it.
- An opted-in collider blocks only its base slice. The rest of the drawn height can be walked behind. The walkable grid follows, because it is built from the colliders.
- An object fades when a character is behind it and overlapping its drawn pixels, then fades back in when they leave.
- The stale `TOP_LAYERS` name (`Room Boundary Bottom`, no longer in `map.json`) is corrected so over-the-player layers work again.
- Alternatives B (rects drawn over the map) and C (auto-grouping connected tiles) are written up in `design.md` as later options. They plug into the same object-list seam and are **not** part of this change.

## Capabilities

### New Capabilities
- `office-walk-behind`: how furniture is marked as walk-behind, how deep it blocks, how it is depth-sorted and how it fades.

### Modified Capabilities
- `office-sprite-scene`: "Overlap follows vertical position" now also covers tilemap furniture, not only placed sprites.

## Impact

- `src/game/office/map/loadOfficeMap.ts`: reads layer properties, builds base-only collision bodies and sortable pieces for opted-in layers; fixes `TOP_LAYERS`.
- `src/game/office/OfficeScene.ts`: per-frame fade pass; depth for the pieces.
- `src/game/office/constants.ts`: any new depth or fade constants.
- Map authoring: layers to be walked behind get the `behind` property in Tiled / Sprite Fusion. `map.json` needs re-exporting with them.
- `WalkGrid`, chairs and pushing need no code change; they read the colliders, which now cover less.
- Docs: `CLAUDE.md` Office section.
