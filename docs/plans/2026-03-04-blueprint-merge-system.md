# BLUEPRINT-Powered Merge System

## Technical Implementation for AI Collab Studio

**Date:** March 2026
**Status:** Design document -- not yet implemented

---

## Table of Contents

1. [The Problem We're Solving](#1-the-problem-were-solving)
2. [Why AI Makes This Hard (Statelessness Explained)](#2-why-ai-makes-this-hard)
3. [Why a Single Prompt Is Not Enough](#3-why-a-single-prompt-is-not-enough)
4. [The BLUEPRINT Solution](#4-the-blueprint-solution)
5. [The Agentic Architecture](#5-the-agentic-architecture)
6. [How the Merge Flow Works](#6-how-the-merge-flow-works)
7. [Technical Architecture](#7-technical-architecture)
8. [Implementation Guide](#8-implementation-guide)
9. [What This Means for Branching and Merging](#9-what-this-means-for-branching-and-merging)

---

## 1. The Problem We're Solving

Collab Studio lets teams create divergent prototypes on a shared visual canvas. In this example, a team is working on a landing page might have six different versions: one dark mode, one mobile-first, one with a pricing section, one with a video hero. Each was "vibe coded", built through conversation with AI.

The creative part works. The hard part comes when the team says: **"We love the hero from version A and the pricing from version C. Combine them."**

Today, this requires someone to:
- Open both prototypes side by side
- Describe what they want to keep from each ("the two-column hero with the blue button, but keep the dark background from the other one")
- Hope the AI reproduces both accurately
- Manually verify nothing was lost or garbled

This turns a creative decision ("combine these ideas") into a technical audit ("did the AI get the CSS right?"). It's the exact bottleneck that stops non-technical collaborators from contributing meaningfully.

And this is only for simple single-file prototypes. As projects grow -- multiple files, frontend/backend separation, databases, modular component libraries -- the complexity of merging explodes. A human can't even describe what needs to move, let alone verify it was done correctly.

**The root cause is not the AI's capability. It's the AI's lack of context -- and the lack of an intelligent system to manage that context.**

---

## 2. Why AI Makes This Hard

### The Stateless Nature of Generative AI

This section is essential background for anyone building with AI tools. If you understand this, everything else in this document will make sense.

**Every AI conversation starts from zero.** When you open ChatGPT, Claude, or Gemini and ask it to write code, the AI has no memory of:
- What it wrote for you yesterday
- What your project looks like
- What your teammate's project looks like
- What changes were made since the last conversation

This is called **statelessness**. The AI is like a brilliant contractor who shows up to your house every morning with amnesia. They can do amazing work -- but only if you explain the entire project from scratch each time.

### Why Statelessness Breaks Branching and Merging

Think about what happens when two people create prototypes independently:

```
         Main (v1)
        /        \
  Dark Mode    Mobile First
  (User A)     (User B)
```

User A spent 30 minutes chatting with AI to build a dark mode version. During that conversation, the AI understood the layout, the color system, the component structure. It made smart decisions based on that accumulated context.

User B did the same for a mobile-first version. Different conversation, different context, different AI "understanding."

**Now they want to merge.** The problem:

- The AI that helped User A doesn't exist anymore. That conversation is closed. The context is gone.
- The AI that helped User B -- same thing. Gone.
- A new AI session that tries to merge these two prototypes starts from **zero context** about either one.

This is like asking a new contractor to combine two houses built by two different teams -- but the blueprints were thrown away and all you have is the finished houses. They'd have to reverse-engineer the structure, guess at the intent, and hope for the best.

### The Context Window: Your AI's Short-Term Memory

Modern AI models do have a "context window" -- a limited amount of text they can consider at once (roughly 100,000-1,000,000 tokens depending on the model). You could paste both prototypes' code into a single prompt.

But raw code is a terrible way to transfer understanding:

- **600 lines of code** tells you *what* exists but not *why* it was built that way
- A multi-file project with 20+ files can't even fit in a single prompt
- The AI must re-derive structure, intent, and relationships from scratch
- There's no map of components, no changelog, no design rationale
- Token limits mean you can't include everything

It's the difference between handing someone a blueprint vs. handing them a pile of bricks and saying "figure it out."

### The Key Insight

**The problem isn't that AI can't merge code. The problem is that AI lacks the structured context to merge *intelligently* -- and for complex projects, a single AI call cannot manage that context alone.**

---

## 3. Why a Single Prompt Is Not Enough

### The Current Approach: One Big Prompt

Our current merge system works like this:

```
[User selects some tags] + [Both prototypes' code] --> ONE API CALL --> [Merged result]
```

This is like asking someone to renovate two houses into one... in a single breath. No walking through the rooms, no measuring, no planning. Just: "here are both blueprints, go."

It has fundamental limitations:

**It can't explore.** A single prompt gets the code dumped into it. It can't say "wait, let me look at how this component connects to that one" or "I need to check what database schema this relies on." It processes what it's given, once.

**It can't scale to multi-file projects.** Today our prototypes are single HTML files. But as projects grow to include:
- Separate frontend components (`Header.tsx`, `PricingCard.tsx`, `Layout.tsx`)
- Backend API routes (`/api/auth`, `/api/products`)
- Database schemas and migrations
- Configuration files, environment variables
- Shared utility libraries

...you simply cannot paste everything into one prompt. And even if you could, the AI would drown in irrelevant context.

**It can't plan.** A merge isn't one action -- it's a sequence of decisions. "First I need to understand how the auth system works in project A, then check if project B has a compatible user model, then plan the integration, then execute file by file, then verify nothing broke." A single prompt can't do this.

**It can't verify its own work.** After generating merged code, a single prompt can't run it, check for errors, or fix issues. It produces output and hopes for the best.

### The Solution: An Agentic System

The tools that actually work well for complex code operations -- Claude Code, Cursor, Windsurf -- don't use single prompts. They use **agents**: AI systems that have:

- **Tools** -- the ability to read files, search code, run commands, write files
- **Memory** -- a working context that persists across multiple steps
- **Planning** -- the ability to break a task into steps and execute them in order
- **Iteration** -- the ability to check their work and fix mistakes

This is the architecture Collab Studio needs for merging. Not a prompt with enhanced context, but **an intelligent agent (or team of agents) that can navigate, understand, plan, and execute a merge autonomously.**

---

## 4. The BLUEPRINT Solution

### What Is a BLUEPRINT?

A `BLUEPRINT.md` is a structured document that captures everything important about a prototype. Think of it as the prototype's "identity card" -- a living summary that is:

- **Human-readable** -- any team member can open it and understand what the prototype is (We are still debating if the user should have access or not to this)
- **AI-readable** -- structured enough that agents can parse it precisely
- **Auto-generated** -- created and updated by a dedicated agent, so users don't maintain it manually
- **Always current** -- a dedicated agent updates it every time the prototype's code changes
- **Scale-agnostic** -- works for a single HTML file or a 50-file full-stack app

### BLUEPRINT Structure for a Simple Prototype

```markdown
# Hero Redesign

> Two-column layout with product mockup on right and blue CTA

## Purpose
Landing page variant exploring a confidence-driven messaging approach.
Branched from "Main" to test whether a two-column hero converts better
than the centered layout.

## Tech Stack
- Single-file HTML with inline CSS
- Google Fonts: Inter (400, 500, 600, 700)
- No JavaScript dependencies
- Responsive: desktop-first with mobile breakpoints

## File Structure
- `index.html` -- Single-file prototype containing all markup and styles

## Features & Components
- **Navigation Bar** -- Fixed top nav with logo, 4 links, blue CTA button. Sits in `<nav>` element.
- **Hero Section** -- Two-column layout: left side has headline "Build and ship with confidence", subtext, and blue CTA button. Right side has product mockup screenshot. Contained in `<header>`.
- **Features Grid** -- Three cards in a row showing platform capabilities with icons, titles, and short descriptions. Located in `<section id="features">`.
- **Testimonials** -- Customer quotes carousel from 3 users. Located in `<section id="social-proof">`.
- **Footer** -- Minimal footer with copyright and social links.

## Design Tokens
- Primary color: #2563eb (blue-600)
- Background: #ffffff
- Text primary: #1e293b (slate-800)
- Font: Inter, system-ui, sans-serif

## Change History
1. Created from "Main" branch
2. Changed hero from centered single-column to two-column (text left, image right)
3. Swapped CTA color from black to blue (#2563eb)
4. Added product mockup placeholder on right side of hero

## Parent
- **Branch:** Main
- **Relationship:** Direct child -- diverged to explore two-column hero layout
```

### BLUEPRINT Structure for a Multi-File Project

```markdown
# SaaS Dashboard

> Full-stack dashboard with auth, real-time data, and team management

## Purpose
Internal analytics dashboard for tracking team productivity metrics.
Branched from "Main" to add real-time WebSocket updates and role-based access.

## Tech Stack
- Frontend: React 18 + TypeScript + Tailwind CSS
- Backend: Express.js + Node.js
- Database: SQLite with Drizzle ORM
- Auth: JWT tokens with refresh rotation
- Real-time: WebSocket via Socket.io

## File Structure
- `src/components/` -- React UI components
  - `Dashboard.tsx` -- Main dashboard layout with metric cards
  - `TeamTable.tsx` -- Sortable team member table with role badges
  - `MetricCard.tsx` -- Reusable card showing a single KPI
  - `AuthGuard.tsx` -- Route wrapper that checks JWT validity
- `src/pages/` -- Route-level page components
  - `LoginPage.tsx` -- Email/password login form
  - `DashboardPage.tsx` -- Composes Dashboard + TeamTable + MetricCards
- `src/api/` -- Backend routes
  - `auth.ts` -- Login, logout, token refresh endpoints
  - `metrics.ts` -- GET /metrics, GET /metrics/:id
  - `team.ts` -- CRUD endpoints for team members
- `src/db/` -- Database layer
  - `schema.ts` -- Drizzle schema: users, metrics, teams tables
  - `migrations/` -- SQL migration files
- `src/hooks/` -- Custom React hooks
  - `useAuth.ts` -- Auth state + token management
  - `useWebSocket.ts` -- Real-time metric subscription
- `src/utils/` -- Shared utilities
- `package.json`, `tsconfig.json`, `tailwind.config.ts`

## Features & Components
- **Authentication System** -- JWT-based login with email/password. Tokens stored in httpOnly cookies. Refresh rotation prevents session hijacking. Files: `LoginPage.tsx`, `AuthGuard.tsx`, `useAuth.ts`, `auth.ts`.
- **Dashboard Layout** -- Responsive grid of MetricCards at top, TeamTable below. Auto-refreshes via WebSocket. Files: `Dashboard.tsx`, `DashboardPage.tsx`.
- **Metric Cards** -- Reusable card component showing KPI name, value, trend arrow, and sparkline chart. Files: `MetricCard.tsx`, `metrics.ts`.
- **Team Management** -- Sortable table with name, role, status columns. Supports add/edit/remove. Files: `TeamTable.tsx`, `team.ts`.
- **Real-Time Updates** -- WebSocket connection pushes metric changes to all connected clients. Files: `useWebSocket.ts`, server-side Socket.io setup.
- **Database Layer** -- SQLite with Drizzle ORM. Three tables: users (auth), metrics (KPIs), teams (members). Files: `schema.ts`, `migrations/`.

## Change History
1. Created from "Main" (static mockup)
2. Added Express backend with auth endpoints
3. Integrated SQLite + Drizzle for persistence
4. Built real-time WebSocket layer for live metric updates
5. Added role-based access (admin vs. viewer)

## Parent
- **Branch:** Main
- **Relationship:** Direct child -- evolved from static mockup to full-stack app
```

Notice the key difference: **Features & Components are described in terms of what they do and which files they span**, not just DOM selectors. This is critical because:

- A "feature" like "Authentication System" spans 4 files across frontend and backend
- Users select features to migrate, not files -- but the agent needs to know which files to touch
- The descriptions are AI-generated based on actual code analysis, not hardcoded tag lists

### When BLUEPRINTs Are Generated

| Event | Agent Responsible | Action |
|-------|-------------------|--------|
| New branch created | Blueprint Agent | Generates initial BLUEPRINT from all project files |
| User edits code via chat | Blueprint Agent | Updates BLUEPRINT with changes |
| Manual code edit | Blueprint Agent | Refresh triggered on save |
| After a merge | Blueprint Agent | New BLUEPRINT for the merged result |
| New file added/removed | Blueprint Agent | Updates file structure and affected features |
| User manually edits BLUEPRINT | Blueprint Agent | Respects manual edits, merges with auto-updates |

---

## 5. The Agentic Architecture

### Why Agents, Not Prompts

Think about how a skilled developer merges two codebases. They don't read everything at once. They:

1. **Skim both projects** to understand the high-level structure
2. **Deep-dive into the specific components** they need to migrate
3. **Plan the integration** -- what goes where, what needs adapting
4. **Execute step by step** -- moving files, adjusting imports, resolving conflicts
5. **Verify the result** -- does it run? Do the components work together?

This is a multi-step, tool-using process. It requires reading files on demand, making decisions based on what you find, and adjusting the plan as you go. A single prompt cannot do this. An agent can.

### The Agent Team

Collab Studio's merge system is powered by **four specialized agents**, each with a focused responsibility. They operate like a small team with clear roles:

```
┌─────────────────────────────────────────────────────┐
│                    COLLAB STUDIO                     │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐                   │
│  │  Snapshot    │  │  Blueprint  │                   │
│  │  Agent       │  │  Agent      │                   │
│  │             │  │             │                   │
│  │ Generates   │  │ Keeps       │                   │
│  │ visual      │  │ BLUEPRINT   │                   │
│  │ summaries   │  │ up to date  │                   │
│  │ for canvas  │  │ for every   │                   │
│  │ cards       │  │ branch      │                   │
│  └─────────────┘  └─────────────┘                   │
│                                                     │
│           When user triggers a merge:               │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐                   │
│  │  Scout       │  │  Merge      │                   │
│  │  Agent       │  │  Agent      │                   │
│  │             │  │             │                   │
│  │ Reads both  │  │ Executes    │                   │
│  │ codebases,  │  │ the merge   │                   │
│  │ understands │  │ file by     │                   │
│  │ requirements│  │ file, then  │                   │
│  │ plans the   │  │ verifies    │                   │
│  │ merge       │  │ the result  │                   │
│  └──────┬──────┘  └──────┬──────┘                   │
│         │   merge plan    │                          │
│         └────────────────►│                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Agent 1: Snapshot Agent

**Role:** Generates the visual summaries and descriptions shown on canvas branch cards.

**When it runs:** Every time a branch's code changes.

**What it does:**
- Reads the current code (all files in the branch)
- Generates a short, human-friendly description ("Dark navy background, white text, sticky nav, feature cards section")
- Identifies the key visual characteristics for the card thumbnail
- Outputs the title and description that appear on the canvas node

**Why it's separate:** This is a fast, lightweight operation that runs frequently. It doesn't need the deep understanding of the Blueprint Agent. It produces the quick summaries users see while browsing the canvas.

**Tools available:** Read files, generate text.

### Agent 2: Blueprint Agent

**Role:** Maintains the BLUEPRINT.md for every branch -- the structured context document that makes intelligent merging possible.

**When it runs:** On branch creation, after code changes, after merges.

**What it does:**
- Reads all files in the branch's project
- Analyzes the code structure: what frameworks are used, how files are organized, what features exist
- Identifies features and components -- not by hardcoded DOM selectors, but by semantic understanding of what the code does
- Maps features to the files that implement them (a feature like "auth" might span `LoginPage.tsx`, `useAuth.ts`, `auth.ts`, and `schema.ts`)
- Generates descriptive, human-readable component entries ("Authentication System -- JWT-based login with email/password...")
- Tracks change history across edits
- Manages its own memory: stores intermediate analysis results, clears stale data when code changes significantly

**Why it's separate:** BLUEPRINT generation requires deep code analysis that's different from the quick snapshot summaries. It needs to understand architecture, not just appearance. Running this as a dedicated agent means it can take its time to produce accurate results without blocking the UI.

**Tools available:** Read files, list directories, search code (grep/glob), generate structured text, read/write its own memory store.

### Agent 3: Scout Agent

**Role:** When a merge is triggered, the Scout navigates both codebases, understands the user's requirements, and produces a detailed merge plan.

**When it runs:** After the user selects components to merge in the merge modal.

**What it does:**
1. **Reads both BLUEPRINTs** to get the high-level map of each prototype
2. **Deep-dives into selected components** -- reads the actual files involved, understands how they work, what they depend on
3. **Identifies conflicts and dependencies** -- "the hero section in Source uses a `useAnimation` hook that doesn't exist in Target" or "both projects define a `Button` component with different APIs"
4. **Generates clarification questions** -- smart, targeted questions shown to the user in the merge modal ("Source uses Tailwind but Target uses inline CSS. Should I convert the migrated components to inline CSS, or add Tailwind to the Target?")
5. **Produces a merge plan** -- a step-by-step instruction set for the Merge Agent:
   ```
   MERGE PLAN:
   1. Copy src/components/HeroSection.tsx from Source to Target
   2. Adapt: change Tailwind classes to inline styles (Target convention)
   3. Copy src/hooks/useAnimation.ts from Source (dependency of HeroSection)
   4. Update Target's src/pages/HomePage.tsx to import and render HeroSection
   5. Update Target's src/components/Layout.tsx to accommodate new section
   6. No database changes needed
   7. No backend changes needed
   ```

**Why it's separate:** Scouting is read-only and exploratory. It doesn't modify code. This separation means:
- The Scout can explore freely without risk of breaking anything
- Its output (the merge plan) can be shown to the user for review before execution
- It manages context efficiently -- reading only what's needed, not dumping entire codebases

**Tools available:** Read files, list directories, search code, read BLUEPRINTs, write to its own working memory, generate merge plans.

### Agent 4: Merge Agent

**Role:** Executes the merge plan produced by the Scout. This is the only agent that writes code.

**When it runs:** After the Scout's plan is approved (either by the user or automatically for simple merges).

**What it does:**
1. **Receives the merge plan** from the Scout
2. **Executes step by step** -- copying files, adapting code, resolving imports, adjusting styles
3. **Verifies each step** -- after modifying a file, checks for syntax errors, import resolution, type errors
4. **Handles unexpected issues** -- if a step fails (e.g., a dependency is missing), it can adjust the plan or flag the issue
5. **Produces the final merged code** and triggers the Blueprint Agent to generate the new BLUEPRINT
6. **Creates the new branch** with all merged files

**Why it's separate:** The Merge Agent is the only agent with write permissions. This is an intentional safety boundary. The Scout plans, the Merge Agent executes. This separation means:
- Write operations are isolated to one agent with a clear plan
- The plan can be reviewed before execution
- If something goes wrong, the plan provides a clear audit trail
- The Merge Agent can be interrupted mid-execution without corrupting the Scout's analysis

**Tools available:** Read files, write files, create files, delete files, run validation commands, trigger other agents (Blueprint Agent for post-merge BLUEPRINT update).

### How Agents Manage Memory and Context

Each agent has its own working memory -- a small store of intermediate results that persists across steps within a single operation. This is how agents handle the context window limitation:

```
SCOUT AGENT MEMORY (during a merge analysis):
┌─────────────────────────────────────────────┐
│ source_blueprint: [loaded]                  │
│ target_blueprint: [loaded]                  │
│ selected_features: ["Hero Section", "Auth"] │
│ hero_files_analyzed:                        │
│   - HeroSection.tsx: uses useAnimation hook │
│   - useAnimation.ts: pure hook, no deps     │
│ auth_files_analyzed:                        │
│   - LoginPage.tsx: uses useAuth + AuthGuard │
│   - useAuth.ts: depends on auth.ts API      │
│   - auth.ts: depends on db/schema.ts        │
│   - schema.ts: defines users table          │
│ conflicts_found:                            │
│   - Both have Button component (different)  │
│   - Source uses Tailwind, Target inline CSS  │
│ dependencies_to_migrate:                    │
│   - useAnimation.ts (for Hero)              │
│   - useAuth.ts, auth.ts, schema.ts (for Auth)│
└─────────────────────────────────────────────┘
```

The agent doesn't load everything at once. It reads a file, extracts what matters, stores a summary in memory, then moves on. This is exactly how tools like Claude Code and Cursor work -- they navigate codebases incrementally rather than trying to swallow them whole.

**Memory lifecycle:**
- Created when an operation starts
- Updated as the agent reads files and makes decisions
- Cleared when the operation completes
- Never persisted across separate operations (each merge starts fresh, but uses the BLUEPRINT as persistent context)

---

## 6. How the Merge Flow Works

### Overview

```
Select 2 branches --> AI generates comparison --> User clicks features --> Scout plans --> User approves --> Merge Agent executes --> New branch
     (canvas)         (visual + descriptions)    (minimal text input)   (read-only)    (optional)        (writes code)         (with BLUEPRINT)
```

### Step 1: Select Prototypes

On the canvas, the user selects two branches to merge. They can:
- **Shift-click** two branch cards
- **Drag** one branch card onto another (existing behavior)

One branch is the **target** (receives changes -- the "base"). The other is the **source** (donates features). The user picks which is which in the merge modal.

### Step 2: AI-Generated Feature Comparison

The merge modal opens. Unlike the current system (hardcoded tag lists), the **Scout Agent immediately analyzes both prototypes** and generates a rich comparison view:

**Left panel: Source prototype preview**
- Renders the source prototype in an iframe
- Overlays clickable, highlighted regions on detected features/components
- Each region has a label pulled from the BLUEPRINT ("Hero Section", "Auth System", "Pricing Grid")
- Clicking a region selects that feature for migration
- Regions are AI-identified, not hardcoded -- they adapt to whatever the user actually built

**Right panel: Feature descriptions**
- Lists all features from the source's BLUEPRINT with rich descriptions
- Each feature shows:
  - **Name** (AI-generated, human-readable)
  - **Description** (what it does, not just what it looks like)
  - **Files involved** (for multi-file projects)
  - **Dependencies** (other features this one needs)
- Checking/unchecking syncs with the visual overlay
- Pre-selects features that don't conflict with the target (smart defaults)

**Bottom panel: Target preview**
- Shows the target prototype so users can see what they're merging *into*
- Highlights areas that will be affected by the selected source features

**Key UX principle:** The user primarily **clicks**, not types. The AI does the describing. The user only types if they want to override something ("keep the hero layout but change the heading text").

### Step 3: Scout Analysis and Clarification

After the user selects features, the Scout Agent does its deep analysis:

1. Reads the actual source files for selected features
2. Reads the corresponding areas of the target
3. Identifies conflicts, dependencies, and decisions

The Scout surfaces **smart, minimal questions** -- only when there's a genuine ambiguity that requires human judgment:

> "The source hero uses the Inter font family but the target uses Poppins throughout. Which should the merged version use?"
> - **Keep Poppins** (match target)
> - **Switch to Inter** (match source)
> - **Use both** (Inter for hero, Poppins elsewhere)

Questions are **multiple-choice whenever possible** to minimize typing. The Scout generates the options based on what it found in the code.

If there are no conflicts, the Scout skips this step entirely.

### Step 4: Plan Review (Optional)

For complex merges (multi-file, cross-stack), the Scout produces a visible merge plan:

```
Merge Plan:
1. ✅ Copy HeroSection.tsx from Source
2. ✅ Adapt: convert Tailwind classes to inline CSS
3. ✅ Copy useAnimation.ts (dependency)
4. ✅ Update HomePage.tsx to import HeroSection
5. ✅ Adjust Layout.tsx grid to accommodate new section
6. ⬜ No database changes needed
7. ⬜ No backend changes needed
```

The user can review this plan. For simple merges (single-file, no conflicts), this step is automatic.

### Step 5: Merge Execution

The Merge Agent takes the plan and executes step by step:

- Copies/modifies files according to the plan
- Adapts code conventions (if source uses Tailwind but target uses inline CSS, converts automatically)
- Resolves imports and dependencies
- Verifies syntax and structure after each step
- Reports progress back to the UI

### Step 6: New Branch Created

The system creates a new branch that is:
- A **child of the target** branch
- Has `mergeParentIds` pointing to the source branch
- Contains all merged files and a new BLUEPRINT (generated by Blueprint Agent)
- Appears on the canvas with a **merge edge** connecting back to the source
- A Snapshot Agent run generates the canvas card description

The new BLUEPRINT includes a merge record:

```markdown
## Merge History
- **Merged from:** Hero Redesign + Dark Mode
- **Date:** March 4, 2026
- **Features migrated:** Hero Section, Features Grid
- **Merge plan:** [link to plan or inline summary]
- **Conflicts resolved:** Font family (chose Poppins), Button component (kept Target's version)
```

---

## 7. Technical Architecture

### Data Model Changes

```typescript
interface Branch {
  // ... existing fields ...
  blueprint: Blueprint | null;
  files: ProjectFile[];  // For multi-file projects
}

interface ProjectFile {
  path: string;          // "src/components/Hero.tsx"
  content: string;       // File contents
  language: string;      // "typescript", "html", "css", etc.
}

interface Blueprint {
  title: string;
  summary: string;
  purpose: string;
  techStack: string[];
  fileStructure: FileEntry[];
  features: BlueprintFeature[];
  designTokens: Record<string, string>;
  changeHistory: string[];
  parent: { branch: string; relationship: string } | null;
  mergeHistory?: MergeRecord[];
  raw: string;
}

interface FileEntry {
  path: string;
  description: string;
}

interface BlueprintFeature {
  id: string;                  // "auth-system"
  name: string;                // "Authentication System"
  description: string;         // "JWT-based login with email/password..."
  files: string[];             // ["LoginPage.tsx", "useAuth.ts", "auth.ts"]
  dependencies: string[];      // ["database-layer"] -- other feature IDs
  visualRegion?: {             // For visual overlay mapping
    selector: string;          // CSS selector or element identifier
    label: string;             // Display label on the preview
  };
}

interface MergeRecord {
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  featuresMigrated: string[];
  mergePlan: MergePlanStep[];
  conflictsResolved: string[];
  timestamp: number;
}

interface MergePlanStep {
  action: 'copy' | 'modify' | 'create' | 'delete';
  file: string;
  description: string;
  status: 'pending' | 'done' | 'failed';
}
```

### Agent Implementation

Each agent is implemented as a server-side function with access to specific tools. Agents communicate through a shared context (the branch data and BLUEPRINTs stored in the project state) and through direct handoffs (Scout produces a plan, Merge Agent consumes it).

#### Agent Tool Sets

```typescript
// Tools available to each agent type

const SNAPSHOT_AGENT_TOOLS = {
  readFiles: true,      // Read project files
  generateText: true,   // Call AI model
  writeSnapshot: true,  // Update branch description/title
};

const BLUEPRINT_AGENT_TOOLS = {
  readFiles: true,       // Read all project files
  listDirectory: true,   // Explore file structure
  searchCode: true,      // Grep for patterns
  generateText: true,    // Call AI model
  writeBlueprint: true,  // Update branch BLUEPRINT
  readMemory: true,      // Read agent's working memory
  writeMemory: true,     // Write to agent's working memory
  clearMemory: true,     // Clear stale memory entries
};

const SCOUT_AGENT_TOOLS = {
  readFiles: true,        // Read specific files on demand
  listDirectory: true,    // Explore file structure
  searchCode: true,       // Grep for patterns, find usages
  readBlueprint: true,    // Read any branch's BLUEPRINT
  readMemory: true,       // Read agent's working memory
  writeMemory: true,      // Store intermediate analysis
  clearMemory: true,      // Clear when done
  generateQuestions: true, // Produce clarification questions
  writeMergePlan: true,   // Output the merge plan
  // NOTE: No write-to-files tool. Scout is read-only.
};

const MERGE_AGENT_TOOLS = {
  readFiles: true,          // Read source and target files
  writeFiles: true,         // Write merged files
  createFiles: true,        // Create new files in target
  deleteFiles: true,        // Remove files if needed
  readMergePlan: true,      // Read the Scout's plan
  triggerBlueprint: true,   // Trigger Blueprint Agent after merge
  triggerSnapshot: true,    // Trigger Snapshot Agent after merge
  validateCode: true,       // Check syntax, imports, types
  // NOTE: Only agent with write permissions.
};
```

#### Agent Execution Flow

```
User triggers merge
        │
        ▼
┌──────────────────┐
│   Scout Agent     │
│                  │
│ 1. Load both     │
│    BLUEPRINTs    │
│ 2. Read selected │
│    feature files │
│ 3. Analyze deps  │
│    & conflicts   │
│ 4. Generate      │◄──── User answers
│    questions     │      clarification
│ 5. Produce       │      questions
│    merge plan    │
└────────┬─────────┘
         │ merge plan
         ▼
┌──────────────────┐
│   Merge Agent     │
│                  │
│ 1. Read plan     │
│ 2. Execute step  │──── Progress updates
│    by step       │     to UI
│ 3. Validate each │
│    step          │
│ 4. Handle errors │
│ 5. Output merged │
│    files         │
└────────┬─────────┘
         │ merged files
         ▼
┌──────────────────┐     ┌──────────────────┐
│ Blueprint Agent   │     │ Snapshot Agent    │
│                  │     │                  │
│ Generate new     │     │ Generate canvas  │
│ BLUEPRINT for    │     │ card summary     │
│ merged branch    │     │ for new branch   │
└──────────────────┘     └──────────────────┘
```

### Server Architecture

The agents run server-side (in the Express backend) to:
- Keep API keys secure
- Allow longer-running operations without browser timeout
- Support streaming progress updates to the frontend via WebSocket or SSE

```
Frontend (React)                    Backend (Express + Agent Runtime)
┌─────────────────┐                 ┌─────────────────────────────┐
│ Merge Modal UI  │──── HTTP ──────►│ /api/merge/start             │
│                 │                 │   → Spawns Scout Agent       │
│ Progress bar    │◄─── SSE ───────│   → Streams progress         │
│                 │                 │                               │
│ Q&A interface   │──── HTTP ──────►│ /api/merge/answer             │
│                 │                 │   → Feeds answers to Scout   │
│                 │                 │                               │
│ Plan review     │──── HTTP ──────►│ /api/merge/execute            │
│                 │                 │   → Spawns Merge Agent       │
│                 │◄─── SSE ───────│   → Streams step progress    │
│                 │                 │                               │
│ Branch created  │◄─── HTTP ──────│   → Returns merged branch    │
└─────────────────┘                 └─────────────────────────────┘
```

### New Files

| File | Purpose |
|------|---------|
| `src/types/blueprint.ts` | Blueprint, BlueprintFeature, MergeRecord, MergePlanStep types |
| `src/types/agent.ts` | Agent tool definitions, agent message types, memory store types |
| `server/agents/snapshotAgent.ts` | **New** -- Snapshot Agent implementation |
| `server/agents/blueprintAgent.ts` | **New** -- Blueprint Agent implementation |
| `server/agents/scoutAgent.ts` | **New** -- Scout Agent implementation |
| `server/agents/mergeAgent.ts` | **New** -- Merge Agent implementation |
| `server/agents/tools.ts` | **New** -- Shared tool implementations (readFile, searchCode, etc.) |
| `server/agents/memory.ts` | **New** -- Agent memory store (create, read, update, clear) |
| `server/routes/merge.ts` | **New** -- Merge API endpoints with SSE streaming |
| `server/routes/blueprint.ts` | **New** -- BLUEPRINT generation/update endpoints |
| `src/components/canvas/MergeModal.tsx` | **Rewrite** -- Dual-panel feature comparison, click-to-select, Q&A, plan review |
| `src/components/canvas/FeatureOverlay.tsx` | **New** -- Visual feature regions on preview iframe |
| `src/components/ide/BlueprintPanel.tsx` | **New** -- BLUEPRINT view/edit in branch IDE |
| `src/hooks/useMergeStream.ts` | **New** -- SSE hook for streaming merge progress |
| `src/store/useProjectStore.ts` | **Update** -- Multi-file branch support, BLUEPRINT CRUD |

---

## 8. Implementation Guide

### Phase 1: Multi-File Branch Support

**Goal:** Branches can hold multiple files, not just a single HTML string. This is the foundation for everything else.

1. Add `files: ProjectFile[]` to the Branch type
2. Update branch creation to support file arrays
3. Update the code editor to handle multiple files (file tabs or tree)
4. Update the preview iframe to serve multi-file projects (use a simple bundler or iframe srcdoc with module scripts)
5. Backward compatible: single-file branches work by having `files: [{ path: "index.html", content: "..." }]`

### Phase 2: BLUEPRINT Infrastructure + Agents Foundation

**Goal:** Every branch gets a BLUEPRINT, maintained by the Blueprint Agent. Establish the agent runtime.

1. Set up the agent runtime on the server (tool definitions, memory store, execution loop)
2. Implement the Blueprint Agent with its tool set
3. Implement the Snapshot Agent
4. Auto-generate BLUEPRINTs for existing branches
5. Hook Blueprint Agent into branch creation and code edit flows
6. Hook Snapshot Agent into code change flows
7. Add BlueprintPanel to the branch IDE view
8. Display AI-generated descriptions on canvas cards (from Snapshot Agent)

### Phase 3: Merge Modal Redesign

**Goal:** Replace current merge modal with the AI-powered feature comparison UX.

1. Build the FeatureOverlay component for visual selection on iframe
2. Build the feature description panel from BLUEPRINT data
3. Sync visual selections with description panel
4. Add target preview panel
5. Implement the Q&A chat interface for clarification questions
6. Add merge plan review step
7. Add progress streaming UI

### Phase 4: Scout and Merge Agents

**Goal:** The full agentic merge pipeline works end-to-end.

1. Implement the Scout Agent with its tool set
2. Implement the Merge Agent with its tool set
3. Build the merge API endpoints with SSE streaming
4. Connect the frontend merge modal to the agent pipeline
5. Test with single-file merges first, then multi-file
6. Handle edge cases: large projects, missing dependencies, conflicting file names

### Phase 5: Polish and Hardening

1. Merge plan approval/rejection flow
2. "Undo merge" (revert to pre-merge state)
3. BLUEPRINT drift detection (code changed but BLUEPRINT stale)
4. Agent timeout and error recovery
5. Loading states and progress indicators throughout
6. Rate limiting and cost management for AI calls

---

## 9. What This Means for Branching and Merging

### The Mental Model

Traditional version control (Git) tracks **every line change** and merges mechanically. This works for developers because they understand code structure.

Collab Studio operates at a higher level. Our "merge" is a **semantic operation**: "take this feature from that prototype and integrate it into this one." The AI understands what an "authentication system" is -- it doesn't just copy-paste lines.

This is only possible because of the layered agent system:

1. **BLUEPRINTs give the map** -- agents know what features exist in each prototype and which files implement them
2. **The Scout provides intelligence** -- it reads actual code, finds real dependencies, and plans a real migration path
3. **The Merge Agent provides precision** -- it executes file by file, adapting to conventions, verifying as it goes
4. **User selections give intent** -- users click what they want, and the system figures out how to make it happen
5. **Clarification questions prevent guessing** -- when there's genuine ambiguity, the system asks instead of assuming

### How Branching Works With BLUEPRINTs

```
                    Main
          BLUEPRINT: navbar, hero, features, footer
          FILES: index.html
                 /        \
        Dark Mode          Mobile First
        BLUEPRINT:         BLUEPRINT:
        navbar(dark),      navbar(hamburger),
        hero(dark),        hero(stacked),
        auth(new),         pricing(new),
        features(dark)     features(responsive)
        FILES:             FILES:
        index.html         index.html
        auth.ts            pricing.tsx
        db/schema.ts       stripe-config.ts
              \            /
            Merged Version
            BLUEPRINT:
            navbar(dark+hamburger),
            hero(dark+stacked),
            auth(from Dark Mode),
            pricing(from Mobile First),
            features(dark+responsive)
            FILES:
            index.html (merged)
            auth.ts (from Dark Mode)
            db/schema.ts (from Dark Mode)
            pricing.tsx (from Mobile First)
            stripe-config.ts (from Mobile First)

            MERGE HISTORY:
            - Scout identified 2 conflicts (navbar style, feature layout)
            - User chose: dark navbar with hamburger menu, responsive features with dark theme
            - 3 files copied from source, 1 file merged, 2 files created
```

### Why This Is the Right Approach

1. **It solves the actual problem.** The bottleneck isn't AI capability -- it's context and planning. BLUEPRINTs provide context, agents provide planning.

2. **It's human-centered.** Users click features on a visual preview. They answer multiple-choice questions. They review a plan. They never need to think about files, imports, or code structure.

3. **It scales to complex projects.** The same agent architecture works for a single HTML file and a 50-file full-stack app. The Scout reads what it needs, plans what to do, and the Merge Agent executes. The BLUEPRINT adapts its structure to whatever the project contains.

4. **It's incrementally buildable.** Phase 1 (multi-file support) is useful on its own. Phase 2 (BLUEPRINTs) improves the existing merge. Each phase adds value independently.

5. **It mirrors how real tools work.** Claude Code, Cursor, and Windsurf all use agentic architectures with tools, memory, and planning. We're applying the same proven pattern to the specific problem of collaborative merging.

6. **It teaches the right mental model.** Your lab team will learn that building with AI is about designing agent systems -- giving AI the right tools, memory, and workflow -- not about writing clever prompts. This is the single most important lesson in AI-assisted development.

### What Could Go Wrong

| Risk | Mitigation |
|------|------------|
| BLUEPRINT drifts from actual code | Blueprint Agent auto-updates; drift detection warns user |
| Agent takes too long on large projects | Timeout limits; Scout reads selectively (guided by BLUEPRINT, not exhaustively) |
| Merge produces broken code | Merge Agent validates each step; user can revert; preview before committing |
| AI-generated feature descriptions are wrong | Users can edit BLUEPRINT manually; Scout verifies against actual code |
| Agent costs add up (multiple AI calls) | Use fast models (Flash) for routine ops; cache BLUEPRINTs; only call agents when needed |
| Multi-file preview is complex to render | Start with single-file preview; add multi-file support incrementally |
| Context window overflow on large projects | Agents read selectively, store summaries in memory; never load entire codebase at once |

---

## Appendix A: Comparison With Current System

| Aspect | Current System | BLUEPRINT + Agents |
|--------|---------------|-------------------|
| Component selection | Hardcoded tag list (8 tags) | AI-generated features from actual code |
| Context for AI | Raw code pasted into prompt | Structured BLUEPRINTs + selective code reading |
| Merge execution | Single API call | Multi-step agent with planning and verification |
| Project support | Single HTML files only | Any file structure (multi-file, full-stack) |
| Conflict handling | None -- AI guesses | Scout identifies conflicts, asks user |
| User input required | Select tags + free text | Click features + answer multiple-choice |
| Post-merge quality | Hope for the best | Merge Agent validates each step |
| Auditability | None | Merge plan + BLUEPRINT history |

## Appendix B: Agent System as a Platform Pattern

The agent architecture is not just for merging. Once the agent runtime is built (tools, memory, execution loop), the same pattern supports future features:

- **Refactoring Agent** -- user says "make this responsive", agent plans and executes across files
- **Review Agent** -- compares two branches and produces a human-readable diff summary
- **Test Agent** -- generates test cases for a prototype's key interactions
- **Deploy Agent** -- prepares a branch for deployment, checking for env vars, build requirements

Each of these is a new agent with specific tools, built on the same runtime. The investment in agent infrastructure pays compound returns.

---

*This document is a design specification. Implementation should follow the phased approach in Section 8. Each phase should be validated with the team before proceeding to the next.*
