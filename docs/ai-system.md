# AI System — Auto-Naming & Blueprints

> How the AI generates context automatically — snapshot descriptions, blueprints, and chat-driven naming.
> Read this doc when working on auto-generated content, the blueprint panel, or branch card descriptions.

---

## Overview

Collab AI Studio has two layers of AI-generated context that run automatically in the background:

1. **Snapshots** — short descriptions (8–16 words) for canvas branch cards. Fast, runs on every code change.
2. **Blueprints** — deep structured analysis of each prototype. Slower, runs on creation/edit/merge.

Both are triggered by the `useAutoBlueprint` hook when it detects new checkpoints. The user never has to request them — they happen silently.

**Why this matters:** The canvas shows a tree of branches. Without auto-generated names and descriptions, users would see generic "Branch 1", "Branch 2" labels and have no idea what each prototype does. Snapshots and blueprints make the tree navigable and meaningful.

---

## AI Provider Configuration

The server supports two AI providers, selected by the `AI_PROVIDER` environment variable. All agents use the same provider.

### Model Mapping

| Provider | `large` model | `small` model | API key env var |
|----------|--------------|--------------|----------------|
| `claude` (default) | `claude-opus-4-6` | `claude-haiku-4-5-20251001` | `ANTHROPIC_API_KEY` |
| `gemini` | `gemini-3.1-pro-preview` | `gemini-3.1-flash-lite-preview` | `GEMINI_API_KEY` |

Agents (blueprint, snapshot, scout, merge) use `config.models.small`. Chat uses `config.models.large`.

### Config Flow

```
.env (AI_PROVIDER + API key)
  └→ server/config/models.js   — exports config.provider, config.apiKey (lazy getter), config.models
       ├→ server/agents/tools.js       — callModel() / callClaude() branch by config.provider
       │   └→ server/providers/gemini.js  — callGemini() / streamGemini() (Gemini adapter)
       ├→ server/agents/*.js           — use config.models.small
       ├→ server/routes/*.js           — use config.apiKey
       └→ server.js                    — GET /api/config exposes { provider, models, mock }
            └→ src/hooks/useAIConfig.ts   — fetches /api/config, cached module-level
                 └→ src/components/ide/ChatInput.tsx  — shows active model name
```

### `/api/config` Endpoint

`GET /api/config` returns the active configuration to the frontend:

```json
{
  "provider": "claude",
  "models": { "large": "claude-opus-4-6", "small": "claude-haiku-4-5-20251001" },
  "mock": false
}
```

`mock: true` when the active provider's API key is not set.

### Gemini Adapter (`server/providers/gemini.js`)

Translates Anthropic message format to Gemini's format:
- `assistant` role → `model` role
- Text strings → `[{ text }]` parts
- Base64 images → `inlineData` parts
- System prompt → `systemInstruction` field on the model
- Exports `callGemini()` (non-streaming) and `streamGemini()` (async generator)

---

## Snapshot Agent — Auto-Naming

**File:** `server/agents/snapshotAgent.js`
**Route:** `POST /api/blueprint/snapshot`
**Model:** `config.models.small` (haiku-class)

Generates a concise description for each branch card on the canvas. The description appears directly on the node and helps users scan the tree quickly.

### Three Fallback Strategies

The agent tries these in order, using the best available context:

| Priority | Strategy | Input | When used |
|----------|----------|-------|-----------|
| 1 | **Conversation context** | Latest chat messages (`userPrompt` + `aiSummary`) | When the user has been chatting — uses the conversation to understand intent |
| 2 | **Vision** | Screenshot of the preview (`screenshotBase64`) | When no chat context but a visual preview is available |
| 3 | **Code analysis** | HTML source via regex patterns | Fallback — extracts title tags, headings, key elements |

**Why conversation context is preferred:** The chat history captures the user's *intent*, not just what the code looks like. If a user says "make me a landing page for a pet adoption app," the snapshot should reflect that purpose — not just describe the HTML elements.

### Output

- 8–16 word description
- Written to `branch.description` via `updateBranch()`
- Displayed on the canvas `BranchNode` card

### Pinning

Users can manually edit a branch's description on the canvas. When they do, `branch.descriptionPinned` is set to `true`, and the Snapshot Agent will skip that branch on future auto-updates. This lets users override AI descriptions when they want specific labels.

---

## Blueprint Agent — Structured Analysis

**File:** `server/agents/blueprintAgent.js`
**Route:** `POST /api/blueprint/generate`
**Model:** `config.models.small` (haiku-class)

Performs deep analysis of a branch's code and produces a structured JSON summary. This is the AI's persistent memory — blueprints power the merge system and help users understand complex prototypes.

### What a Blueprint Contains

```typescript
interface Blueprint {
  title: string;           // What the prototype is
  summary: string;         // 2-3 sentence overview
  purpose: string;         // Why it exists
  techStack: string[];     // Libraries, frameworks detected
  fileStructure: FileEntry[];  // File tree with descriptions
  features: BlueprintFeature[];  // Identified features with visual regions
  designTokens: Record<string, string>;  // Colors, fonts, spacing
  changeHistory: string[];    // Ordered list of modifications
  mergeHistory?: MergeRecord[];  // Audit trail of merges
  raw: string;             // Full text response from Claude
  generatedAt?: number;    // Timestamp
}
```

