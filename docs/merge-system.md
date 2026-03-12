# Merge System Architecture

> Living reference for the blueprint-powered merge system. Keep this in sync with the code.
> For the original design rationale and problem analysis, see `docs/plans/2026-03-04-blueprint-merge-system.md`.

**Last updated:** 2026-03-11

---

## How Merging Works (End-to-End)

```
Canvas: user selects 2 branches
         │
         ▼
┌─────────────────┐
│  MergeModal      │  Step: select
│  Choose base     │  User picks which branch is the foundation
└────────┬────────┘
         │ Next
         ▼
┌─────────────────┐
│  Feature Select  │  Step: features
│  FeatureOverlay  │  Visual feature picking on contributor preview
│  + checklist     │  Optional merge instructions textarea
│  + AI prompts    │  AI-suggested merge instructions from /api/merge/prompts
└────┬───────┬────┘
     │       │
Quick Merge  │ Analyze & Review
     │       │
     │       ▼
     │  ┌─────────────────┐
     │  │  Scout Agent     │  Step: qa
     │  │  /api/merge/start│  SSE stream → plan + questions
     │  │  Q&A + plan view │  User answers conflict questions
     │  └────────┬────────┘
     │           │ Merge
     ▼           ▼
┌─────────────────────┐
│  Merge Agent         │  Step: executing
│  /api/merge/execute  │  SSE stream → progress lines
│  Creates child branch│  Blueprint + Snapshot agents fire post-merge
└────────┬────────────┘
         │
         ▼
┌─────────────────┐
│  Done            │  Step: done
│  Navigate to     │  New branch with mergeParentIds + MergeRecord
│  new branch      │
└─────────────────┘
```

There are **two merge paths**:

1. **Quick Merge** — from the features step, skips Scout analysis. Calls `/api/merge/execute` directly with empty plan. Good for simple single-file merges.
2. **Full Flow** — features → Scout analysis (qa step) → plan review → questions → execute. Better for complex merges with conflicts.

Both paths create a `MergeRecord` on the new branch's blueprint for audit trail.

---

## The Four Agents

### 1. Blueprint Agent

Maintains structured BLUEPRINT JSON for every branch — the AI's persistent memory.

| | |
|---|---|
| **File** | `server/agents/blueprintAgent.js` |
| **Route** | `POST /api/blueprint/generate` (`server/routes/blueprint.js`) |
| **Trigger** | Branch creation, code edit, post-merge (via `useAutoBlueprint` hook) |
| **Input** | `{ branchId, branchName, parentBranchName?, files }` |
| **Output** | `{ success, blueprint }` — structured JSON with title, summary, features, designTokens, etc. |
| **Model** | `config.models.small` (haiku-class per active provider) |
| **Tools used** | `callModel()` / `callClaude()`, `listFiles()`, `clearMemory()` |

The blueprint includes:
- `features[]` — each with id, name, description, files, dependencies, optional `visualRegion`
- `designTokens` — colors, fonts, spacing
- `changeHistory` — ordered list of changes
- `mergeHistory[]` — `MergeRecord` entries (populated by MergeModal after merge)

### 2. Snapshot Agent

Generates short visual descriptions for canvas branch cards.

| | |
|---|---|
| **File** | `server/agents/snapshotAgent.js` |
| **Route** | `POST /api/blueprint/snapshot` (`server/routes/blueprint.js`) |
| **Trigger** | Every code change (via `useAutoBlueprint` hook, staggered 600ms) |
| **Input** | `{ branchName, files, screenshotBase64?, userPrompt?, aiSummary? }` |
| **Output** | `{ success, description }` — 8-16 word description |
| **Model** | `config.models.small` (haiku-class per active provider) |
| **Strategy** | 3 fallbacks: conversation context → vision (screenshot) → code analysis |

### 3. Scout Agent

Read-only analysis. Compares two codebases, identifies conflicts, produces a merge plan and clarification questions.

| | |
|---|---|
| **File** | `server/agents/scoutAgent.js` |
| **Route** | `POST /api/merge/start` (`server/routes/merge.js`) — SSE |
| **Trigger** | User enters QA step in MergeModal |
| **Input** | `{ sourceFiles, targetFiles, sourceBlueprint, targetBlueprint, selectedFeatureIds }` |
| **Output (SSE)** | `{ type: 'plan', summary, plan: MergePlanStep[], questions: ConflictQuestion[] }` |
| **Tools used** | `callClaude()`, `readFile()`, `writeMemory()`, `clearMemory()` |

Questions are multiple-choice with AI-generated options. Plan steps have `action` (copy/modify/create/delete), `file`, `description`, `status`.

### 4. Merge Agent

The only agent with write permissions. Executes the merge plan step-by-step.

| | |
|---|---|
| **File** | `server/agents/mergeAgent.js` |
| **Route** | `POST /api/merge/execute` (`server/routes/merge.js`) — SSE |
| **Trigger** | User clicks Merge (full flow) or Quick Merge (flat flow) |
| **Input** | `{ sourceFiles, targetFiles, plan, answers, selectedFeatureIds, sourceBlueprint, instructions? }` |
| **Output (SSE)** | `{ type: 'progress', message }` → `{ type: 'done', mergedFiles }` |
| **Tools used** | `callClaude()`, `readFile()`, `clearMemory()`, `emit()` callback |

The `emit()` callback feeds progress lines to the SSE stream in real-time.

---

## Shared Infrastructure

### Agent Tools (`server/agents/tools.js`)

