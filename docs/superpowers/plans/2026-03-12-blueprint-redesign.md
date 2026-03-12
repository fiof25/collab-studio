# Blueprint Redesign: Smart Map Architecture — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the blueprint system from a visual decomposition into a semantic map that captures architecture, state, behavior, and entry points — enabling intelligent merges of divergent prototypes.

**Architecture:** The blueprint schema gains an `architecture` block (pattern, init flow, state model, event model) and richer features (behavior, state, entry points, code region anchors). Generation uses tiered models (large for initial, small for incremental). Merge agents receive structured briefings instead of raw JSON dumps, and the merge agent gets both source and target blueprints.

**Tech Stack:** TypeScript types, Express routes, Anthropic/Gemini API, React components, Zustand store

**Spec:** `docs/superpowers/specs/2026-03-12-blueprint-redesign-design.md`

---

## Chunk 1: Schema & Types

### Task 1: Update Blueprint TypeScript types

**Files:**
- Modify: `src/types/blueprint.ts`

- [ ] **Step 1: Add new interfaces and update existing ones**

Replace the full contents of `src/types/blueprint.ts` with the new schema:

```typescript
export interface Blueprint {
  title: string;
  summary: string;
  purpose: string;

  // Architecture — global structural overview
  architecture: {
    pattern: string;
    initFlow: string;
    stateModel: StateEntry[];
    eventModel: string[];
  };

  features: BlueprintFeature[];
  techStack: string[];
  fileStructure: FileEntry[];
  designTokens: Record<string, string>;
  changeHistory: string[];
  parent: { branch: string; relationship: string } | null;
  mergeHistory?: MergeRecord[];
  raw: string;
  generatedAt?: number;
}

export interface StateEntry {
  name: string;
  type: string;
  scope: string;
  purpose: string;
}

export interface EntryPoint {
  type: 'function' | 'event' | 'element' | 'variable';
  name: string;
  direction: 'in' | 'out' | 'both';
  description: string;
}

export interface CodeRegion {
  file: string;
  anchor: string;
  label: string;
}

export interface FileEntry {
  path: string;
  description: string;
}

export interface BlueprintFeature {
  id: string;
  name: string;
  description: string;
  behavior: string;
  state: string[];
  entryPoints: EntryPoint[];
  codeRegions: CodeRegion[];
  files: string[];
  dependencies: string[];
  visualRegion?: {
    selector: string;
    label: string;
  };
}

export interface MergeRecord {
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  featuresMigrated: string[];
  mergePlan: MergePlanStep[];
  conflictsResolved: string[];
  timestamp: number;
}

export interface MergePlanStep {
  action: 'copy' | 'modify' | 'create' | 'delete';
  file: string;
  description: string;
  status: 'pending' | 'done' | 'failed';
}
```

- [ ] **Step 2: Run type check to see what breaks**