### Features with Visual Regions

Each blueprint feature can have a `visualRegion` — a CSS selector and label that maps the feature to a part of the preview DOM:

```typescript
interface BlueprintFeature {
  id: string;
  name: string;
  description: string;
  files: string[];          // Which files implement this feature
  dependencies: string[];   // Other feature IDs this depends on
  visualRegion?: {
    selector: string;       // CSS selector (e.g., ".hero-section")
    label: string;          // Human-readable label
  };
}
```

These visual regions power the `FeatureOverlay` component in the MergeModal — users click on visual regions to select which features to merge.

### Blueprint in the Editor

The `BlueprintPanel` component (right panel tab in the Editor) displays the blueprint in a structured, readable format:
- Feature list with descriptions
- Tech stack tags
- Design tokens (colors, fonts)
- File structure

---

## useAutoBlueprint Hook

**File:** `src/hooks/useAutoBlueprint.ts`
**Used in:** Editor screen (BranchPage)

This hook watches for new checkpoints on any branch and automatically triggers both agents:

### Trigger Logic

1. Detects when a branch's latest checkpoint ID changes
2. Tracks `Map<branchId, lastCheckpointId>` to prevent duplicate requests
3. Staggered 600ms delay per branch to avoid thundering herd on rapid edits

### What It Calls

```
New checkpoint detected
  ├→ POST /api/blueprint/snapshot
  │   → response.description
  │   → updateBranch(branchId, { description }) (if not pinned)
  │
  └→ POST /api/blueprint/generate
      → response.blueprint
      → updateBlueprint(branchId, blueprint)
```

### Error Handling

- Both calls are fire-and-forget — failures don't block the user
- Rate limiting (429) is handled gracefully with retry-after
- Mock mode returns hardcoded responses when no API key is set

---

## Chat → Snapshot Pipeline

The most interesting data flow is how chat conversations feed into canvas descriptions:

```
User chats in Editor
  → AI responds with code
  → New checkpoint created
  → useAutoBlueprint fires
  → Snapshot Agent receives:
      - branchName
      - files (code)
      - userPrompt (latest user message)
      - aiSummary (latest AI response summary)
  → Agent prioritizes conversation context
  → Generates description focused on user's intent
  → Canvas card updates with meaningful label
```

**Example flow:**
1. User opens a branch and types: "Build a dashboard for tracking pet adoption applications"
2. AI generates HTML with charts and tables
3. Snapshot Agent sees the chat context and generates: "Pet adoption tracking dashboard with application status charts"
4. The canvas card now shows this description instead of something generic

This is designed so that even teammates who weren't in the chat session can understand what each branch does by looking at the canvas.

---

## Mock Mode

When the active provider's API key is not set (i.e., `ANTHROPIC_API_KEY` for Claude, `GEMINI_API_KEY` for Gemini), both agents return mock data:
- **Snapshot:** Returns truncated prompt text or a generic fallback description
- **Blueprint:** Returns a hardcoded sample with 3 features

The frontend knows it is in mock mode via `useAIConfig().mock === true`.

This enables frontend development and testing without API costs.

---

## Relationship to Merge System

Blueprints are the foundation of intelligent merging:

1. **Feature identification** — Blueprint features become selectable items in the merge flow
2. **Visual regions** — Feature selectors power the FeatureOverlay click targets
3. **Conflict detection** — Scout Agent compares blueprints of both branches to identify overlapping features
4. **Design token merging** — Design tokens help the Merge Agent reconcile styling differences
5. **Audit trail** — `MergeRecord` is appended to the new branch's blueprint

For the full merge pipeline, see `docs/merge-system.md`.

---

## Key Files

| File | Purpose |
|------|---------|
| `server/config/models.js` | Provider config — reads `AI_PROVIDER`, exports `config.provider`, `config.apiKey`, `config.models` |
| `server/providers/gemini.js` | Gemini adapter — `callGemini()` (non-streaming), `streamGemini()` (async generator) |
| `server/agents/tools.js` | `callModel()` / `callClaude()` — routes to Claude or Gemini based on provider |
| `server/agents/snapshotAgent.js` | Snapshot Agent implementation |
| `server/agents/blueprintAgent.js` | Blueprint Agent implementation |
| `server/routes/blueprint.js` | Routes: `/api/blueprint/generate`, `/api/blueprint/snapshot` |
| `src/hooks/useAIConfig.ts` | Fetches `/api/config`; returns `{ provider, models, mock }` — module-level cached |
| `src/hooks/useAutoBlueprint.ts` | Auto-trigger hook |
| `src/components/ide/BlueprintPanel.tsx` | Blueprint display in Editor |
| `src/components/ide/ChatInput.tsx` | Shows active model name from `useAIConfig` |
| `src/components/canvas/BranchNode.tsx` | Where snapshot descriptions are rendered |
| `src/types/blueprint.ts` | Blueprint, BlueprintFeature, MergeRecord types |
| `src/utils/generateDescription.ts` | Utility helpers for description generation |
