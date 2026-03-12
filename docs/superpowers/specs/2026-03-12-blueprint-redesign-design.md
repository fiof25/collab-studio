# Blueprint Redesign: Smart Map Architecture

## Problem

The current blueprint is a visual decomposition — it captures what the UI looks like (Hero, Nav, Footer) and surface-level design tokens. This is insufficient for the merge system, which needs to combine divergent prototypes with different architectures, state models, and behavioral logic. A merge like "login page + physics simulator" fails because the blueprint doesn't capture how the code works, what state it manages, or where other code can plug in.

Additionally:
- The merge agent doesn't receive the target blueprint at all
- The scout agent gets raw blueprint JSON with no guidance on how to use it
- Feature dependencies are defined but never checked during merges
- Conversation context (user intent) is never passed to blueprint generation

## Approach: Blueprint as Semantic Map

The blueprint becomes a **pointer system** — it identifies what matters and where it lives in the code, but doesn't duplicate the code itself. Features become richer (behavior, state, entry points) but stay concise. The merge agent uses the blueprint to know *where to look*, then reads the actual code.

## Schema

```typescript
interface Blueprint {
  // --- Identity ---
  title: string;
  summary: string;
  purpose: string;               // Enriched with conversation context — captures user intent

  // --- Architecture (new) ---
  architecture: {
    pattern: string;             // e.g. "Single page app with modal-gated flow"
    initFlow: string;            // How the app bootstraps: "DOMContentLoaded -> loadState() -> renderBoard()"
    stateModel: StateEntry[];    // What state exists and where
    eventModel: string[];        // Key event wiring: "form.submit -> validate() -> setLoggedIn(true)"
  };

  // --- Features (redesigned) ---
  features: BlueprintFeature[];

  // --- Existing fields (kept) ---
  techStack: string[];
  fileStructure: FileEntry[];
  designTokens: Record<string, string>;
  changeHistory: string[];
  parent: { branch: string; relationship: string } | null;
  mergeHistory?: MergeRecord[];

  // --- Meta ---
  raw: string;
  generatedAt?: number;
}

interface StateEntry {
  name: string;          // e.g. "isLoggedIn", "particles", "score"
  type: string;          // e.g. "boolean", "array", "number"
  scope: string;         // "global", "closure in initGame()", "localStorage"
  purpose: string;       // "Gates access to simulator view"
}

interface BlueprintFeature {
  id: string;
  name: string;
  description: string;          // Functional description, not DOM structure

  // --- New fields ---
  behavior: string;             // What it DOES: "Validates email format, shows inline errors, submits via fetch POST"
  state: string[];              // State it owns/mutates: ["formData", "validationErrors", "isSubmitting"]
  entryPoints: EntryPoint[];    // How other code can interact with this feature
  codeRegions: CodeRegion[];    // Pointers to where this lives in the code

  // --- Kept ---
  files: string[];
  dependencies: string[];
  visualRegion?: {              // Kept for FeatureOverlay component
    selector: string;
    label: string;
  };
}

interface EntryPoint {
  type: 'function' | 'event' | 'element' | 'variable';
  name: string;           // e.g. "showLoginModal()", "game-canvas", "onAuthSuccess"
  direction: 'in' | 'out' | 'both';  // Can you call INTO this feature, or does it EMIT?
  description: string;    // "Call to show the login modal overlay"
}

interface CodeRegion {
  file: string;
  anchor: string;         // Searchable identifier: function name, CSS selector, or distinctive code pattern
                          // e.g. "function validateLogin()", ".login-form", "// FEATURE: auth-flow"
  label: string;          // "login form validation logic"
}
```

### Key Design Decisions

