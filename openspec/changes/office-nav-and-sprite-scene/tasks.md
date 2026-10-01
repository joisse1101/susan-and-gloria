## 1. Navigation

- [x] 1.1 In `Header.tsx`, replace the `<a>` links with `Link`/`NavLink` (Chat with `end`, Office), remove the About link, and add active-state styling; verify with `npm run build` and by clicking both links in `npm run dev`
- [x] 1.2 In `App.tsx`, nest the `/office` route under `MainLayout`; verify the header shows on `/#/office` and Chat returns to the chatbot
- [x] 1.3 Check `MainLayout` container styles against the fixed 600px canvas; verify the canvas is not clipped or squeezed at desktop and narrow widths

## 2. Assets and credits

- [x] 2.1 Add `public/assets/office/CREDITS.md` (Chris Perich, source page, CC-BY 4.0 with licence link); verify the file exists and names all three
- [x] 2.2 Measure the frame rectangles for the player, Susan, Gloria, desk and the other props used from `PixelOfficeAssets.png`; verify by listing each name with its x, y, w, h in the manifest from 3.1

## 3. Atlas manifest and loading

- [x] 3.1 Create `src/utils/officeAtlas.ts` exporting the `name -> {x, y, w, h}` manifest and the atlas URL built from `import.meta.env.BASE_URL`; verify it type-checks with `npm run build`
- [x] 3.2 In `theOffice.ts`, replace the `generateTexture` code with `load.image` plus a frame-registration step driven by the manifest, and remove the unused/duplicate textures; verify the scene starts with no console errors and no `generateTexture` calls remain
- [x] 3.3 Enable `pixelArt: true` and apply the integer sprite scale; verify sprite edges are sharp in the browser

## 4. Scene behavior on the new art

- [x] 4.1 Swap the player, Susan, Gloria and desks to atlas frames with explicit body size/offset and `refreshBody()` for static bodies; verify the player collides with desks and both coworkers
- [x] 4.2 Add facing (`flipX`) and the walking wobble tween with reset on stop; verify by moving left/right and stopping
- [x] 4.3 Add y-based depth sorting and raise the speech-bubble depth above it; verify the player passes in front of and behind a desk and the bubble is never hidden
- [x] 4.4 Confirm the typing lock and speech bubble still work; verify keys do not move the player while the input is focused and a sent message appears over the player

## 5. Verification

- [x] 5.1 Run `npm run lint` and `npm run build`; verify both pass
- [ ] 5.2 Run `npm run build && npm run preview` and open `/susan-and-gloria/#/office`; verify all sprites load under the base path with no 404s in the network tab