Run: `npx tsc --noEmit 2>&1 | head -60`
Expected: Type errors in factories.ts, BlueprintPanel.tsx, and possibly other consumers that reference old fields. This is expected — we'll fix them in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add src/types/blueprint.ts
git commit -m "feat(types): add architecture, entryPoints, codeRegions to Blueprint schema"
```

---

### Task 2: Update test factories

**Files:**
- Modify: `src/test/factories.ts`

- [ ] **Step 1: Update createTestFeature to include new fields**

In `src/test/factories.ts`, update `createTestFeature`:

```typescript
export function createTestFeature(overrides: Partial<BlueprintFeature> = {}): BlueprintFeature {
  const id = overrides.id ?? uid('feat');
  return {
    id,
    name: `Feature ${id}`,
    description: 'A test feature',
    behavior: 'Renders a test component',
    state: [],
    entryPoints: [],
    codeRegions: [],
    files: ['index.html'],
    dependencies: [],
    ...overrides,
  };
}
```

- [ ] **Step 2: Update createTestBlueprint to include architecture**

In `src/test/factories.ts`, update `createTestBlueprint`:

```typescript
export function createTestBlueprint(overrides: Partial<Blueprint> = {}): Blueprint {
  return {
    title: 'Test Blueprint',
    summary: 'A test blueprint summary',
    purpose: 'Testing',
    architecture: {
      pattern: 'Single page static',
      initFlow: 'DOMContentLoaded → render()',
      stateModel: [],
      eventModel: [],
    },
    techStack: ['HTML', 'CSS'],
    fileStructure: [{ path: 'index.html', description: 'Main file' }],
    features: [createTestFeature()],
    designTokens: { primary: '#8B5CF6' },
    changeHistory: ['Initial creation'],
    parent: null,
    raw: '# Test Blueprint',
    ...overrides,
  };
}
```

- [ ] **Step 3: Add imports for new types**

Add `StateEntry, EntryPoint, CodeRegion` to the import if any test needs them. The existing import line at the top of factories.ts should be updated:

```typescript
import type { Blueprint, BlueprintFeature, MergePlanStep, MergeRecord } from '@/types/blueprint';
```

No change needed — the new interfaces aren't directly used in factories (they're nested in Blueprint/BlueprintFeature).

- [ ] **Step 4: Run tests**

Run: `npx vitest run 2>&1 | tail -20`
Expected: Tests should still pass (factories produce valid shapes now).

- [ ] **Step 5: Commit**

```bash
git add src/test/factories.ts
git commit -m "fix(tests): update factories to match new blueprint schema"
```

---

## Chunk 2: Blueprint Agent & Route

### Task 3: Rewrite blueprint agent with tiered prompts and conversation context

**Files:**
- Modify: `server/agents/blueprintAgent.js`

- [ ] **Step 1: Replace the SYSTEM_PROMPT with two prompts (large + small)**

Replace the entire `SYSTEM_PROMPT` constant (lines 5-42) with two new constants:

```javascript
const SYSTEM_PROMPT_FULL = `You are a Blueprint Agent for a collaborative prototyping tool called Collab Studio.

Your job: analyze a prototype's code files and produce a structured BLUEPRINT — a semantic map that captures everything another AI agent needs to understand, merge, or extend this prototype.

You will receive the branch name, an optional parent branch name, all code files, and optionally the user's last message and AI response for intent context.

Respond with ONLY valid JSON. No markdown fences, no explanation — just the raw JSON object.

JSON structure:
{
  "title": "Short descriptive title (what the prototype IS, e.g. 'Physics Particle Simulator' not 'particle-v2')",
  "summary": "One sentence describing the prototype — what it does and what the user sees",
  "purpose": "1-2 sentences capturing the user's intent and what this prototype is exploring. Use conversation context if provided; otherwise derive from code analysis.",
  "architecture": {
    "pattern": "The application pattern in one phrase (e.g. 'Canvas-based game loop with score tracking', 'Form-driven SPA with modal login gate', 'Static landing page with scroll animations')",
    "initFlow": "What happens from page load to interactive state, as a chain (e.g. 'DOMContentLoaded → loadState() → renderBoard() → startLoop()')",
    "stateModel": [
      {
        "name": "variable name (e.g. 'score', 'isLoggedIn', 'particles')",
        "type": "data type (e.g. 'number', 'boolean', 'array of objects')",
        "scope": "where it lives (e.g. 'global', 'closure in initGame()', 'localStorage')",
        "purpose": "what it controls or tracks (e.g. 'Gates access to main app view')"
      }
    ],
    "eventModel": ["key event wirings as chains (e.g. 'form.submit → validate() → setLoggedIn(true)', 'canvas.click → spawnParticle(x, y)')"]
  },
  "features": [
    {
      "id": "kebab-case-unique-id",
      "name": "Human-readable feature name",
      "description": "What this feature does in 1-2 sentences. Focus on function, not DOM structure.",
      "behavior": "Concrete actions: what it DOES, what happens when the user interacts (e.g. 'Validates email format on blur, shows red border and error text for invalid input, submits via fetch POST to /api/auth, stores JWT in localStorage on success')",
      "state": ["names of state variables this feature owns or mutates"],
      "entryPoints": [
        {
          "type": "function | event | element | variable",
          "name": "identifier (e.g. 'showLoginModal()', 'onAuthSuccess', '#game-canvas')",
          "direction": "in | out | both",
          "description": "How other code interacts with this feature via this entry point"
        }
      ],
      "codeRegions": [
        {
          "file": "file path",
          "anchor": "searchable identifier — function name, CSS selector, or distinctive pattern that can be grepped (e.g. 'function validateLogin()', '.login-form', '// AUTH SECTION')",
          "label": "short description of what this region does"
        }
      ],
      "files": ["files that implement this feature"],
      "dependencies": ["ids of other features this depends on — empty array if none"],
      "visualRegion": { "selector": "CSS selector that wraps this feature visually", "label": "Short label for overlay" }
    }
  ],
  "techStack": ["detected technologies, e.g. 'HTML', 'CSS Grid', 'Vanilla JS', 'Google Fonts: Inter', 'Canvas API'"],
  "fileStructure": [
    { "path": "index.html", "description": "what this file contains and does" }
  ],
  "designTokens": {
    "primaryColor": "#hex value of main accent color",
    "backgroundColor": "#hex value of page background",
    "textColor": "#hex value of primary text",
    "fontFamily": "primary font family"
  },
  "changeHistory": ["Initial creation"],
  "parent": null
}

Critical rules:
- For architecture.pattern: identify what KIND of app this is — game loop, form flow, dashboard, simulator, static page, etc.
- For architecture.initFlow: trace the ACTUAL boot sequence from the code. Look for DOMContentLoaded, window.onload, or immediate script execution.
- For architecture.stateModel: find every variable that persists across user interactions. Include scope and purpose.
- For features: identify the distinct FUNCTIONAL units — adapt to whatever the prototype is. A game has different units than a form. Let the code tell you what the features are. Don't create features for utility code.
- For behavior: describe what HAPPENS, not what it LOOKS LIKE. Include user interactions, data transformations, and side effects.
- For entryPoints: identify how other code could plug INTO this feature (direction: "in") or what this feature EMITS (direction: "out"). This is critical for merge operations.
- For codeRegions: use searchable anchors — function names, CSS selectors, or distinctive code patterns. NEVER use line numbers.
- For state on features: list the state variable NAMES that this feature reads or writes.`;

