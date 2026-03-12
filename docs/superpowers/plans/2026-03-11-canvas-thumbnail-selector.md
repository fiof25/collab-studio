# Canvas Thumbnail Selector Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick which region of their prototype is shown as the canvas card thumbnail, and apply that offset in both the canvas and mock data.

**Architecture:** Add `previewScrollY` (number, px) to the Branch type. Canvas iframe shifts content via negative `marginTop`. Editor gets a Camera button that enters a thumbnail-selection overlay with a draggable frame. Mock data orchestrators forward the value through `buildBranch()`.

**Tech Stack:** React, TypeScript, Zustand, @xyflow/react, Lucide icons, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-11-canvas-thumbnail-selector-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/branch.ts` | Modify | Add `previewScrollY?: number` to `Branch` |
| `src/types/canvas.ts` | Modify | Add `previewScrollY?: number` to `BranchNodeData` |
| `src/hooks/useBranchTree.ts` | Modify | Pass `previewScrollY` through to canvas node data |
| `src/components/canvas/BranchNode.tsx` | Modify | Apply scroll offset to iframe via `marginTop` |
| `src/components/ide/PreviewPanel.tsx` | Modify | Remove comment toggle, add Camera button + thumbnail overlay |
| `src/data/projects/pawmatch/index.ts` | Modify | Add `previewScrollY` to `BranchNode` interface and `buildBranch()` |
| `src/data/projects/landing-page-redesign/index.ts` | Modify | Same as pawmatch orchestrator |

---

### Task 1: Data Model — Add `previewScrollY` to types

**Files:**
- Modify: `src/types/branch.ts:52-69` (Branch interface)
- Modify: `src/types/canvas.ts:4-16` (BranchNodeData interface)

- [ ] **Step 1: Add `previewScrollY` to Branch interface**

In `src/types/branch.ts`, add after `position`:

```typescript
  position: { x: number; y: number };
  previewScrollY?: number; // px offset for canvas thumbnail; 0 = top
  comments: Comment[];
```

- [ ] **Step 2: Add `previewScrollY` to BranchNodeData**

In `src/types/canvas.ts`, add after `codeSnapshot`:

```typescript
  codeSnapshot: string;
  previewScrollY?: number;
  collaborators: Collaborator[];
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: clean (no errors)

---

### Task 2: Data Flow — Pass `previewScrollY` through useBranchTree

**Files:**
- Modify: `src/hooks/useBranchTree.ts:19-31`

- [ ] **Step 1: Forward `previewScrollY` in node data mapping**

In `src/hooks/useBranchTree.ts`, add after the `codeSnapshot` line (line 25):

```typescript
        codeSnapshot: branch.checkpoints[branch.checkpoints.length - 1]?.codeSnapshot ?? '',
        previewScrollY: branch.previewScrollY,
        collaborators: branch.collaborators,
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean

---

### Task 3: Canvas Rendering — Apply scroll offset in BranchNode

**Files:**
- Modify: `src/components/canvas/BranchNode.tsx:108-160`

- [ ] **Step 1: Compute scrollY and apply to iframe style**

In `src/components/canvas/BranchNode.tsx`, after line 109 (`const iframeH = ...`), add:

```typescript
  const scrollY = (data.previewScrollY ?? 0);
```

Then replace the iframe `style` prop (lines 151-159):

```typescript
                style={{
                  width: 800,
                  height: iframeH + scrollY,
                  marginTop: -scrollY,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                  border: 'none',
                  display: 'block',
                }}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: clean

---

### Task 4: Mock Data — Wire `previewScrollY` through orchestrators

**Files:**
- Modify: `src/data/projects/pawmatch/index.ts`
- Modify: `src/data/projects/landing-page-redesign/index.ts`

- [ ] **Step 1: Update PawMatch orchestrator**

In `src/data/projects/pawmatch/index.ts`:

1. Add `previewScrollY?: number;` to the `BranchNode` interface (after `updatedAt`).

2. Update `buildBranch` destructuring and return:

```typescript
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
    checkpoints: [
      {
        id: `ckpt_${mod.metadata.id.replace('pm_branch_', '')}1`,
        branchId: mod.metadata.id,
        label: mod.metadata.description,
        timestamp: createdAt,
        thumbnailUrl: '',
        codeSnapshot: mod.code,
      },
    ],
  };
}
```

3. Add `previewScrollY` values to tree entries that benefit from a non-top crop:

- `funFacts`: `previewScrollY: 420` (show the fun facts cards, not the profile header)
- `nearbyParks`: `previewScrollY: 440` (show the map + park list)
- `traitsAndPortraits`: `previewScrollY: 350` (show the traits chips section)

- [ ] **Step 2: Update Landing Page Redesign orchestrator**

In `src/data/projects/landing-page-redesign/index.ts`:

1. Add `previewScrollY?: number;` to the `BranchNode` interface.

2. Update `buildBranch` with the same destructuring + forwarding pattern as PawMatch.

No specific `previewScrollY` values needed for landing page branches (they all look good from the top).

- [ ] **Step 3: Type-check and test**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean compile, all tests pass

---

### Task 5: Editor UX — Remove comment toggle, add Camera button + thumbnail overlay

**Files:**
- Modify: `src/components/ide/PreviewPanel.tsx`

- [ ] **Step 1: Clean up comment mode from toolbar**

In `src/components/ide/PreviewPanel.tsx`:

