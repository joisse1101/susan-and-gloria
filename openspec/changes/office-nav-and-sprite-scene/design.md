## Context

See proposal.md for motivation. Current state:

- `App.tsx` uses `HashRouter`; `/office` is a sibling of the `MainLayout` route, so it has no header.
- `Header.tsx` uses plain `<a href>` (`/` and `/about/`). Under `base: '/susan-and-gloria/'` these leave the app or 404, and `/about` has no route.
- `theOffice.ts` builds all textures in `preload()` with `graphics.generateTexture` (including two unused ones and a duplicated player texture). Canvas is 600x400, arcade physics, static desks, static NPCs, a speech bubble at depth 100.
- The asset pack is a single 256x160 PNG of irregular objects (not a uniform grid): characters roughly 16x24, static and front-facing, no walk frames. `PixelOffice.png` is a reference mock-up, and `PixelOfficeAssets.aseprite` is the source file.

## Goals / Non-Goals

**Goals:**
- Make the Office reachable and get back out of it.
- Move the scene onto the atlas with an asset seam narrow enough that better art later is a manifest edit.

**Non-Goals:**
- Animation frames, tilemaps, NPC dialogue, or any change to `src/agents/`.

## Decisions

### D1: `/office` moves inside `MainLayout`
Nest the route under the layout route so the header (and the way back) is always present. Alternative: keep it full-bleed and add a back button. Rejected for now: it needs bespoke chrome, and nothing forces full-screen yet. Revisit if the canvas wants the whole viewport.

### D2: Router `NavLink`s, not hrefs
Use `NavLink` for Chat (`end` on `/`) and Office, and `Link` for the site title. This is correct under `HashRouter` and the base path without string-building, and gives active-state styling via the existing `.page-link` class plus an active modifier. Remove the About link.

### D3: One texture, named frames from a code manifest
Load `PixelOfficeAssets.png` with `load.image`, then in `create()`/a post-load step register each frame with `texture.add(name, 0, x, y, w, h)`. The frame rectangles live in one module (`src/utils/officeAtlas.ts`): `name -> {x, y, w, h}`. Sprites reference names only.
- Alternative: a Phaser JSON atlas file (`load.atlas`). Works, but adds a second file to keep in sync and needs a tool or hand-written JSON anyway.
- Alternative: `load.spritesheet` with a fixed frame size. Rejected: the sheet is not a uniform grid.
- Rects are measured from the PNG once and hand-committed. If frame names change, only this module changes.

### D4: Asset URL via `BASE_URL`
`this.load.image('office', `${import.meta.env.BASE_URL}assets/office/PixelOfficeAssets.png`)`. The filename case matters: GitHub Pages is case-sensitive, and the file is `PixelOfficeAssets.png`.

### D5: Crisp rendering with an integer scale
Set `pixelArt: true` (nearest-neighbour, no antialiasing) in the game config. Keep the 600x400 logical canvas and coordinates so existing physics/positions still work, and apply an integer sprite scale (starting at 2x, tuned when the frame sizes are known) so pixels stay square. Alternative: drop to a small base resolution (e.g. 320x200) and scale the whole canvas. That gives better pixel purity but requires re-authoring every coordinate and speed, so it is deferred.

### D6: Static sprites with a facing flip and a wobble
- Facing: `setFlipX` from the sign of horizontal velocity (keep last facing when idle).
- Walking cue: a repeating tween on `angle` (about +/-4 degrees) while velocity is non-zero, reset to 0 on stop. Rotation is used deliberately: tweening `y` or `scale` would fight the arcade body, which is synced to the sprite's position and size.
- Alternative: animate frames. Not possible with this art.

### D7: Depth by y
Set `depth = y` (sprite bottom) for the player each frame and once for static objects. The speech bubble depth moves above the y-range (a large constant) so it never sinks behind props.

### D8: Physics bodies sized explicitly
Scaling a sprite does not always rescale its arcade body the way you expect, and static bodies need `refreshBody()` after changes. Set body size/offset explicitly per frame (feet-only bodies for characters so the head can overlap objects behind, matching D7) and refresh static bodies once.

### D9: Attribution beside the assets
Add `public/assets/office/CREDITS.md` naming Chris Perich, the source page, and CC-BY 4.0, with the licence link. A public repo redistributes the PNG, so the credit file is required.

## Risks / Trade-offs

- [The pack has no back/side views, so the player looks the same walking up and down] -> Accepted; the wobble and flip carry the movement. The manifest makes upgrading later cheap.
- [Hand-measured frame rects may be a pixel off, causing clipped or bleeding sprites] -> Verify by rendering each frame in the scene once; keep rects in one file.
- [Integer scale on a 600x400 canvas leaves the art at slightly odd screen size] -> Tune the scale factor and canvas size together in the first implementation pass; D5 records the fallback.
- [`public/` ships the `.aseprite` source and the mock-up PNG in `dist/`] -> Small, but it is unnecessary weight. Consider moving them out of `public/`; not required by this change.
- [Moving `/office` into `MainLayout` inherits its width and padding rules and may squeeze the canvas] -> Check the layout's container styles in the first pass; the canvas is a fixed 600px so this should only need a wrapper style.
- [Phaser is created in an effect, so React strict-mode double-mounting can create two games] -> Existing behavior (cleanup destroys it); note only, don't change here.

## Open Questions

- Which of the six pack characters are the player, Susan and Gloria. This is a manifest edit and can be changed at any time.