const SYSTEM_PROMPT_INCREMENTAL = `You are a Blueprint Agent performing an INCREMENTAL UPDATE on an existing blueprint.

You receive:
- The existing blueprint JSON
- The current code files
- Optionally, the user's last message and AI response

Your job: compare the existing blueprint against the current code and update ONLY what changed. This could be:
- New features added
- Existing features modified (new behavior, changed state, new entry points)
- Architecture changes (new state variables, changed init flow, new event wiring)
- Updated purpose (if conversation context reveals new intent)

Respond with ONLY the complete updated blueprint JSON. Preserve unchanged fields exactly. Update changed fields accurately.

Rules:
- Do NOT regenerate unchanged features — keep their ids, names, and descriptions if the underlying code hasn't changed
- DO update codeRegions if anchors have moved or new ones appeared
- DO add new stateModel entries if new state variables appear in the code
- DO update changeHistory — append a brief description of what changed (e.g. "Added login form with validation")
- If conversation context is provided, update purpose to reflect the latest intent`;
```

- [ ] **Step 2: Update runBlueprintAgent to accept new parameters and select model tier**

Replace the `runBlueprintAgent` function (lines 44-95) with:

```javascript
export async function runBlueprintAgent({ branchId, branchName, parentBranchName, files, apiKey, conversationContext, existingBlueprint, forceFullRegenerate }) {
  const agentId = `blueprint_${branchId}_${Date.now()}`;

  try {
    const fileList = listFiles(files);
    const fileDump = files
      .map((f) => `=== ${f.path} ===\n${f.content.slice(0, 10000)}`)
      .join('\n\n');

    // Tiered model selection:
    // Use large model for initial generation or when forced
    // Use small model for incremental updates (existing blueprint with architecture field)
    const isIncremental = !forceFullRegenerate && existingBlueprint?.architecture;
    const model = isIncremental ? config.models.small : config.models.large;
    const systemPrompt = isIncremental ? SYSTEM_PROMPT_INCREMENTAL : SYSTEM_PROMPT_FULL;

    let userMessage = `Branch: "${branchName}"
${parentBranchName ? `Parent branch: "${parentBranchName}"` : 'Root branch (no parent)'}
Files: ${fileList.join(', ')}`;

    // Add conversation context for intent
    if (conversationContext?.lastUserMessage) {
      userMessage += `\n\nUser's last message: "${conversationContext.lastUserMessage}"`;
    }
    if (conversationContext?.lastAIResponse) {
      userMessage += `\nAI's last response summary: "${conversationContext.lastAIResponse}"`;
    }

    // For incremental updates, include the existing blueprint
    if (isIncremental && existingBlueprint) {
      userMessage += `\n\nEXISTING BLUEPRINT:\n${JSON.stringify(existingBlueprint, null, 2)}`;
    }

    userMessage += `\n\n${fileDump}\n\nGenerate the BLUEPRINT JSON now.`;

    const raw = await callClaude(apiKey, model, {
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }, { temperature: 0.2, maxOutputTokens: isIncremental ? 4096 : 8192 });

    // Parse
    let blueprint;
    try {
      blueprint = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON found in blueprint response');
      blueprint = JSON.parse(match[0]);
    }

    // Timestamp
    blueprint.generatedAt = Date.now();

    // Set parent relationship
    blueprint.parent = parentBranchName
      ? { branch: parentBranchName, relationship: 'Direct child' }
      : null;

    // Generate raw markdown for human display
    blueprint.raw = buildMarkdown(blueprint, branchName);

    return { success: true, blueprint };
  } catch (err) {
    console.error('[BlueprintAgent] error:', err.message);
    return { success: false, error: err.message };
  } finally {
    clearMemory(agentId);
  }
}
```

- [ ] **Step 3: Update buildMarkdown to render new fields**

Replace the `buildMarkdown` function (lines 97-127) with:

```javascript
function buildMarkdown(bp, branchName) {
  const lines = [
    `# ${bp.title}`,
    ``,
    `> ${bp.summary}`,
    ``,
    `## Purpose`,
    bp.purpose,
  ];

  // Architecture
  if (bp.architecture) {
    lines.push(``, `## Architecture`);
    lines.push(`- **Pattern:** ${bp.architecture.pattern}`);
    lines.push(`- **Init Flow:** \`${bp.architecture.initFlow}\``);
    if (bp.architecture.stateModel?.length) {
      lines.push(``, `### State Model`);
      bp.architecture.stateModel.forEach((s) => {
        lines.push(`- \`${s.name}\` (${s.type}, ${s.scope}) — ${s.purpose}`);
      });
    }
    if (bp.architecture.eventModel?.length) {
      lines.push(``, `### Event Model`);
      bp.architecture.eventModel.forEach((e) => lines.push(`- \`${e}\``));
    }
  }

  // Features
  if (bp.features?.length) {
    lines.push(``, `## Features`);
    bp.features.forEach((f) => {
      lines.push(``, `### ${f.name}`, f.description);
      if (f.behavior) lines.push(`- **Behavior:** ${f.behavior}`);
      if (f.state?.length) lines.push(`- **State:** ${f.state.join(', ')}`);
      if (f.entryPoints?.length) {
        lines.push(`- **Entry Points:**`);
        f.entryPoints.forEach((ep) => {
          lines.push(`  - \`${ep.name}\` [${ep.direction}] (${ep.type}) — ${ep.description}`);
        });
      }
      if (f.codeRegions?.length) {
        lines.push(`- **Code Regions:**`);
        f.codeRegions.forEach((cr) => {
          lines.push(`  - \`${cr.anchor}\` in ${cr.file} — ${cr.label}`);
        });
      }
    });
  }

  lines.push(
    ``,
    `## Tech Stack`,
    ...bp.techStack.map((t) => `- ${t}`),
    ``,
    `## File Structure`,
    ...bp.fileStructure.map((f) => `- \`${f.path}\` — ${f.description}`),
    ``,
    `## Design Tokens`,
    ...Object.entries(bp.designTokens).map(([k, v]) => `- ${k}: ${v}`),
    ``,
    `## Change History`,
    ...bp.changeHistory.map((c, i) => `${i + 1}. ${c}`),
  );

  if (bp.parent) {
    lines.push(``, `## Parent`, `- **Branch:** ${bp.parent.branch}`, `- **Relationship:** ${bp.parent.relationship}`);
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Verify the file looks correct**

Run: `node -e "import('./server/agents/blueprintAgent.js').then(() => console.log('OK')).catch(e => console.error(e.message))"`
Expected: "OK" (module loads without syntax errors)

- [ ] **Step 5: Commit**

```bash
git add server/agents/blueprintAgent.js
git commit -m "feat(blueprint-agent): add tiered prompts, conversation context, architecture analysis"
```

---

### Task 4: Update blueprint route to accept new parameters and update mock

**Files:**
- Modify: `server/routes/blueprint.js`

- [ ] **Step 1: Update the `/generate` route to accept new params**

In `server/routes/blueprint.js`, replace the `/generate` handler (lines 51-66) with:

```javascript
blueprintRouter.post('/generate', async (req, res) => {
  const { branchId, branchName, parentBranchName, files, conversationContext, existingBlueprint, forceFullRegenerate } = req.body;

  if (!branchId || !branchName || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const apiKey = config.apiKey;
  if (!apiKey || apiKey === 'your_key_here') {
    return res.json({ success: true, blueprint: mockBlueprint(branchName, parentBranchName) });
  }

  const result = await runBlueprintAgent({ branchId, branchName, parentBranchName, files, apiKey, conversationContext, existingBlueprint, forceFullRegenerate });
  res.json(result);
});
```

- [ ] **Step 2: Update mockBlueprint to include new schema fields**

Replace the `mockBlueprint` function (lines 10-46) with:

```javascript
function mockBlueprint(branchName, parentBranchName) {
  return {
    title: branchName,
    summary: 'A web prototype built with HTML and CSS',
    purpose: 'Landing page prototype for exploration and iteration.',
    architecture: {
      pattern: 'Static single page',
      initFlow: 'DOMContentLoaded → render',
      stateModel: [],
      eventModel: [],
    },
    techStack: ['HTML', 'Inline CSS'],
    fileStructure: [{ path: 'index.html', description: 'Single-file prototype with all markup and styles' }],
    features: [
      {
        id: 'navigation',
        name: 'Navigation Bar',
        description: 'Top navigation bar with logo and links',
        behavior: 'Renders a fixed nav bar with logo and anchor links for page sections',
        state: [],
        entryPoints: [{ type: 'element', name: 'nav', direction: 'in', description: 'Navigation container element' }],
        codeRegions: [{ file: 'index.html', anchor: 'nav', label: 'Navigation markup' }],
        files: ['index.html'],
        dependencies: [],
        visualRegion: { selector: 'nav', label: 'Navigation' },
      },
      {
        id: 'hero',
        name: 'Hero Section',
        description: 'Main hero with headline and call-to-action button',
        behavior: 'Displays a hero banner with headline text and a CTA button that scrolls to content',
        state: [],
        entryPoints: [{ type: 'element', name: '.hero', direction: 'in', description: 'Hero section container' }],
        codeRegions: [{ file: 'index.html', anchor: '.hero, header, section:first-of-type', label: 'Hero section markup' }],
        files: ['index.html'],
        dependencies: [],
        visualRegion: { selector: '.hero, header, section:first-of-type', label: 'Hero' },
      },
    ],
    designTokens: {
      primaryColor: '#111111',
      backgroundColor: '#ffffff',
      textColor: '#333333',
      fontFamily: 'system-ui',
    },
    changeHistory: ['Initial creation'],
    parent: parentBranchName ? { branch: parentBranchName, relationship: 'Direct child' } : null,
    generatedAt: Date.now(),
    raw: `# ${branchName}\n\n> A web prototype built with HTML and CSS`,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/blueprint.js
git commit -m "feat(blueprint-route): accept conversationContext and existingBlueprint, update mock"
```

---

## Chunk 3: Frontend — Hook & Panel

### Task 5: Update useChatStream to pass conversation context and existing blueprint

**Files:**
- Modify: `src/hooks/useChatStream.ts`

- [ ] **Step 1: Update triggerAgents to pass conversation context and existing blueprint**

In `src/hooks/useChatStream.ts`, update the `triggerAgents` function signature (lines 12-21) to include `existingBlueprint`:

```typescript
async function triggerAgents(
  branchId: string,
  branchName: string,
  parentBranchName: string | undefined,
  files: ProjectFile[],
  updateBlueprint: (id: string, bp: import('@/types/blueprint').Blueprint) => void,
  updateBranch: (id: string, patch: Parameters<ReturnType<typeof useProjectStore.getState>['updateBranch']>[1]) => void,
  screenshotBase64?: string | null,
  userPrompt?: string,
  aiSummary?: string,
  existingBlueprint?: import('@/types/blueprint').Blueprint | null,
) {
```

- [ ] **Step 2: Update the blueprint generate fetch call to include new params**

In `triggerAgents`, update the blueprint generate fetch body (lines 24-28):

```typescript
    const bpRes = await fetch(`${SERVER_URL}/api/blueprint/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branchId,
        branchName,
        parentBranchName,
        files,
        conversationContext: userPrompt ? { lastUserMessage: userPrompt, lastAIResponse: aiSummary } : undefined,
        existingBlueprint: existingBlueprint ?? undefined,
      }),
    });
```

- [ ] **Step 3: Pass existing blueprint from the call site**

Update the `triggerAgents` call at line 182 to pass the existing blueprint:

```typescript
          triggerAgents(branchId, latestBranch.name, parentBranch?.name, newFiles, updateBlueprint, updateBranch, screenshotBase64, trimmed, aiSummary, latestBranch.blueprint).catch(() => {});
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useChatStream.ts
git commit -m "feat(useChatStream): pass conversation context and existing blueprint to generation"
```

---

### Task 6: Update useAutoBlueprint to pass existing blueprint

**Files:**
- Modify: `src/hooks/useAutoBlueprint.ts`

- [ ] **Step 1: Update the generate fetch call to include existing blueprint**

In `useAutoBlueprint.ts`, update the fetch body inside the setTimeout callback (lines 62-71):

```typescript
          const bpRes = await fetch(`${SERVER_URL}/api/blueprint/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              branchId: branch.id,
              branchName: branch.name,
              parentBranchName: parentBranch?.name,
              files,
              existingBlueprint: branch.blueprint ?? undefined,
            }),
          });