1. Remove `MessageCircle` from the lucide-react import, add `Camera`, `Check`.
2. Remove state: `commentMode`, `pendingPin`.
3. Remove `handleOverlayClick` function.
4. Remove the comment mode toggle `<button>` from the toolbar (lines 118-128).
5. Remove the `onClick={handleOverlayClick}` from the overlay div — keep the div itself (it still renders pinned `CommentPin` components). Change its `className` to always be `'absolute inset-0 pointer-events-none'`.
6. Remove the `commentMode` banner div ("Click anywhere to leave a comment").
7. Remove the `NewCommentPin` rendering block (the `{pendingPin && ...}` section).
8. Remove the `useEffect` that exits comment mode on tab switch.
9. Update `CommentPin` — remove the `commentMode` prop and always set `pointer-events-auto` on the pin bubble (it was conditional on `!commentMode`).

- [ ] **Step 2: Add thumbnail mode state and Camera button**

Add state:

```typescript
const [thumbnailMode, setThumbnailMode] = useState(false);
const [thumbY, setThumbY] = useState(0);
```

Read current `previewScrollY` from the branch:

```typescript
const currentScrollY = branch?.previewScrollY ?? 0;
```

Add the Camera button in the toolbar where the comment button was, after the device toggle divider:

```typescript
{/* Thumbnail selector */}
<button
  onClick={() => {
    setThumbY(currentScrollY);
    setThumbnailMode(true);
  }}
  title="Set canvas thumbnail"
  className={clsx(
    'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
    currentScrollY > 0
      ? 'text-accent-violet bg-accent-violet/10'
      : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-2'
  )}
>
  <Camera size={15} />
</button>
```

- [ ] **Step 3: Build the thumbnail selection overlay**

Add this inside the preview `<div>` container (the one with `overflow-hidden bg-surface-0`), after the iframe and its existing comment overlay, but inside the same relative-positioned wrapper:

```typescript
{/* Thumbnail selection overlay */}
{thumbnailMode && (
  <ThumbnailSelector
    containerHeight={/* height of the iframe container */}
    initialY={thumbY}
    onConfirm={(y) => {
      updateBranch(branchId, { previewScrollY: y });
      setThumbnailMode(false);
    }}
    onCancel={() => setThumbnailMode(false)}
  />
)}
```

- [ ] **Step 4: Implement ThumbnailSelector component**

Add at the bottom of `PreviewPanel.tsx` (as a local component, like `CommentPin`):

```typescript
function ThumbnailSelector({
  containerHeight,
  initialY,
  onConfirm,
  onCancel,
}: {
  containerHeight: number;
  initialY: number;
  onConfirm: (y: number) => void;
  onCancel: () => void;
}) {
  // The frame height matches the canvas card aspect ratio (240:138)
  // scaled to fill the container width
  const frameRatio = 138 / 240;
  const containerRef = useRef<HTMLDivElement>(null);
  const [frameY, setFrameY] = useState(initialY);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ mouseY: 0, startFrameY: 0 });

  const frameH = containerHeight * frameRatio;
  const maxY = Math.max(0, containerHeight - frameH);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStartRef.current = { mouseY: e.clientY, startFrameY: frameY };
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      const delta = e.clientY - dragStartRef.current.mouseY;
      const next = Math.min(maxY, Math.max(0, dragStartRef.current.startFrameY + delta));
      setFrameY(next);
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, maxY]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-30">
      {/* Dark overlay above the frame */}
      <div
        className="absolute inset-x-0 top-0 bg-black/50 transition-all"
        style={{ height: frameY }}
      />
      {/* The draggable frame */}
      <div
        onMouseDown={handleMouseDown}
        className={clsx(
          'absolute inset-x-0 border-2 border-accent-violet cursor-grab',
          dragging && 'cursor-grabbing'
        )}
        style={{ top: frameY, height: frameH }}
      >
        {/* Grab handle indicator */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
          <div className="w-8 h-1 rounded-full bg-white/60" />
        </div>
      </div>
      {/* Dark overlay below the frame */}
      <div
        className="absolute inset-x-0 bottom-0 bg-black/50 transition-all"
        style={{ top: frameY + frameH }}
      />
      {/* Confirm / Cancel buttons */}
      <div
        className="absolute flex gap-2 right-2"
        style={{ top: Math.min(frameY + frameH + 8, containerHeight - 36) }}
      >
        <button
          onClick={onCancel}
          className="w-7 h-7 rounded-lg bg-surface-1/90 backdrop-blur-sm border border-line flex items-center justify-center text-ink-muted hover:text-ink-primary transition-colors"
        >
          <X size={14} />
        </button>
        <button
          onClick={() => onConfirm(frameY)}
          className="w-7 h-7 rounded-lg bg-accent-violet text-white flex items-center justify-center hover:bg-accent-violet/90 transition-colors"
        >
          <Check size={14} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Pass containerHeight to ThumbnailSelector**

The preview container's height is dynamic. Use a ref to measure it:

```typescript
const previewContainerRef = useRef<HTMLDivElement>(null);
```

Attach it to the `<div>` that wraps the iframe (the one with `className="h-full bg-white rounded-lg overflow-hidden shadow-float relative ..."`).

Pass to ThumbnailSelector:

```typescript
containerHeight={previewContainerRef.current?.clientHeight ?? 600}
```

- [ ] **Step 6: Type-check and test**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean compile, all tests pass

- [ ] **Step 7: Manual verification**

Run: `npm run dev`

1. Open a PawMatch branch in the Editor
2. Verify the Camera icon appears in the preview toolbar
3. Click it — dark overlay should appear with a draggable frame
4. Drag the frame down, click checkmark
5. Navigate to Canvas — the branch card should show the selected region
6. Verify Camera icon shows active state (violet) when `previewScrollY > 0`