- **`architecture`** gives the merge agent the global picture — how the app boots, what state exists, how events flow
- **`entryPoints`** tell the merge agent where to "plug in" — if merging a login feature into a simulator, the agent sees `showLoginModal()` is an `in` entry point and `onAuthSuccess` is an `out` event
- **`codeRegions`** are searchable pointers — anchors use function names, CSS selectors, or distinctive patterns that can be grepped in the code (not line numbers, which LLMs can't reliably produce)
- **`state`** on each feature prevents the merge agent from accidentally duplicating or clobbering shared state
- **`visualRegion`** is kept on features (not shown above for brevity) — the `FeatureOverlay` component depends on it for UI positioning
- **No `modelTier` field** — the system already knows which model was used via config

## Generation Pipeline

### Tiered Model Selection

| Trigger | Model | Reason |
|---------|-------|--------|
| First checkpoint on a branch (no existing blueprint) | Large | Initial architectural analysis needs depth |
| First checkpoint after a fork | Large | New branch, needs fresh analysis of diverged code |
| Subsequent checkpoints (blueprint already exists) | Small | Incremental update — features added/changed |
| Manual "Regenerate" button | Large | User explicitly wants a fresh deep analysis |

Logic: `hasExistingBlueprint && hasArchitectureField ? small : large`. Plus a `forceFullRegenerate` flag for the manual button.

**Schema migration**: If `existingBlueprint` lacks the `architecture` field (pre-redesign blueprint), treat it as stale and use the large model for full regeneration. This handles the transition for branches with old-format blueprints without needing an explicit schema version field.

### Conversation Context Injection

The blueprint agent now receives conversation context alongside code:

```javascript
const contextPayload = {
  branchName,
  parentBranchName,
  files,
  conversationContext: {
    lastUserMessage: "Build a login page with email validation",
    lastAIResponse: "I've created a login form with...",
  },
  existingBlueprint: null | currentBlueprint,  // For incremental updates
};
```

- `conversationContext` feeds the `purpose` field — captures user intent beyond what code shows
- `existingBlueprint` lets the small model do targeted updates rather than full regeneration

### Prompt Philosophy

**Large model (initial generation):**
- "Identify the **application pattern** — is this a form-driven app, a game loop, a data dashboard, a multi-view SPA?"
- "Trace the **init flow** — what happens from page load to interactive state? Write as a chain."
- "Extract **state** — every variable that persists across user interactions. Name, type, scope, purpose."
- "For each feature, describe **behavior** (what it does, not what it looks like), list **state it owns**, and identify **entry points**"
- "Map **code regions** — for each feature, identify the searchable anchor (function name, CSS selector, or distinctive pattern) that locates its core logic"
- "Use the conversation context to write the `purpose` field — capture the user's intent, not just what the code does. If no conversation context is provided, derive purpose from code analysis alone"

**Small model (incremental updates):**
- Receives existing blueprint + current code + conversation context
- "Identify what changed: new features, modified behavior, new state, changed architecture. Update only the affected fields."

**Universal, not prescriptive:**
- No hardcoded UI categories (Hero, Nav, Footer)
- "Identify the distinct functional units — whatever they are. A game has different units than a form. Let the code tell you what the features are."

## Merge Agent Integration

### Scout Agent — Blueprint-Driven Analysis

The scout agent currently receives full blueprint JSON with no guidance. New behavior:

1. **Architecture comparison** — compare `architecture.pattern`, `stateModel`, and `initFlow` from both blueprints. Flag incompatibilities: "Source uses a game loop with requestAnimationFrame, target uses form-driven event handlers"

2. **State conflict detection** — cross-reference `architecture.stateModel` entries and feature `state` arrays. Flag overlapping variable names with different shapes or scopes

3. **Entry point matching** — when features are selected for merge, check: does the target have a compatible entry point? If source feature emits `onAuthSuccess` but target has no listener, include a wiring step in the merge plan

4. **Dependency validation** — if selected feature A depends on feature B (via `dependencies`), and B isn't selected, warn the user

### Merge Agent — Receives Both Blueprints

Currently only gets `sourceBlueprint`. Fix: pass `targetBlueprint` too. The merge agent uses:

- `codeRegions` anchors from source features to search for the code to extract
- `codeRegions` anchors from target to find where to inject
- `entryPoints` to wire features together
- `architecture.stateModel` from both to reconcile state without duplication

### Structured Briefing (Replaces Raw JSON Dump)

Instead of dumping full blueprint JSON into agent prompts, agents receive a structured briefing:

```
SOURCE ARCHITECTURE:
- Pattern: Single page with modal login gate
- Init: DOMContentLoaded -> checkAuth() -> showLogin() or showApp()
- State: isLoggedIn (boolean, global), userData (object, localStorage)

TARGET ARCHITECTURE:
- Pattern: Canvas-based simulator with animation loop
- Init: DOMContentLoaded -> initCanvas() -> startLoop()
- State: particles (array, closure), score (number, global)

SELECTED FEATURES FROM SOURCE:
- Login Form: validates email, emits onAuthSuccess
  Entry points: showLoginModal() [in], onAuthSuccess [out]
  Code anchors: function validateLogin(), .login-form, function handleSubmit()

STATE CONFLICTS: None (no overlapping state names)
INTEGRATION POINTS: Source onAuthSuccess [out] needs wiring to target initCanvas() [in]
```

## Files to Change

| File | Change |
|------|--------|
| `src/types/blueprint.ts` | New schema: `architecture`, redesigned `BlueprintFeature`, new interfaces `StateEntry`, `EntryPoint`, `CodeRegion`. Keep `visualRegion` on features |
| `server/agents/blueprintAgent.js` | New system prompts (large + small), conversation context input, tiered model selection, incremental update logic, update `buildMarkdown()` to render new fields |
| `server/routes/blueprint.js` | Accept `conversationContext` and `existingBlueprint` params, model tier selection logic, update `mockBlueprint()` to match new schema |
| `src/hooks/useAutoBlueprint.ts` | Pass conversation context and existing blueprint to API call, determine model tier (check for `architecture` field to detect old-format blueprints) |
| `server/agents/scoutAgent.js` | New prompt with structured briefing, architecture comparison, state conflict detection, entry point matching, dependency validation |
| `server/agents/mergeAgent.js` | Accept `targetBlueprint` in function signature, use code region anchors and entry points for merge execution |
| `server/routes/merge.js` | Pass `targetBlueprint` to merge execute endpoint, destructure from request body |
| `src/hooks/useMergeStream.ts` | Add `targetBlueprint` to `ExecuteParams` interface |
| `src/components/ide/BlueprintPanel.tsx` | Display new fields: architecture, state model, entry points, code regions |
| `src/components/canvas/FeatureOverlay.tsx` | No schema change needed — `visualRegion` is kept |
| `server/agents/tools.js` | Add briefing formatter function that converts blueprint JSON to structured text |
| `src/test/factories.ts` | Update `createTestBlueprint()` and `createTestFeature()` to match new schema |
| `docs/ai-system.md` | Update documentation to reflect new blueprint system |
