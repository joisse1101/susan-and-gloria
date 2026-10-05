## Why

Characters always draw in front of the map's furniture tiles, and a collider tile blocks every opaque pixel it draws. A character can never pass behind a shelf or desk, so the room reads flat. `place()` already sorts and uses base-only bodies for hand-placed props, but tilemap furniture does not.

## What Changes

- Every solid on the map can be walked behind, with no authoring: the top strip of each solid object is walkable, and the rest still blocks. An object is a vertical run of touching solid cells in one column, taken from all collider layers combined, so a wall, a desk and a wall stacked in a column are one object and only the top of the topmost piece opens.
- The strip is the top `WALK_BEHIND_STRIP_PX` (16 px) of the object, capped at `WALK_BEHIND_STRIP_FRACTION` (2/3) of its height, rounded down to whole px. A 32 px wall opens 16 px; a 16 px object opens 10 px. At least a third of every object still blocks.
- Walk-behind objects are drawn depth-sorted against characters and chairs instead of flat under everything. A character whose feet are above an object's base line is drawn behind it.
- An object fades when a character is behind it and overlapping its drawn pixels, then fades back in when they leave.
- The walkable grid follows, because it is built from the colliders.
- The stale `TOP_LAYERS` name (`Room Boundary Bottom`, no longer in `map.json`) is corrected so over-the-player layers work again.
- Alternative B (rects drawn over the map) is written up in `design.md` as a later option for exceptions. It plugs into the same object-list seam and is **not** part of this change.

## Capabilities

### New Capabilities
- `office-walk-behind`: how solid objects are found, how much of their top can be walked into, how they are depth-sorted and how they fade.

### Modified Capabilities
- `office-sprite-scene`: "Overlap follows vertical position" now also covers tilemap furniture, not only placed sprites.

## Impact

- `src/game/office/map/loadOfficeMap.ts`: builds objects from the combined collider layers, trims the top strip off their collision bodies and makes sortable pieces; fixes `TOP_LAYERS`.
- `src/game/office/OfficeScene.ts`: per-frame fade pass; depth for the objects.
- `src/game/office/constants.ts`: any new depth or fade constants.
- Map authoring: none. `map.json` is unchanged.
- `WalkGrid`, chairs and pushing need no code change; they read the colliders, which now cover less at the top of each object.
- Docs: `CLAUDE.md` Office section.
