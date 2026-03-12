# Collab AI Studio — Product Guide

> What the app does, who it's for, and how users interact with it.
> Read this doc to understand the purpose and user experience before building features.

---

## What Is Collab AI Studio?

A shared visual canvas for collaborative vibe coding. Teams build HTML prototypes through AI chat, then organize, fork, and merge their work on a visual tree — like visual version control for prototypes.

**The core problem:** When multiple people vibe-code prototypes, merging divergent work is painful. Non-technical contributors get sidelined by technical complexity. Collab AI Studio automates this with AI-generated BLUEPRINTs (structured prototype summaries) and a multi-agent merge system.

**Target users:** Teams with mixed technical backgrounds building UI prototypes together.

---

## Core Concepts

| Concept | What it is |
|---------|-----------|
| **Project** | A collection of branches. Users can have multiple projects, each with its own canvas. |
| **Branch** | A standalone HTML prototype. Each branch has its own code, chat history, and checkpoints. Branches live as nodes on the canvas. |
| **Checkpoint** | A saved version of a branch's code. Created automatically when the AI generates or modifies code via chat. Each checkpoint has a label and timestamp. |
| **Blueprint** | An AI-generated structured summary of a branch's code — features, tech stack, design tokens, file structure, change history. Blueprints are the AI's persistent memory and power intelligent merging. |
| **Snapshot** | A short AI-generated description (8–16 words) displayed on the canvas card for each branch. Helps users quickly understand what each prototype does without opening it. |
| **Fork** | Creating a new branch from an existing one. The child branch starts with a copy of the parent's latest checkpoint. |
| **Merge** | Combining features from one branch into another, producing a new child branch. Can be quick (direct) or full (with AI analysis and conflict resolution). |

---

## The Three Screens

### 1. Home Screen (`/`)

**Purpose:** Project hub — select, create, and manage projects.

**What the user sees:**
- Left sidebar with user profile (avatar, name, bio) and online collaborators list
- Main area with a grid of project cards showing:
  - Live scaled preview of each project's root branch
  - Project name, last updated time, collaborator avatars
- "New project" button to create a fresh canvas

**User actions:**
- Click a project card → loads that project and navigates to the Canvas screen
- Click "New project" → creates an empty project and opens it on the Canvas

**Key components:** `HomePage.tsx`, `GradientCard.tsx`, `Avatar.tsx`

---

### 2. Canvas Screen (`/project`)

**Purpose:** Visual version control — see the full tree of branches, fork, merge, and organize.

**What the user sees:**
- A pannable/zoomable canvas (React Flow) with branch cards as nodes
- Edges connecting parent → child branches (and special merge edges for blended branches)
- Each branch card (240×240px) shows:
  - Scaled preview of the prototype
  - AI-generated name and description (snapshot)
  - Hover actions: edit name, fork, merge, delete
  - Badge indicators: checkpoint count, comment count
- Top navigation bar with editable project name, "New Root" button, and global comments icon

**User actions:**
- **Click a branch card** → navigates to the Editor screen for that branch
- **Fork** (+ icon on hover) → creates a child branch with the parent's code
- **Select 2 branches** → a "Blend" bar appears at the bottom to initiate a merge
- **Merge** → opens the MergeModal (see below)
- **Rename/recolor** branches inline on the canvas
- **Pan & zoom** the canvas to navigate large trees
- **"New Root"** → creates a standalone branch (no parent) and opens the Editor

**AI-generated descriptions:** Branch cards display AI-generated names and descriptions that update automatically when code changes. These come from the Snapshot Agent and are designed to help users organize their project by understanding what each branch does at a glance. Descriptions can be manually pinned to prevent auto-updates.

**Key components:** `CanvasPage.tsx`, `ProjectCanvas.tsx`, `BranchNode.tsx`, `BranchEdge.tsx`, `BranchPreviewPopup.tsx`, `CanvasToolbar.tsx`, `GlobalCommentsPanel.tsx`

---

### 3. Editor Screen (`/branch/:branchId`)

**Purpose:** Vibe coding workspace — build prototypes through AI chat with live preview.

