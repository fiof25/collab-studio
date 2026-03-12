# Canvas Thumbnail Selector

## Problem

The canvas preview for each branch always shows the top of the page. When modifications are in the middle or bottom (e.g., a fun facts section, a park list), the canvas card doesn't reflect the interesting part. Users need a simple way to choose what region of their prototype is visible on the canvas.

## Design

### Data Model

**Branch type** (`src/types/branch.ts`):

Add an optional `previewScrollY` field to the `Branch` interface:

```typescript
previewScrollY?: number; // px offset into the 800px-wide viewport; 0 = top (default)
```

This is a per-branch setting. The canvas only ever shows the latest checkpoint, so there's no need for per-checkpoint granularity.

**Store** (`src/store/useProjectStore.ts`):

`updateBranch(id, patch)` already accepts partial branch updates — no changes needed. The Editor calls `updateBranch(branchId, { previewScrollY: value })`.

**Mock data** (`src/data/projects/`):

Add optional `previewScrollY` to the orchestrator's `BranchNode` interface, and destructure + forward it in `buildBranch()`:

```typescript
// In the BranchNode interface:
interface BranchNode {
  // ...existing fields...
  previewScrollY?: number;
}

// In buildBranch, destructure and forward:
function buildBranch(node: BranchNode): Branch {
  const { module: mod, parentId, position, createdAt, updatedAt, previewScrollY } = node;
  return {
    ...mod.metadata,
    parentId,
    position,
    createdAt,
    updatedAt,
    ...(previewScrollY !== undefined ? { previewScrollY } : {}),
    comments: mod.comments,
    checkpoints: [...],
  };
}

// Example tree entry in pawmatch/index.ts:
{
  module: funFacts,
  parentId: 'pm_branch_root',
  position: { x: 700, y: 420 },
  previewScrollY: 380,  // skip past the header to show the facts
  createdAt: now - day * 1,
  updatedAt: now - hour * 0.25,
},
```

### Editor UX (PreviewPanel)

**File:** `src/components/ide/PreviewPanel.tsx`

**Toolbar changes:**

1. **Remove** the `MessageCircle` (comment mode) button from the toolbar — it's already in the top nav bar
2. **Remove** the `commentMode` state, `pendingPin` state, `handleOverlayClick` handler, and the "Click anywhere to leave a comment" banner. The comment overlay `<div>` itself stays — it renders existing pinned comments (`CommentPin`) and allows clicking them to expand. Only the *placement* flow (click-to-create-pin) is removed.
3. **Add** a `Camera` icon button in the same position — labeled "Set thumbnail"

**Thumbnail selection mode:**

When the user clicks the Camera button:

1. `thumbnailMode` state is set to `true`
2. The preview area gets a semi-transparent dark overlay
3. A **highlight frame** appears over the preview:
   - Fixed aspect ratio matching the canvas card (240:138 ≈ 1.739:1)
   - Full width of the preview, height proportional
   - **Vertically draggable** — user drags it up/down to pick the visible region
   - Initial position: current `previewScrollY` value (or top if unset)
4. Two small buttons float below the frame:
   - **Checkmark** — confirms and saves the Y offset via `updateBranch(branchId, { previewScrollY })`
   - **X** — cancels and exits thumbnail mode
5. The Camera icon gets an active state (like the existing device toggle) when a non-zero `previewScrollY` is set, so users can see at a glance that a custom thumbnail region is configured

**Mapping drag position to previewScrollY:**

The preview iframe runs at full scale in the Editor (not the 0.3x canvas scale). The drag frame's Y position within the iframe container maps directly to the `previewScrollY` value. The frame's vertical position (in px from the top of the iframe content) is the stored value.

Since the Editor iframe might be scrollable, the frame position needs to account for the iframe's scroll state. The simplest approach: use the iframe container's scroll position + the frame's offset from the container top.

### Canvas Rendering (BranchNode)

**File:** `src/components/canvas/BranchNode.tsx`

Current setup:
- iframe is 800px wide, `iframeH` tall (≈460px)
- Scaled to 0.3x via CSS `transform: scale(0.3)`
- `transformOrigin: 'top left'`
- Container has `overflow: hidden` and `height: PREVIEW_H` (138px)

To apply `previewScrollY`:

Add a negative `marginTop` to the iframe. Since CSS margins are applied in the element's own coordinate space (before the CSS transform), the value is in unscaled pixels:

```typescript
const scrollY = data.previewScrollY ?? 0;

// The iframe style becomes:
style={{
  width: 800,
  height: iframeH + scrollY,  // extend height so content at the offset is rendered
  marginTop: -scrollY,        // shift up in pre-scale px; visible shift = scrollY * scale
  transform: `scale(${scale})`,
  transformOrigin: 'top left',
  pointerEvents: 'none',
  border: 'none',
  display: 'block',
}}
```

The `overflow: hidden` on the container clips everything outside the 138px visible area, so only the selected region shows.

**useBranchTree.ts**: Pass `previewScrollY` through to the canvas node data alongside `codeSnapshot`.

### Components Summary

| File | Change |
|------|--------|
| `src/types/branch.ts` | Add `previewScrollY?: number` to `Branch` |
| `src/components/canvas/BranchNode.tsx` | Apply `previewScrollY` offset to iframe marginTop |
| `src/hooks/useBranchTree.ts` | Pass `previewScrollY` to canvas node data |
| `src/types/canvas.ts` | Add `previewScrollY` to `BranchNodeData` |
| `src/components/ide/PreviewPanel.tsx` | Remove comment toggle, add Camera button + thumbnail selection overlay |
| `src/data/projects/pawmatch/index.ts` | Add `previewScrollY` to tree nodes |
| `src/data/projects/landing-page-redesign/index.ts` | Add `previewScrollY` to tree nodes (optional) |

### Out of Scope

- Horizontal panning (pages are assumed to be ~800px wide, matching the iframe)
- Zoom level control for canvas cards
- Per-checkpoint thumbnail settings
