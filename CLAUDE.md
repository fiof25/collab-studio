# Collab AI Studio

## Product Vision
A shared visual canvas for collaborative vibe coding. Teams build HTML prototypes through AI chat,
organize them on a visual branch tree, and merge divergent work with a multi-agent system.
Non-technical contributors can participate without getting blocked by technical complexity.

## Stack
- **Frontend:** React 18, TypeScript, Tailwind CSS 3, Vite 5, Zustand 4, @xyflow/react (canvas), framer-motion
- **Backend:** Express 5 (server.js), Anthropic SDK / Google Generative AI — provider is configurable
- **AI Provider:** Set by `AI_PROVIDER` env var (`claude` or `gemini`). Claude large=`claude-opus-4-6`, small=`claude-haiku-4-5-20251001`; Gemini large=`gemini-3.1-pro-preview`, small=`gemini-3.1-flash-lite-preview`
- **Dev:** `npm run dev` starts both Vite (:5173) and Express (:3001) via concurrently
- **Path alias:** `@/*` → `src/*` (tsconfig paths + vite alias)

## Screens
Three main screens + a merge popup:
1. **Home** (`/`) — project hub, select or create projects
2. **Canvas** (`/project`) — visual branch tree (React Flow), fork/merge/organize branches
3. **Editor** (`/branch/:branchId`) — vibe coding IDE with AI chat + live preview
4. **Merge Modal** — 5-step merge flow triggered from Canvas (select → features → QA → execute → done)

## Core Concepts
- **Branches** — standalone HTML prototypes, forkable and mergeable, displayed as canvas nodes
- **Checkpoints** — immutable saved versions of a branch's code, created on each AI generation
- **Blueprints** — AI-generated structured summaries (features, tech stack, design tokens). The AI's persistent memory across sessions
- **Snapshots** — short AI-generated descriptions (8–16 words) on canvas cards, derived from chat context
- **COLLABSTUDIO.md** — system prompt for the in-app AI assistant (not for Claude Code sessions)

## Key Patterns
- SSE streaming for chat and merge progress (server → client)
- Mock mode auto-activates when the active provider's API key is missing
- Sliding context window of 8 messages for chat
- Rate limiting: blueprint (10/min), merge (5/min)
- Snapshot descriptions auto-update unless user pins them (`descriptionPinned: true`)
- Agents run server-side; blueprints are the persistent context (agent memory is ephemeral)
- All AI calls go through the server — the frontend never calls AI APIs directly
- Frontend fetches `/api/config` to know which provider/models are active (cached in `useAIConfig` hook)

## Documentation — Where to Find What

Read these docs when you need deeper context. Don't read them all upfront — pick the one relevant to your task.

| Doc | When to read it | What it covers |
|-----|----------------|----------------|
| `docs/product.md` | Building any user-facing feature | Screens, user flows, core concepts, user journey |
| `docs/architecture.md` | Need to know WHERE to put code | Stores, components by screen, hooks, routing, data flow, file map |
| `docs/ai-system.md` | Working on auto-naming, blueprints, or AI pipeline | Snapshot/Blueprint agents, useAutoBlueprint hook, chat→description pipeline |
| `docs/merge-system.md` | Working on the merge flow | Multi-agent merge architecture, MergeModal steps, agent APIs, types |
| `docs/plans/` | Historical context | Original design specs and rationale |
| `README.md` | Onboarding a human contributor | Setup, scripts, project structure overview. Update when adding new setup steps. |

**Important:** These docs are living references. When you change architecture, screens, agent behavior, or data flows,
update the relevant doc. When adding setup steps or dependencies, update `README.md`.

## Testing
- **Framework:** Vitest + @testing-library/react + jsdom
- **Run:** `npm test` (or `npx vitest run` for single pass)
- **Convention:** Tests live in `__tests__/` directories next to the code they test
- **Factories:** `src/test/factories.ts` has `createTestBranch()`, `createTestProject()`, `createTestBlueprint()`, etc.

## Theming
- Dark mode only (`darkMode: 'class'`)
- CSS custom properties for surfaces/ink/lines (rgb triplets with alpha)
- Accent palette: violet, cyan, pink, emerald, amber
- Fonts: Inter (sans), JetBrains Mono (mono)

## Environment
- `.env` (gitignored) — copy from `.env.example`
- `AI_PROVIDER` — `claude` (default) or `gemini`
- `ANTHROPIC_API_KEY` — required when `AI_PROVIDER=claude`
- `GEMINI_API_KEY` — required when `AI_PROVIDER=gemini`