**What the user sees:**
- **Left panel: Chat** — conversation with the AI assistant. Users describe what they want, and the AI generates/modifies HTML code. Each AI response that produces code creates a new checkpoint.
- **Right panel: Preview** — live iframe rendering of the current code, with:
  - Device responsiveness controls (desktop, tablet, mobile)
  - Tabs for Code view, Blueprint view, and Comments
  - Comment pinning — click anywhere on the preview to leave a positioned comment
- **Top bar:** Branch breadcrumb (ancestry chain), branch actions (fork, merge, delete)

**User actions:**
- **Chat with AI** → describe features, request changes, iterate on the prototype
- **Revert** → each AI-generated code change has a revert button to go back to a previous checkpoint
- **Switch tabs** → view raw code, structured blueprint, or branch comments
- **Pin comments** → click on the preview to leave feedback at a specific position (x/y coordinates stored as percentages)
- **Fork/merge** from the branch actions toolbar
- **Navigate back** to the Canvas screen

**Key components:** `BranchPage.tsx`, `IDELayout.tsx`, `ChatPanel.tsx`, `ChatInput.tsx`, `ChatMessage.tsx`, `PreviewPanel.tsx`, `CodeViewer.tsx`, `BlueprintPanel.tsx`, `CommentsPanel.tsx`, `BranchBreadcrumb.tsx`, `BranchActions.tsx`

---

### Merge Modal (Popup)

**Purpose:** Guide users through merging features from one branch into another.

**When it appears:** Triggered from the Canvas screen when the user selects 2 branches and clicks "Blend," or from a branch's merge action.

**Two merge paths:**

1. **Quick Merge** — select features → execute immediately. Good for simple, single-file merges.
2. **Full Flow** — select features → AI analyzes both codebases (Scout Agent) → answers conflict questions → reviews merge plan → execute. Better for complex merges.

**The 5 steps:**

| Step | What happens |
|------|-------------|
| **Select** | User picks which branch is the base (foundation) and which is the contributor |
| **Features** | Visual feature selection on the contributor's preview. User can also write merge instructions. AI suggests merge prompts. |
| **QA** (full flow only) | Scout Agent analyzes both codebases, shows a merge plan, and asks clarification questions about conflicts |
| **Executing** | Merge Agent applies changes step-by-step with streaming progress |
| **Done** | New branch created. User can navigate to it. |

The merge produces a new child branch with `mergeParentIds` referencing both parents and a `MergeRecord` in its blueprint for audit trail.

**Key components:** `MergeModal.tsx`, `FeatureOverlay.tsx`

---

## User Journey

```
Home Screen                Canvas Screen                 Editor Screen
┌──────────┐    select     ┌──────────────┐    click     ┌──────────────┐
│ Projects │──────────────→│ Branch Tree  │─────────────→│ Chat + Code  │
│ Grid     │    project    │ (React Flow) │    branch    │ (IDE Layout) │
└──────────┘               └──────────────┘              └──────────────┘
     │                        │        │                       │
     │ create project         │ fork   │ select 2              │ chat → AI
     └────────────────────────┘        │                       │ generates code
                                       ▼                       │ → checkpoint
                                 ┌────────────┐                │ → snapshot updates
                                 │ MergeModal │                │ → blueprint updates
                                 │ (5 steps)  │                │
                                 └────────────┘                │
                                       │                       │
                                       │ creates new branch    │
                                       └───────────────────────┘
```

**Typical workflow:**
1. User creates or selects a project on the Home screen
2. On the Canvas, they see the branch tree and create new root branches or fork existing ones
3. They click into a branch to open the Editor, where they vibe-code through AI chat
4. As they code, the AI auto-generates snapshots (short descriptions) and blueprints (structured analysis)
5. Back on the Canvas, they can see how branches have evolved and merge features between them
6. The merge system uses blueprints to understand both codebases and merge intelligently

---

## What Makes This Different

- **Visual version control** — branches are spatial, not a text list. You see the shape of your project.
- **AI-generated context** — every branch self-documents. Snapshot descriptions and blueprints update automatically so the tree stays navigable.
- **Non-technical merging** — the multi-agent merge system handles the technical complexity. Users pick features visually and answer high-level conflict questions.
- **Collaborative** — designed for teams. Comments, presence indicators, and shared canvas state.
