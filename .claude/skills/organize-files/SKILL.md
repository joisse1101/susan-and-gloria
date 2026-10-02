---
name: organize-files
description: Decide where files belong in this repo and tidy/refactor the layout. Use when adding a new file, splitting a large file, removing dead assets, or asked to "clean up", "organise" or "refactor" the project structure.
---

# Organising files in susan-and-gloria

Rule of thumb: **group by feature/domain, not by file type; one responsibility per file; keep each folder's contents obvious from its name.** Split a file when it passes roughly 300 lines or mixes concerns (e.g. map loading inside a scene class).

## Where things go

| Path | What belongs here | Why |
|---|---|---|
| `src/agents/` | LangGraph graph, orchestrator, agent factory, personas, `llm.ts` | All LLM/agent logic in one place; `llm.ts` stays the only spot with model config. |
| `src/tools/` | LangChain tools (`webSearch.ts`) | Tools are reusable by any agent and independent of the graph. |
| `src/pages/` | Route-level components (`Home`, `TheOffice`) | One file per route; keeps routing in `App.tsx` simple. |
| `src/layouts/` | Wrappers shared by several routes (`MainLayout`) | Separates page chrome from page content. |
| `src/components/` | Small reusable UI pieces (`Header`, `Footer`) | Anything used by more than one page. Page-only pieces stay next to the page. |
| `src/styles/` | SCSS partials (`_component_*`, `_core_*`, `_the_office`), imported from `main.scss` | Styles live apart from TSX; the prefix says whether a partial is global, a component, or a page. |
| `src/game/office/` | Phaser game for `/office`; React must only touch it via `OfficeGame`'s API | Keeps the game engine isolated from React. |
| `src/game/office/OfficeScene.ts` | Scene wiring: `preload`/`create`/`update`, input, NPC bubbles | Orchestrates the pieces below; avoid adding self-contained logic here. |
| `src/game/office/map/` | Tilemap loading and tile-derived collision (`loadOfficeMap.ts`) | Pure map logic with no scene state, so it is testable and keeps the scene small. |
| `src/game/office/atlases/` | Frame rectangles per spritesheet + `types.ts` | Data only; edited when art changes, never when behaviour changes. |
| `src/game/office/furniture/` | Interactive furniture behaviour (`Chairs.ts`) | One class per kind of object. |
| `src/game/office/interaction/{npc,player}/` | Behaviours split by who performs them, plus shared data (`workPhrases.ts`) | NPC and player logic evolve separately. |
| `src/game/office/constants.ts` | Sizes, depths, scale, camera values | One source for tunables; no magic numbers in classes. |
| `public/assets/` | Runtime-loaded images/maps (Phaser loads by URL), with `CREDITS.md` | Files in `public/` are served as-is under the Vite `base`; reference them via `import.meta.env.BASE_URL`. |
| `public/assets/office/` | Spritesheets for the office scene, plus `CREDITS.md` | One folder per game area. Every third-party sheet needs a credits entry (author, source, licence); original art says so and names its generator. |
| `public/assets/map/office/` | Tiled/Sprite Fusion export (`map.json`, `spritesheet.png`) | Kept apart from sprite sheets because it is re-exported as a pair; replace both files together. |
| `public/favicon.svg` | Site icon referenced from `index.html` | Only files referenced by name from `index.html` or Phaser loaders belong in `public/`. |
| `src/assets/` | Only assets imported by code/CSS (bundled & hashed) | Keep empty rather than leaving unused template files. |
| `docs/` | Reference images/notes for humans (e.g. atlas preview) | Not shipped in the bundle. |
| `pixel-art/` | Source scripts that generate art | Source of truth for art that ends up in `public/assets/`. |
| `openspec/` | Specs and change proposals | Managed by the opsx skills; don't hand-edit archived changes. |

## Checklist when refactoring

1. `git ls-files` and `grep` for a file's name before deleting it; remove only files with zero references (Vite template leftovers like `hero.png`, `react.svg`, `vite.svg` were removed this way).
2. Extract by moving code verbatim into a function/class; pass dependencies (scene, groups, callbacks) as arguments rather than reaching into scene fields.
3. Keep module-level constants with the code that uses them; shared ones go in `constants.ts`.
4. Update `CLAUDE.md` when a file is added, moved or removed.
5. Verify with `npm run build` and `npm run lint` (there are no tests).

## Known candidates for future splits

- `OfficeScene.ts` (~400 lines): in-game chat input (`onKeyDown`, `renderChat`, `displaySpeechBubble`) could move to `interaction/player/Chat.ts`; NPC wandering (`updateWander`) could move to `interaction/npc/Wander.ts`.

## Interactions (`src/game/office/interaction/`)

Anything the characters *do* or *show* goes here, split by actor: `npc/` (work, thinking, `NpcBubbles` speech bubbles) and `player/` (`PlayerWork`, future chat). Shared data such as `workPhrases.ts` sits at the folder root. Furniture that reacts to the player (chairs) is not an interaction: it lives in `furniture/`.

Pattern: each interaction is a class built with `(scene, host)`, where `host` is a small interface of callbacks the scene supplies. The class never reaches into scene fields, and the scene only wires and delegates. Follow `NpcBubbles` / `WorkInteraction` when adding one.
