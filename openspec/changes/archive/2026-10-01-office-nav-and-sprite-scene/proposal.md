## Why

The Office game at `/#/office` is unreachable from the UI (nothing links to it), the header nav contains dead plain `<a href>` links, and the scene is built from generated coloured squares. A pixel-art asset pack (Chris Perich's 32x32 office pack, CC-BY 4.0) is now in `public/assets/office/`, so the scene can be moved onto real art and the game made discoverable.

## What Changes

- Header nav is replaced with router `NavLink`s: Chat (`/`) and Office (`/office`). The dead `/about/` link is removed.
- The `/office` route moves inside `MainLayout` so the header and a way back to the chat are present.
- `OfficeScene.preload()` loads `PixelOfficeAssets.png` as a single texture and registers named frames from a manifest (frame name -> x, y, w, h) instead of `generateTexture` squares.
- The player, Susan and Gloria render as static sprites from the atlas. Facing uses `flipX`; walking is a small bob tween. Sprites depth-sort by y.
- Desks and other props in the scene use atlas frames.
- Pixel-art rendering is enabled (`pixelArt: true`) with a chosen base resolution and zoom.
- Asset URLs are built from `import.meta.env.BASE_URL` so they resolve on GitHub Pages.
- Add `public/assets/office/CREDITS.md` with the CC-BY 4.0 attribution.
- Out of scope: walk-cycle animation, Tiled maps, wiring NPCs to `appGraph`, proximity chat, custom art.

## Capabilities

### New Capabilities
- `office-navigation`: the Office page is reachable from site navigation and can return to the chat.
- `office-sprite-scene`: the Office scene renders from a manifest-driven pixel-art atlas with static sprites.

### Modified Capabilities

None (`openspec/specs/` is empty).

## Impact

- `src/App.tsx`, `src/components/Header.tsx`, `src/pages/TheOffice.tsx`, `src/utils/theOffice.ts`
- New: atlas manifest module, `public/assets/office/CREDITS.md`
- Assets already present: `PixelOfficeAssets.png`, `PixelOfficeAssets.aseprite`, `PixelOffice.png` (reference mock-up only)
- No new dependencies.
