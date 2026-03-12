# Architecture Reference

> How the app is built — stores, components, hooks, routing, data flow.
> Read this doc when you need to know WHERE to put code and HOW things connect.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS 3, Vite 5 |
| State | Zustand 4 (multiple stores) |
| Canvas | @xyflow/react (React Flow) |
| Animation | framer-motion |
| Backend | Express 5 (`server.js`) |
| AI | Anthropic SDK or Google Generative AI — provider selected by `AI_PROVIDER` env var |
| Dev | `npm run dev` → concurrently runs Vite (:5173) + Express (:3001) |

**Path alias:** `@/*` → `src/*` (configured in tsconfig + vite)

---

## Routing

```typescript
// src/App.tsx
/                    → HomePage      (project hub)
/project             → CanvasPage    (branch tree canvas)
/branch/:branchId    → BranchPage    (vibe coding editor)
*                    → redirect to /
```

**Navigation patterns:**
- `HomePage` → click project card → `loadProject()` + navigate `/project`
- `HomePage` → "New project" → navigate `/project`
- `CanvasPage` → click branch node → navigate `/branch/:branchId`
- `CanvasPage` → "New Root" → `createRootBranch()` + navigate `/branch/:id`
- `BranchPage` → back button → navigate `/project`

---

## Stores (`src/store/`)

### useProjectStore — Source of Truth

The central store. Manages all project and branch data.

**Key state:** `project: Project | null`, `branches` (derived from project)