```

Note: `useAutoBlueprint` runs on CanvasPage (not Editor), so it has no conversation context available. This is fine — the hook serves as a fallback for branches that didn't get a blueprint from the chat flow.

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAutoBlueprint.ts
git commit -m "feat(useAutoBlueprint): pass existing blueprint for incremental updates"
```

---

### Task 7: Update BlueprintPanel to display new fields

**Files:**
- Modify: `src/components/ide/BlueprintPanel.tsx`

- [ ] **Step 1: Update FeatureRow to show new fields**

Replace the `FeatureRow` component (lines 18-50) with:

```tsx
function FeatureRow({ feature }: { feature: BlueprintFeature }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg bg-surface-2 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-3 transition-colors"
      >
        {open ? <ChevronDown size={11} className="text-ink-muted flex-shrink-0" /> : <ChevronRight size={11} className="text-ink-muted flex-shrink-0" />}
        <span className="text-xs font-medium text-ink-primary truncate">{feature.name}</span>
      </button>
      {open && (
        <div className="px-3 pb-2.5 space-y-2 border-t border-line/50">
          <p className="text-xs text-ink-secondary leading-relaxed pt-2">{feature.description}</p>
          {feature.behavior && (
            <p className="text-[11px] text-ink-muted leading-relaxed italic">{feature.behavior}</p>
          )}
          {feature.state?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-[10px] text-ink-muted">State:</span>
              {feature.state.map((s) => (
                <span key={s} className="text-[10px] font-mono bg-surface-0 text-cyan-400/80 rounded px-1.5 py-0.5 border border-line">
                  {s}
                </span>
              ))}
            </div>
          )}
          {feature.entryPoints?.length > 0 && (
            <div className="space-y-0.5">
              <span className="text-[10px] text-ink-muted">Entry Points:</span>
              {feature.entryPoints.map((ep) => (
                <div key={ep.name} className="flex items-center gap-1.5 ml-2">
                  <span className={`text-[9px] font-mono px-1 rounded ${ep.direction === 'in' ? 'bg-emerald-500/15 text-emerald-400' : ep.direction === 'out' ? 'bg-amber-500/15 text-amber-400' : 'bg-violet-500/15 text-violet-400'}`}>
                    {ep.direction}
                  </span>
                  <span className="text-[10px] font-mono text-ink-secondary">{ep.name}</span>
                </div>
              ))}
            </div>
          )}
          {feature.files.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {feature.files.map((f) => (
                <span key={f} className="text-[10px] font-mono bg-surface-0 text-ink-muted rounded px-1.5 py-0.5 border border-line">
                  {f}
                </span>
              ))}
            </div>
          )}
          {feature.dependencies.length > 0 && (
            <p className="text-[10px] text-ink-muted">
              Depends on: {feature.dependencies.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add Architecture section to BlueprintPanel body**

In the `BlueprintPanel` component, after the Purpose section (after line 185) and before the Features section, add:

```tsx
        {/* Architecture */}
        {blueprint.architecture && (
          <Section title="Architecture">
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-ink-muted">Pattern: </span>
                <span className="text-[11px] text-ink-secondary">{blueprint.architecture.pattern}</span>
              </div>
              <div>
                <span className="text-[10px] text-ink-muted">Init: </span>
                <span className="text-[11px] font-mono text-ink-secondary">{blueprint.architecture.initFlow}</span>
              </div>
              {blueprint.architecture.stateModel?.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-ink-muted">State:</span>
                  {blueprint.architecture.stateModel.map((s) => (
                    <div key={s.name} className="flex items-center gap-1.5 ml-2">
                      <span className="text-[10px] font-mono bg-surface-0 text-cyan-400/80 rounded px-1 py-0.5 border border-line">{s.name}</span>
                      <span className="text-[10px] text-ink-muted">{s.type} · {s.scope}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Section>
        )}
```

- [ ] **Step 3: Update the generate function to pass forceFullRegenerate**

In the `generate` callback (line 85), update the fetch body to include `forceFullRegenerate: true` so the manual regenerate button always uses the large model:

```typescript
            body: JSON.stringify({
              branchId,
              branchName: branch.name,
              parentBranchName: parentBranch?.name,
              files: effectiveFiles,
              existingBlueprint: branch.blueprint ?? undefined,
              forceFullRegenerate: true,
            }),
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ide/BlueprintPanel.tsx
git commit -m "feat(BlueprintPanel): display architecture, state, entry points in blueprint view"
```

---

## Chunk 4: Merge System Integration

### Task 8: Add briefing formatter to tools.js

**Files:**
- Modify: `server/agents/tools.js`

- [ ] **Step 1: Add formatBlueprintBriefing function**

Append to the end of `server/agents/tools.js` (before the last line / after `callClaude`):

```javascript
/**
 * Format a blueprint into a structured briefing for merge agents.
 * Returns a concise text summary instead of raw JSON dump.
 */
export function formatBlueprintBriefing(blueprint, label = 'BLUEPRINT') {
  if (!blueprint) return `${label}: Not available`;

  const lines = [`${label}:`];
  lines.push(`- Title: ${blueprint.title}`);
  lines.push(`- Summary: ${blueprint.summary}`);

  if (blueprint.architecture) {
    lines.push(`- Pattern: ${blueprint.architecture.pattern}`);
    lines.push(`- Init: ${blueprint.architecture.initFlow}`);
    if (blueprint.architecture.stateModel?.length) {
      const stateStr = blueprint.architecture.stateModel
        .map((s) => `${s.name} (${s.type}, ${s.scope})`)
        .join(', ');
      lines.push(`- State: ${stateStr}`);
    }
    if (blueprint.architecture.eventModel?.length) {
      lines.push(`- Events: ${blueprint.architecture.eventModel.join('; ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format selected features with their entry points and code regions for merge agents.
 */
export function formatFeatureBriefing(features) {
  if (!features?.length) return 'No features selected';

  return features.map((f) => {
    const lines = [`- ${f.name}: ${f.behavior || f.description}`];
    if (f.state?.length) lines.push(`  State: ${f.state.join(', ')}`);
    if (f.entryPoints?.length) {
      const eps = f.entryPoints.map((ep) => `${ep.name} [${ep.direction}]`).join(', ');
      lines.push(`  Entry points: ${eps}`);
    }
    if (f.codeRegions?.length) {
      const crs = f.codeRegions.map((cr) => `${cr.anchor} in ${cr.file}`).join(', ');
      lines.push(`  Code anchors: ${crs}`);
    }
    return lines.join('\n');
  }).join('\n');
}

/**
 * Detect state conflicts between two blueprints.
 */
export function detectStateConflicts(sourceBlueprint, targetBlueprint) {
  if (!sourceBlueprint?.architecture?.stateModel || !targetBlueprint?.architecture?.stateModel) return [];

  const targetNames = new Map(targetBlueprint.architecture.stateModel.map((s) => [s.name, s]));
  const conflicts = [];

  for (const src of sourceBlueprint.architecture.stateModel) {
    const tgt = targetNames.get(src.name);
    if (tgt && (src.type !== tgt.type || src.scope !== tgt.scope)) {
      conflicts.push({
        name: src.name,
        source: `${src.type}, ${src.scope}`,
        target: `${tgt.type}, ${tgt.scope}`,
      });
    }
  }

  return conflicts;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/agents/tools.js
git commit -m "feat(tools): add blueprint briefing formatters and state conflict detection"
```

---

### Task 9: Update Scout Agent with structured briefing and blueprint-driven analysis

**Files:**
- Modify: `server/agents/scoutAgent.js`

- [ ] **Step 1: Update imports**

Replace line 1 of `server/agents/scoutAgent.js`:

```javascript
import { callClaude, readFile, formatBlueprintBriefing, formatFeatureBriefing, detectStateConflicts } from './tools.js';
```

- [ ] **Step 2: Replace the SYSTEM_PROMPT**

Replace the `SYSTEM_PROMPT` (lines 5-54) with:

```javascript
const SYSTEM_PROMPT = `You are a Scout Agent for a collaborative prototyping tool called Collab Studio.

Your job: analyze a SOURCE and TARGET prototype, compare their architectures and features, and produce a merge plan that accounts for structural differences.

You receive:
- Source and Target architecture briefings (pattern, init flow, state, events)
- Selected features to migrate (with their behavior, entry points, and code anchors)
- State conflicts (overlapping variable names with different types/scopes)
- Integration points (source entry points that need wiring to target)
- Source and Target HTML code

Respond with ONLY valid JSON. No markdown fences, no explanation.

JSON structure:
{
  "summary": "1-2 sentences describing what will be merged and key architectural considerations",
  "plan": [
    {
      "action": "modify",
      "file": "index.html",
      "description": "Specific, actionable description of what will change"
    }
  ],
  "questions": [
    {
      "id": "unique-kebab-id",
      "question": "The conflict question text",
      "options": ["Option A", "Option B", "Option C"]
    }
  ]
}

Rules for the merge plan:
- If source and target have DIFFERENT architecture patterns (e.g. game loop vs form-driven), include a plan step for how to reconcile initialization
- If selected features have entry points with direction "out" that need wiring to the target, include a plan step for connecting them
- If state conflicts exist, include a plan step for resolving each conflict
- Check feature dependencies: if feature A depends on feature B and B is not selected, include a warning in the summary
- Be specific about WHERE in the target code each feature should be integrated (reference code anchors when available)
- Order steps logically: structural changes first, then feature integration, then wiring

Rules for conflict questions:
- ONLY ask when there is a genuine ambiguity a human must resolve
- Maximum 3 questions total
- Always provide 2-4 options
- Ask about architecture pattern conflicts (e.g. "Source uses requestAnimationFrame loop, target uses event-driven. Keep both patterns or convert source features to event-driven?")
- Ask about state conflicts
- Ask about styling conflicts (font, color, CSS methodology)
- DO NOT ask about things with obvious defaults`;
```

- [ ] **Step 3: Update the runScoutAgent function to use structured briefings**

Replace the `runScoutAgent` function body (lines 56-121) with:

```javascript
export async function runScoutAgent({
  sourceFiles,
  targetFiles,
  sourceBlueprint,
  targetBlueprint,
  selectedFeatureIds,
  apiKey,
}) {
  const agentId = `scout_${Date.now()}`;

  try {
    const sourceHtml = readFile(sourceFiles, 'index.html') ?? sourceFiles[0]?.content ?? '';
    const targetHtml = readFile(targetFiles, 'index.html') ?? targetFiles[0]?.content ?? '';

    // Resolve selected features from blueprint
    const sourceFeatures = sourceBlueprint?.features ?? [];
    const selectedFeatures = selectedFeatureIds.length > 0
      ? sourceFeatures.filter((f) => selectedFeatureIds.includes(f.id))
      : sourceFeatures;
    const featureNames = selectedFeatures.map((f) => f.name).join(', ') || 'all source features';

    writeMemory(agentId, 'selected_features', featureNames);

    // Build structured briefing instead of raw JSON dump
    const sourceBriefing = formatBlueprintBriefing(sourceBlueprint, 'SOURCE ARCHITECTURE');
    const targetBriefing = formatBlueprintBriefing(targetBlueprint, 'TARGET ARCHITECTURE');
    const featureBriefing = formatFeatureBriefing(selectedFeatures);
    const stateConflicts = detectStateConflicts(sourceBlueprint, targetBlueprint);

    // Detect integration points: source features with "out" entry points
    const integrationPoints = selectedFeatures
      .flatMap((f) => (f.entryPoints ?? [])
        .filter((ep) => ep.direction === 'out' || ep.direction === 'both')
        .map((ep) => `${f.name}: ${ep.name} [${ep.direction}] — ${ep.description}`)
      );

    // Check dependency warnings
    const selectedIds = new Set(selectedFeatureIds);
    const depWarnings = selectedFeatures
      .flatMap((f) => (f.dependencies ?? [])
        .filter((depId) => !selectedIds.has(depId))
        .map((depId) => `${f.name} depends on "${depId}" which is NOT selected`)
      );

    const userMessage = `${sourceBriefing}

${targetBriefing}

SELECTED FEATURES TO MIGRATE:
${featureBriefing}

${stateConflicts.length > 0 ? `STATE CONFLICTS:\n${stateConflicts.map((c) => `- "${c.name}": source=${c.source}, target=${c.target}`).join('\n')}` : 'STATE CONFLICTS: None'}

${integrationPoints.length > 0 ? `INTEGRATION POINTS (source outputs needing wiring):\n${integrationPoints.map((p) => `- ${p}`).join('\n')}` : 'INTEGRATION POINTS: None'}

${depWarnings.length > 0 ? `DEPENDENCY WARNINGS:\n${depWarnings.map((w) => `- ⚠ ${w}`).join('\n')}` : ''}

SOURCE HTML (${sourceFiles[0]?.path ?? 'index.html'}):
${sourceHtml.slice(0, 8000)}

TARGET HTML (${targetFiles[0]?.path ?? 'index.html'}):
${targetHtml.slice(0, 8000)}

Analyze the codebases and produce the merge plan JSON now.`;

    const raw = await callClaude(apiKey, config.models.small, {
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }, { temperature: 0.2, maxOutputTokens: 2048 });

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON in scout response');
      result = JSON.parse(match[0]);
    }

    return {
      success: true,
      summary: result.summary ?? '',
      plan: (result.plan ?? []).map((s) => ({ ...s, status: 'pending' })),
      questions: result.questions ?? [],
    };
  } catch (err) {
    console.error('[ScoutAgent] error:', err.message);
    return { success: false, error: err.message };
  } finally {
    clearMemory(agentId);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add server/agents/scoutAgent.js
git commit -m "feat(scout-agent): use structured briefings, detect state conflicts and integration points"
```

---

### Task 10: Update Merge Agent to receive target blueprint

**Files:**
- Modify: `server/agents/mergeAgent.js`
- Modify: `server/routes/merge.js`
- Modify: `src/hooks/useMergeStream.ts`

- [ ] **Step 1: Update mergeAgent.js to accept and use targetBlueprint**

In `server/agents/mergeAgent.js`, add import for formatters at line 1:

```javascript
import { callClaude, readFile, formatBlueprintBriefing, formatFeatureBriefing } from './tools.js';
```

Update the function signature (line 29) to include `targetBlueprint`:

```javascript
export async function runMergeAgent({
  sourceFiles,
  targetFiles,
  plan,
  answers,
  selectedFeatureIds,
  sourceBlueprint,
  targetBlueprint,
  emit,
  apiKey,
}) {
```

Update the SYSTEM_PROMPT (lines 5-23) — add awareness of blueprints:

```javascript
const SYSTEM_PROMPT = `You are a Merge Agent for a collaborative prototyping tool called Collab Studio.

Your job: intelligently merge a SOURCE HTML prototype into a TARGET HTML prototype, bringing in only the selected features.

You receive:
- Architecture briefings for both source and target (pattern, init flow, state model)
- The feature names and their behavior/entry points to migrate from source into target
- A step-by-step merge plan
- Answers to any conflict questions (font choice, CSS method, etc.)
- The full source HTML
- The full target HTML

Output rules:
- Output ONLY the complete merged HTML document. No markdown fences, no explanation.
- Bring in the selected features from source, adapted to match the target's conventions
- Preserve all existing features from the target
- If source and target have different architecture patterns, adapt the source features to fit the target's pattern
- Wire entry points: if a source feature emits events (direction: "out"), connect them to appropriate handlers in the target
- Reconcile state: if both prototypes have state variables, merge them without duplication
- If source uses Tailwind but target uses inline CSS: convert to inline CSS
- If source uses CSS variables but target uses hardcoded values: adapt accordingly
- Apply conflict resolutions exactly as specified in the answers
- The output must be a complete, valid, self-contained HTML document with no broken references`;
```

Update the user message construction (lines 73-85) to include briefings:

```javascript
    // Build architecture context from blueprints
    const sourceBriefing = formatBlueprintBriefing(sourceBlueprint, 'SOURCE ARCHITECTURE');
    const targetBriefing = formatBlueprintBriefing(targetBlueprint, 'TARGET ARCHITECTURE');
    const featureBriefing = formatFeatureBriefing(selectedFeatures);

    const userMessage = `${sourceBriefing}

${targetBriefing}

SELECTED FEATURES TO BRING FROM SOURCE:
${featureBriefing}

MERGE PLAN:
${planText || '1. Intelligently merge selected features from source into target'}
${answersText}

SOURCE HTML:
${sourceHtml.slice(0, 12000)}

TARGET HTML:
${targetHtml.slice(0, 12000)}

Output the complete merged HTML document now. No markdown fences — raw HTML only.`;
```

- [ ] **Step 2: Update merge route to pass targetBlueprint to execute**

In `server/routes/merge.js`, update the `/execute` route (line 149) to destructure `targetBlueprint`:

```javascript
  const { sourceFiles, targetFiles, plan, answers, selectedFeatureIds, sourceBlueprint, targetBlueprint } = req.body;
```

And pass it to `runMergeAgent` (lines 171-180):

```javascript
  const result = await runMergeAgent({
    sourceFiles,
    targetFiles,
    plan: plan ?? [],
    answers: answers ?? {},
    selectedFeatureIds: selectedFeatureIds ?? [],
    sourceBlueprint: sourceBlueprint ?? null,
    targetBlueprint: targetBlueprint ?? null,
    emit,
    apiKey,
  });
```

- [ ] **Step 3: Update useMergeStream.ts ExecuteParams**

In `src/hooks/useMergeStream.ts`, add `targetBlueprint` to `ExecuteParams` (line 24-32):

```typescript
interface ExecuteParams {
  sourceFiles: ProjectFile[];
  targetFiles: ProjectFile[];
  plan: MergePlanStep[];
  answers: Record<string, string>;
  selectedFeatureIds: string[];
  sourceBlueprint: Blueprint | null;
  targetBlueprint: Blueprint | null;
  instructions?: string;
}
```

- [ ] **Step 4: Verify module loads**

Run: `node -e "import('./server/agents/mergeAgent.js').then(() => console.log('OK')).catch(e => console.error(e.message))"`
Expected: "OK"

- [ ] **Step 5: Commit**

```bash
git add server/agents/mergeAgent.js server/routes/merge.js src/hooks/useMergeStream.ts
git commit -m "feat(merge): pass targetBlueprint to merge agent, use structured briefings"
```

---

## Chunk 5: Verify & Update MergeModal caller

### Task 11: Update MergeModal to pass targetBlueprint to execute

**Files:**
- Find and modify: the component that calls `executeMerge` to pass `targetBlueprint`

- [ ] **Step 1: Find where executeMerge is called**

Run: `grep -rn "executeMerge" src/`

Look for calls that construct the `ExecuteParams` object and ensure `targetBlueprint` is included.

- [ ] **Step 2: Add targetBlueprint to the executeMerge call**

In the MergeModal component (likely `src/components/canvas/MergeModal.tsx`), find the `executeMerge` call and add `targetBlueprint: baseBranch.blueprint ?? null` (or whichever branch is the target).

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/canvas/MergeModal.tsx
git commit -m "fix(MergeModal): pass targetBlueprint to merge execute call"
```

---

### Task 12: Run full test suite and verify

- [ ] **Step 1: Run tests**

Run: `npx vitest run 2>&1 | tail -30`
Expected: All tests pass.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Start dev server and verify it boots**

Run: `npm run dev` (kill after verifying it starts)
Expected: Both Vite and Express start without errors.

- [ ] **Step 4: Commit any remaining fixes**

If any fixes were needed, commit them with descriptive messages.

---

### Task 13: Update docs/ai-system.md

**Files:**
- Modify: `docs/ai-system.md`

- [ ] **Step 1: Update the Blueprint Agent section**

Update the documentation to reflect:
- New schema fields (architecture, behavior, state, entryPoints, codeRegions)
- Tiered model selection (large for initial, small for incremental)
- Conversation context injection
- Structured briefings in merge agents

Focus on the Blueprint Agent and merge system integration sections. Keep the same document structure, just update the content.

- [ ] **Step 2: Commit**

```bash
git add docs/ai-system.md
git commit -m "docs: update ai-system.md for blueprint redesign"
```
