# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server (also serves the DuckDuckGo proxy, see below)
- `npm run build` — `tsc -b && vite build` (type-check then bundle to `dist/`)
- `npm run lint` — ESLint
- `npm run preview` — serve the built bundle

There is no test runner configured.

## Architecture

A client-only React 19 + TypeScript + Vite app (SCSS styles, `HashRouter`) deployed to GitHub Pages via `.github/workflows/deploy.yml` on push to `main`. `vite.config.ts` sets `base: '/susan-and-gloria/'`.

There is no backend: the LLM calls run **in the browser** against a local Ollama server.

### Agent pipeline (`src/agents/`)
- `agentGraph.ts` — LangGraph `StateGraph`: `START → orchestrator → (conditional on state.targetAgent) → susan | gloria → END`. Exports the compiled `appGraph`. Shared state includes `onToken` / `onRoute` callbacks that the UI passes in via `appGraph.invoke({...})` (see `pages/Home.tsx`) to stream tokens and learn which persona was routed to.
- `theGreatOne.ts` — the orchestrator node. It asks the LLM to reply with a single word and routes to `gloria` if the output contains "gloria", otherwise defaults to `susan`. Routing options are built from `PERSONAS[*].whyMe`.
- `agents.ts` — `createAgentNode(persona)` factory: builds messages as `GUARDRAIL` + persona system prompt + history + user input, streams the response, and calls `state.onToken`. Returns updated `messages` history (note the reducer replaces the array rather than appending).
- `personas.ts` — `GUARDRAIL` (safety rules that override personas) and `PERSONAS` (system prompt + `whyMe` per persona). Adding a persona requires updating the `createAgentNode` type union, the graph nodes/edges, and the orchestrator's fallback parsing in `theGreatOne.ts`, which hardcodes `gloria`/`susan`.
- `llm.ts` — `createLLM()` is the single place for LLM config (`ChatOpenAI` pointed at `http://localhost:11434/v1`, model `llama3.1:8b`, key `"ollama"`). Ollama must be running locally for chat to work.

### Tools (`src/tools/webSearch.ts`)
LangChain `web_search` tool that fetches `/api/duckduckgo/html/?q=...` and parses results with `DOMParser`. That path only exists via the **Vite dev-server proxy** (`server.proxy` in `vite.config.ts`) — it will not work in the deployed GitHub Pages build.

### The Office (`src/pages/TheOffice.tsx`, `src/utils/theOffice.ts`)
A Phaser 4 mini-game mounted at `/office` (outside `MainLayout`). `OfficeGame` wraps `Phaser.Game`/`OfficeScene` and exposes a small imperative API (`setTyping`, `showPlayerSpeech`, `destroy`) that the React page calls via a ref; the React `<input>` toggles `setTyping` on focus/blur so movement keys are disabled while typing. Textures are generated procedurally in `preload()` (no image assets). Susan and Gloria appear as static sprites but are not yet wired to the agent graph.