| Function | Purpose |
|----------|---------|
| `readFile(files, path)` | Read a file from the branch's file array |
| `listFiles(files)` | List all file paths in a branch |
| `searchCode(files, pattern)` | Regex search across all files |
| `callModel(apiKey, model, { system, messages }, opts)` | Call active AI provider (Claude or Gemini). `callClaude` is a backward-compatible alias. |

### Agent Memory (`server/agents/memory.js`)

Per-operation in-memory `Map` store. Each agent gets a namespace.

| Function | Purpose |
|----------|---------|
| `readMemory(agentId)` | Get agent's working state |
| `writeMemory(agentId, key, value)` | Store intermediate results |
| `clearMemory(agentId)` | Clean up after operation completes |

Memory is ephemeral — never persisted across operations. BLUEPRINTs serve as the persistent context.

### Rate Limiting (`server/middleware/rateLimit.js`)

| Route | Limit |
|-------|-------|
| `/api/blueprint/*` | 10 calls/min per IP |
| `/api/merge/*` | 5 calls/min per IP |

Returns `429` with `Retry-After` header. Client handles via `useMergeStream` hook.

---

## Frontend Architecture

### Key Files

| File | Role |
|------|------|
| `src/components/canvas/MergeModal.tsx` | Multi-step merge UI — the orchestrator |
| `src/components/canvas/FeatureOverlay.tsx` | Clickable visual regions on iframe preview |
| `src/components/ide/BlueprintPanel.tsx` | Blueprint display in branch editor, drift detection |
| `src/hooks/useMergeStream.ts` | SSE client for Scout + Merge agent communication |
| `src/hooks/useAutoBlueprint.ts` | Auto-triggers blueprint + snapshot on checkpoint changes |
| `src/store/useProjectStore.ts` | Zustand store — branch CRUD, `updateBlueprint()` |

### MergeModal Step Machine

```typescript
type MergeStep = 'select' | 'features' | 'qa' | 'executing' | 'done';
```

| Step | What renders | Key actions |
|------|-------------|-------------|
| `select` | Two-column branch preview, base selection | `handleSelectBase()` |
| `features` | FeatureOverlay + feature checklist + instructions | `toggleFeature()`, Quick Merge / Analyze & Review |
| `qa` | Scout loading → summary → questions → plan table | `handleAnswerQuestion()` |
| `executing` | Streaming progress log | `handleExecuteMerge()` |
| `done` | Success screen | Navigate to new branch |

### useMergeStream Hook

```typescript
const { startScout, executeMerge } = useMergeStream();
```

- `startScout(params, onEvent, signal?)` → SSE to `/api/merge/start`
- `executeMerge(params, onEvent, signal?)` → SSE to `/api/merge/execute`
- 45-second timeout per operation
- Handles `429` rate limit with `Retry-After` message

### useAutoBlueprint Hook

Runs automatically in the branch editor. When a checkpoint changes:
1. Calls `/api/blueprint/generate` → stores result via `updateBlueprint()`
2. Calls `/api/blueprint/snapshot` → updates branch description
3. Staggered 600ms per branch to avoid thundering herd

---

## Type Definitions (`src/types/blueprint.ts`)

```typescript
interface Blueprint {
  title, summary, purpose: string;
  techStack: string[];
  fileStructure: FileEntry[];
  features: BlueprintFeature[];
  designTokens: Record<string, string>;
  changeHistory: string[];
  parent: { branch: string; relationship: string } | null;
  mergeHistory?: MergeRecord[];
  raw: string;
  generatedAt?: number;
}

interface BlueprintFeature {
  id, name, description: string;
  files: string[];
  dependencies: string[];         // other feature IDs
  visualRegion?: { selector: string; label: string };
}

interface MergeRecord {
  sourceId, sourceName: string;
  targetId, targetName: string;
  featuresMigrated: string[];     // feature IDs
  mergePlan: MergePlanStep[];
  conflictsResolved: string[];    // "question → answer" strings
  timestamp: number;
}

interface MergePlanStep {
  action: 'copy' | 'modify' | 'create' | 'delete';
  file: string;
  description: string;
  status: 'pending' | 'done' | 'failed';
}
```

---

## Mock Mode

When the active provider's API key is not set (`ANTHROPIC_API_KEY` for Claude, `GEMINI_API_KEY` for Gemini), all agent routes return mock data:
- Blueprint: hardcoded sample with 3 features
- Snapshot: truncated prompt or generic fallback
- Merge prompts: empty array
- Scout/Merge: mock plan and merged files

This enables frontend development without API costs.

---

## Known Limitations

1. **Single-file merge output** — `mergeAgent.js` currently produces a single merged HTML file. The types and plumbing support `ProjectFile[]` but multi-file output hasn't been tested end-to-end.

2. **No persistent merge records server-side** — `MergeRecord` is written to the branch's blueprint in the client store only. There's no server-side audit log.

3. **Visual regions are position-estimated** — `FeatureOverlay` divides the preview into equal vertical bands per feature. Real DOM selector-based positioning (planned for Phase 4) is not yet implemented.

---

## Test Coverage

Tests live alongside the code in `__tests__/` directories. Run with `npm test`.

| Test file | What it covers |
|-----------|----------------|
| `src/store/__tests__/useProjectStore.test.ts` | Branch CRUD, blueprint updates, recursive delete |
| `src/hooks/__tests__/useMergeStream.test.ts` | SSE parsing, timeout, rate limiting, error events |
| `src/types/__tests__/blueprint.test.ts` | Type shape validation for all blueprint/merge types |
| `src/components/canvas/__tests__/MergeModal.test.tsx` | Step navigation, feature toggle, Quick Merge flow, QA step |