**Branch operations:**
- `loadProject(project)` — load project, compute tree layout
- `createBranch(parentId, name, desc)` — fork (copies parent's latest checkpoint)
- `createRootBranch(name, desc)` — create standalone branch
- `updateBranch(id, patch)` — modify metadata (name, description, status, position, color)
- `deleteBranch(id)` — soft-delete with cascade to descendants
- `restoreBranch(branch)` — undo deletion
- `getBranchById(id)`, `getChildBranches(parentId)`, `getAncestorChain(id)` — queries

**Comments:**
- `addComment(branchId, content, author, position?)` — position is `{x, y}` percentages on preview
- `resolveComment(branchId, commentId)` — toggle resolved
- `addReply(branchId, commentId, content, author)`

**Blueprint:**
- `updateBlueprint(branchId, blueprint)` — store AI-generated blueprint

**Project:**
- `renameProject(name)` — update project name

### useCanvasStore — Canvas View State

**State:** `viewport: {x, y, zoom}`, `hoveredNodeId`, `previewPopupBranchId`, `fitViewTrigger`, `blendTargetId`

Controls canvas pan/zoom, hover preview popups, and which branch is highlighted during merge selection.

### useChatStore — Chat Threads

**State:** `threads: Record<string, ChatMessage[]>` (per-branch message arrays), `isStreaming`

- `addUserMessage(branchId, content)` — add user message
- `startAssistantMessage(branchId)` → `appendChunk()` → `finalizeMessage()` — streaming flow
- `getThread(branchId)` — query messages

### useUIStore — UI Transients

**State:** `activeModal`, `activeBranchId`, `hoveredBranchId`, `panel`, `toasts[]`, `taskPanelOpen`, `commentsPanelOpen`, `globalCommentsPanelOpen`, `lastUndo`

Controls which modal is open, side panel visibility, toast notifications, and undo callbacks.

### useProjectsStore — Multi-Project Library

**State:** `projects: Project[]`

- `addProject(project)` — add to library
- Ships with `emptyCollabProject` (template) and `mockProject` (demo data)

### useThemeStore — Theme

Always dark mode. Light mode was removed.

---

## Components by Screen

### Home Screen (`src/pages/HomePage.tsx`)

```
HomePage
├── Left Sidebar
│   ├── Profile section (avatar, name, bio)
│   └── Online collaborators list
└── Main Content
    ├── "New project" button
    └── Project cards grid (GradientCard)
        └── Scaled iframe preview + metadata
```

### Canvas Screen (`src/pages/CanvasPage.tsx`)

```
CanvasPage
├── TopNav (editable project name, "New Root", global comments)
├── ProjectCanvas (React Flow wrapper)
│   ├── BranchNode[] (240×240 cards with preview, name, actions)
│   ├── BranchEdge[] (parent→child connections, merge edges)
│   ├── BranchPreviewPopup (enlarged hover preview)
│   └── CanvasToolbar (zoom controls)
├── MergeModal (5-step merge flow — see docs/merge-system.md)
│   └── FeatureOverlay (visual feature selection)
└── GlobalCommentsPanel (slide-out panel, all unresolved comments)
```

**BranchNode hover actions:** edit name, fork, merge, delete
**BranchNode indicators:** checkpoint count badge, comment count badge

### Editor Screen (`src/pages/BranchPage.tsx`)

```
BranchPage
├── TopNav
│   ├── BranchBreadcrumb (ancestry chain)
│   └── BranchActions (fork, merge, delete)
└── IDELayout (two-column)
    ├── ChatPanel (left)
    │   ├── ChatMessage[] (with code revert buttons)
    │   └── ChatInput (prompt input)
    └── PreviewPanel (right)
        ├── Live iframe preview
        │   ├── Device controls (desktop/tablet/mobile)
        │   └── Comment pinning overlay
        └── Tabs
            ├── Code → CodeViewer
            ├── Blueprint → BlueprintPanel
            └── Comments → CommentsPanel
```

### Shared Components (`src/components/shared/`)

`TopNav`, `Modal`, `Button`, `Toast`, `Badge`, `Avatar`, `TaskPanel` (version history sidebar), `GradientCard`

---

## Hooks (`src/hooks/`)

| Hook | Purpose | Used in |
|------|---------|---------|
| `useAutoBlueprint` | Auto-triggers blueprint + snapshot generation when checkpoints change | Editor screen |
| `useAIConfig` | Fetches `/api/config` (provider, models, mock flag); module-level cached | ChatInput, anywhere model name is shown |
| `useBranchTree` | Memoized React Flow nodes + edges from project state | Canvas screen |
| `useChatStream` | SSE client for `/api/chat` (streaming AI responses via server) | Editor screen |
| `useMergeStream` | SSE client for Scout + Merge agent communication | MergeModal |
| `useKeyboardShortcuts` | Global keyboard shortcuts (Escape, etc.) | App-wide |

---

## Server Architecture

### Entry Point (`server.js`)

Express 5 server. Loads `COLLABSTUDIO.md` as the system prompt for the in-app chat AI. On startup, logs the active AI provider and model. CORS accepts any localhost port.

**Routes:**
- `POST /api/chat` — SSE streaming chat (branches between Claude SDK stream and Gemini async generator)
- `GET /api/config` — returns `{ provider, models: { large, small }, mock }` to the frontend
- `/api/blueprint/*` — blueprint and snapshot generation (rate-limited: 10/min)
- `/api/merge/*` — scout analysis and merge execution (rate-limited: 5/min)

### Provider Config (`server/config/`)

| File | Purpose |
|------|---------|
| `models.js` | Reads `AI_PROVIDER` env var; exports `config` with `provider`, `apiKey` (lazy getter), and `models: { large, small }` |

### AI Providers (`server/providers/`)

| File | Purpose |
|------|---------|
| `gemini.js` | Gemini adapter — `callGemini()` (non-streaming), `streamGemini()` (async generator SSE). Normalizes Anthropic message format to Gemini parts format. |

### Agent System (`server/agents/`)

Four specialized agents — see `docs/ai-system.md` for the auto-naming system and `docs/merge-system.md` for the merge pipeline.

| File | Agent | Purpose |
|------|-------|---------|
| `blueprintAgent.js` | Blueprint Agent | Deep code analysis → structured JSON |
| `snapshotAgent.js` | Snapshot Agent | Quick description for canvas cards |
| `scoutAgent.js` | Scout Agent | Read-only merge analysis + conflict questions |
| `mergeAgent.js` | Merge Agent | Execute merge plan (only agent with write permissions) |
| `tools.js` | Shared tools | `readFile()`, `listFiles()`, `searchCode()`, `callModel()` / `callClaude()` (provider-aware) |
| `memory.js` | Agent memory | Ephemeral per-operation `Map` store |

### Routes (`server/routes/`)

| File | Endpoints |
|------|-----------|
| `blueprint.js` | `POST /api/blueprint/generate`, `POST /api/blueprint/snapshot` |
| `merge.js` | `POST /api/merge/start` (SSE), `POST /api/merge/execute` (SSE), `POST /api/merge/prompts` |

### Middleware (`server/middleware/`)

| File | Purpose |
|------|---------|
| `rateLimit.js` | Per-IP rate limiting (429 + Retry-After header) |

---

## Data Flow

### Chat → Code → Auto-context

```
User types in ChatPanel
  → useChatStream sends to /api/chat (SSE)
  → Claude streams response
  → If code generated: new BranchCheckpoint created
  → useAutoBlueprint detects new checkpoint
    ├→ POST /api/blueprint/snapshot → updates branch.description (canvas card text)
    └→ POST /api/blueprint/generate → updates branch.blueprint (structured analysis)
```

### Merge Flow

```
User selects 2 branches on Canvas
  → MergeModal opens (step: select)
  → User picks base branch (step: features)
  → User selects features from contributor + writes instructions
  → Quick Merge: POST /api/merge/execute directly
  → Full Flow: POST /api/merge/start (Scout) → Q&A → POST /api/merge/execute
  → New branch created with mergeParentIds + MergeRecord
  → Blueprint + Snapshot agents fire on the new branch
```

---

## Key Data Types (`src/types/`)

| File | Key types |
|------|-----------|
| `branch.ts` | `Project`, `Branch`, `BranchCheckpoint`, `BranchStatus`, `Comment`, `Collaborator`, `ProjectFile` |
| `blueprint.ts` | `Blueprint`, `BlueprintFeature`, `FileEntry`, `MergeRecord`, `MergePlanStep` |
| `canvas.ts` | `BranchNodeData`, `BranchEdgeData`, `CanvasBranchNode`, `ViewportState` |
| `chat.ts` | `ChatMessage` (role, content, streaming status, codeGenerated flag) |
| `ui.ts` | `ModalType`, `PanelState`, `ToastPayload`, `UIState` |

---

## Theming

- Dark mode only (`darkMode: 'class'`)
- CSS custom properties using RGB triplets with alpha:
  - Surfaces: `--surface-1`, `--surface-2`, `--surface-3`
  - Text: `--ink-primary`, `--ink-secondary`, `--ink-muted`
  - Borders: `--line`, `--line-accent`
- Accent palette: `accent-violet`, `accent-cyan`, `accent-pink`, `accent-emerald`, `accent-amber`
- Fonts: Inter (sans), JetBrains Mono (mono)

---

## Key Patterns

- **SSE streaming** for chat and merge progress (server → client via EventSource)
- **Mock mode** auto-activates when the active provider's API key is missing — all agent routes return hardcoded data
- **Sliding context window** of 8 messages for chat (prevents token bloat)
- **Rate limiting** on agent routes (blueprint: 10/min, merge: 5/min per IP)
- **Agents run server-side** and communicate via shared branch data and direct handoffs — no inter-agent messaging protocol
- **Checkpoints are immutable** — new code creates a new checkpoint, old ones remain for revert
- **Descriptions can be pinned** — `branch.descriptionPinned: true` prevents auto-update by Snapshot Agent

---

## Testing

- **Framework:** Vitest + @testing-library/react + jsdom
- **Run:** `npm test` or `npx vitest run`
- **Convention:** `__tests__/` directories next to the code they test
- **Factories:** `src/test/factories.ts` — `createTestBranch()`, `createTestProject()`, `createTestBlueprint()`, etc.

---

## File Map

```
src/
├── pages/                    # 3 route pages
│   ├── HomePage.tsx
│   ├── CanvasPage.tsx
│   └── BranchPage.tsx
├── components/
│   ├── canvas/               # Canvas screen components
│   │   ├── ProjectCanvas.tsx
│   │   ├── BranchNode.tsx
│   │   ├── BranchEdge.tsx
│   │   ├── BranchPreviewPopup.tsx
│   │   ├── MergeModal.tsx
│   │   ├── FeatureOverlay.tsx
│   │   ├── GlobalCommentsPanel.tsx
│   │   └── CanvasToolbar.tsx
│   ├── ide/                  # Editor screen components
│   │   ├── IDELayout.tsx
│   │   ├── ChatPanel.tsx
│   │   ├── ChatInput.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── PreviewPanel.tsx
│   │   ├── CodeViewer.tsx
│   │   ├── BlueprintPanel.tsx
│   │   ├── CommentsPanel.tsx
│   │   ├── CommentsModal.tsx
│   │   ├── BranchBreadcrumb.tsx
│   │   └── BranchActions.tsx
│   └── shared/               # Reusable UI
│       ├── TopNav.tsx
│       ├── Modal.tsx
│       ├── Button.tsx
│       ├── Toast.tsx
│       ├── Badge.tsx
│       ├── Avatar.tsx
│       ├── TaskPanel.tsx
│       └── GradientCard.tsx
├── store/                    # Zustand stores
│   ├── useProjectStore.ts
│   ├── useCanvasStore.ts
│   ├── useChatStore.ts
│   ├── useUIStore.ts
│   ├── useProjectsStore.ts
│   └── useThemeStore.ts
├── hooks/                    # Custom hooks
│   ├── useAutoBlueprint.ts
│   ├── useAIConfig.ts        # Fetches /api/config; cached
│   ├── useBranchTree.ts
│   ├── useChatStream.ts
│   ├── useMergeStream.ts
│   └── useKeyboardShortcuts.ts
├── types/                    # TypeScript types
│   ├── branch.ts
│   ├── blueprint.ts
│   ├── canvas.ts
│   ├── chat.ts
│   └── ui.ts
├── utils/                    # Utilities
│   ├── branchUtils.ts
│   ├── colorUtils.ts
│   ├── dateUtils.ts
│   ├── generateDescription.ts
│   ├── captureScreenshot.ts
│   └── idUtils.ts
└── test/                     # Test utilities
    └── factories.ts

server/
├── server.js                 # Express entry point + GET /api/config
├── config/
│   └── models.js             # AI_PROVIDER config — provider, apiKey, models.large/small
├── providers/
│   └── gemini.js             # Gemini adapter (callGemini, streamGemini)
├── agents/
│   ├── blueprintAgent.js
│   ├── snapshotAgent.js
│   ├── scoutAgent.js
│   ├── mergeAgent.js
│   ├── tools.js              # callModel() / callClaude() — provider-aware
│   └── memory.js
├── routes/
│   ├── blueprint.js
│   └── merge.js
└── middleware/
    └── rateLimit.js
```
