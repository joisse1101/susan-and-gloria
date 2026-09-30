# Susan & Gloria

A small emotional-support chat app with two AI companions:

- **Susan** — high-energy hype-woman. Passionate outrage on your behalf, drama and humor to make stress feel lighter.
- **Gloria** — grounded, maternal comfort. Blunt, no-nonsense honesty and practical self-care advice.

You type a message and an orchestrator ("The Great One") reads your emotional state and routes you to whichever persona fits best. The reply streams back token by token. There is also an experimental mini-game, **The Office**, where you walk around as a blue square next to Susan and Gloria.

Both companions are entertainment and emotional-support characters, not a substitute for professional help. A guardrail prompt keeps them clean, and it tells them to point users to crisis resources if needed.

## How it works

Everything runs in the browser, with no backend. The chat is a [LangGraph](https://langchain-ai.github.io/langgraphjs/) graph (`orchestrator → susan | gloria`) that calls a local [Ollama](https://ollama.com) model through its OpenAI-compatible API. The UI is React 19 + Vite, and The Office is built with Phaser.

## Setup

### Prerequisites

- [Node.js](https://nodejs.org) 24 (what CI uses)
- [Ollama](https://ollama.com/download) installed and running

### Steps

1. Pull the model the app expects:

   ```sh
   ollama pull llama3.1:8b
   ```

2. Make sure Ollama is serving on `http://localhost:11434` (it does by default once installed or after `ollama serve`).

3. Install dependencies and start the dev server:

   ```sh
   npm install
   npm run dev
   ```

4. Open the URL Vite prints (under `/susan-and-gloria/`).
   - Chat: `/#/`
   - The Office: `/#/office`

To use a different model or Ollama host, edit `src/agents/llm.ts`.

### Other commands

| Command           | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run build`   | Type-check and build to `dist/`           |
| `npm run preview` | Serve the production build                |
| `npm run lint`    | Run ESLint                                |

## Deployment

Pushes to `main` build and deploy to GitHub Pages via `.github/workflows/deploy.yml`. The deployed site is static, so chat only works for visitors who have Ollama running locally, and the browser must allow requests to it (Ollama may need `OLLAMA_ORIGINS` set to include the site's origin).
