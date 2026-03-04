import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Merge, GitBranch } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';
import { toDisplayName } from '@/utils/branchUtils';
import { blendHtml } from '@/utils/generateDescription';
import type { Branch } from '@/types/branch';

interface MergeModalProps {
  variant: 'merge' | 'newBranch' | 'newDraft';
}

export function MergeModal({ variant }: MergeModalProps) {
  const { activeModal, closeModal, modalContext } = useUIStore();
  const { project, mergeBranches, mergeMultipleBranches, createBranch, createRootBranch } = useProjectStore();
  const pushToast = useUIStore((s) => s.pushToast);

  // newBranch state
  const [parentId, setParentId] = useState(
    (modalContext?.parentId as string) ?? (project?.rootBranchId ?? '')
  );
  const [newName, setNewName] = useState('');

  // merge state — pre-filled when triggered by drag or multi-select, otherwise pick manually
  const contextSourceId = modalContext?.sourceId as string | undefined;
  const contextTargetId = modalContext?.targetId as string | undefined;
  const contextBranchIds = modalContext?.branchIds as string[] | undefined;
  const [sourceId, setSourceId] = useState(contextSourceId ?? '');
  const [targetId, setTargetId] = useState(contextTargetId ?? '');

  // Per-branch feature tags + freetext notes (keyed by branchId)
  const [branchFeatures, setBranchFeatures] = useState<Map<string, Set<string>>>(new Map());
  const [branchNotes, setBranchNotes] = useState<Map<string, string>>(new Map());

  const [loading, setLoading] = useState(false);

  // Sync context when modal opens
  useEffect(() => {
    if (activeModal === 'merge') {
      setSourceId(contextSourceId ?? '');
      setTargetId(contextTargetId ?? '');
      setBranchFeatures(new Map());
      setBranchNotes(new Map());
    }
    if (activeModal === 'newBranch') {
      setParentId((modalContext?.parentId as string) ?? (project?.rootBranchId ?? ''));
      setNewName('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModal]);

  const open = variant === 'merge'
    ? activeModal === 'merge'
    : variant === 'newDraft'
    ? activeModal === 'newDraft'
    : activeModal === 'newBranch';
  const branches = project?.branches ?? [];
  const activeBranches = branches.filter((b) => b.status === 'active' || b.status === 'merging');

  const sourceBranch = branches.find((b) => b.id === sourceId);
  const targetBranch = branches.find((b) => b.id === targetId);
  const parentBranch = branches.find((b) => b.id === parentId);

  // The resolved list of branches to blend
  const blendBranches: Branch[] = contextBranchIds
    ? (contextBranchIds.map((id) => branches.find((b) => b.id === id)).filter(Boolean) as Branch[])
    : [sourceBranch, targetBranch].filter(Boolean) as Branch[];

  const isDragOrMultiTriggered = !!(contextSourceId && contextTargetId) || !!contextBranchIds;

  const FEATURE_TAGS = ['Background', 'Text color', 'Typography', 'Layout', 'Color palette', 'Components', 'Spacing', 'Animations'];

  const toggleFeatureTag = (branchId: string, tag: string) => {
    setBranchFeatures((prev) => {
      const next = new Map(prev);
      const s = new Set(next.get(branchId) ?? []);
      s.has(tag) ? s.delete(tag) : s.add(tag);
      next.set(branchId, s);
      return next;
    });
  };

  // Toggle selection for the toolbar branch picker (select up to 2)
  const handleBranchClick = (id: string) => {
    if (sourceId === id) {
      setSourceId(targetId);
      setTargetId('');
    } else if (targetId === id) {
      setTargetId('');
    } else if (!sourceId) {
      setSourceId(id);
    } else if (!targetId) {
      setTargetId(id);
    }
  };

  const handleBlend = async () => {
    if (blendBranches.length < 2) return;
    setLoading(true);

    // Build per-branch inputs with feature tags + freetext notes
    const branchInputs = blendBranches.map((b) => {
      const code = b.checkpoints.at(-1)?.codeSnapshot ?? '';
      const tags = branchFeatures.get(b.id) ?? new Set<string>();
      const tagsStr = tags.size > 0 ? `Take specifically: ${[...tags].join(', ')}.` : '';
      const customNote = branchNotes.get(b.id) ?? '';
      const notes = [tagsStr, customNote].filter(Boolean).join(' ');
      return { name: toDisplayName(b.name), code, notes };
    });

    const names = blendBranches.map((b) => toDisplayName(b.name)).join(' + ');
    const primary = blendBranches[0];
    const secondaryParentIds = blendBranches.slice(1).map((b) => b.id);

    // AI blend — falls back to first branch's code if API unavailable
    const blendedCode = await blendHtml(branchInputs);
    const finalCode = blendedCode ?? branchInputs[0].code;

    const child = createBranch(primary.id, `Blend: ${names}`, '');
    useProjectStore.getState().updateBranch(child.id, {
      mergeParentIds: secondaryParentIds,
      ...(finalCode ? {
        checkpoints: [{
          id: child.checkpoints[0]?.id ?? 'ckpt_blend',
          branchId: child.id,
          label: 'Blended version',
          timestamp: Date.now(),
          thumbnailUrl: '',
          codeSnapshot: finalCode,
        }],
      } : {}),
    });

    pushToast({ type: 'success', message: `Blended into "${toDisplayName(child.name)}"` });
    closeModal();
    setLoading(false);
  };

  const handleCreate = () => {
    if (!parentId || !newName.trim()) return;
    setLoading(true);
    setTimeout(() => {
      createBranch(parentId, newName.trim(), '');
      pushToast({ type: 'success', message: `"${newName.trim()}" created` });
      closeModal();
      setLoading(false);
    }, 600);
  };

  // ── New Draft variant ───────────────────────────────────────────────────────

  if (variant === 'newDraft') {
    const handleCreateDraft = () => {
      if (!newName.trim()) return;
      setLoading(true);
      setTimeout(() => {
        createRootBranch(newName.trim(), '');
        pushToast({ type: 'success', message: `"${newName.trim()}" created` });
        closeModal();
        setLoading(false);
      }, 600);
    };

    return (
      <Modal open={open} onClose={closeModal} title="New draft" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-ink-muted leading-relaxed">
            Start a completely fresh draft — not branched from anything.
          </p>
          <div>
            <label className="text-xs text-ink-muted mb-1.5 block">Draft name</label>
            <input
              className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent-violet"
              placeholder="my-new-draft"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateDraft()}
              autoFocus
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={closeModal} className="flex-1">Cancel</Button>
            <Button
              variant="primary"
              onClick={handleCreateDraft}
              loading={loading}
              disabled={!newName.trim()}
              className="flex-1"
              icon={<GitBranch size={14} />}
            >
              Create draft
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── New Branch variant ──────────────────────────────────────────────────────

  if (variant === 'newBranch') {
    return (
      <Modal open={open} onClose={closeModal} title="New version" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-ink-muted mb-1.5 block">Based on</label>
            <select
              className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent-violet"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {toDisplayName(b.name)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-ink-muted mb-1.5 block">Version name</label>
            <input
              className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent-violet"
              placeholder="my-new-version"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={closeModal} className="flex-1">Cancel</Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={loading}
              disabled={!newName.trim() || !parentId}
              className="flex-1"
              icon={<GitBranch size={14} />}
            >
              Create version
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Blend variant ───────────────────────────────────────────────────────────

  const showPicker = !isDragOrMultiTriggered && blendBranches.length < 2;

  return (
    <Modal open={open} onClose={closeModal} title="Blend versions" size="2xl">
      <div className="space-y-6">

        {/* Step 1: Branch picker (only when toolbar-triggered with no pre-selection) */}
        {showPicker && (
          <div className="space-y-3">
            <p className="text-xs text-ink-muted">Choose two versions to blend together into a new branch.</p>
            <div className="grid grid-cols-2 gap-3">
              {activeBranches.map((b) => {
                const isSelected = sourceId === b.id || targetId === b.id;
                const bothSelected = !!(sourceId && targetId);
                return (
                  <BlendBranchCard
                    key={b.id}
                    branch={b}
                    selected={isSelected}
                    disabled={bothSelected && !isSelected}
                    onClick={() => handleBranchClick(b.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Visual feature picker */}
        {blendBranches.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center gap-4 overflow-x-auto pb-1 -mx-1 px-1"
          >
            {blendBranches.map((b) => {
              const latestCode = b.checkpoints[b.checkpoints.length - 1]?.codeSnapshot ?? '';
              return (
                <div key={b.id} className="flex flex-col gap-3 flex-shrink-0 w-[220px]">
                  {/* Preview thumbnail */}
                  <div className="relative h-52 rounded-2xl overflow-hidden bg-white border border-line/40">
                    {latestCode ? (
                      <iframe
                        srcDoc={latestCode}
                        className="absolute top-0 left-0 border-none pointer-events-none"
                        style={{ width: '1000px', height: '700px', transformOrigin: 'top left', transform: 'scale(0.22)' }}
                        sandbox="allow-scripts"
                        title={b.name}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-surface-2">
                        <span className="text-xs text-ink-muted">No preview yet</span>
                      </div>
                    )}
                  </div>

                  {/* Feature tags */}
                  <div>
                    <p className="text-xs font-medium text-ink-secondary mb-2">Take from this version</p>
                    <div className="flex flex-wrap gap-1.5">
                      {FEATURE_TAGS.map((tag) => {
                        const active = branchFeatures.get(b.id)?.has(tag) ?? false;
                        return (
                          <button
                            key={tag}
                            onClick={() => toggleFeatureTag(b.id, tag)}
                            className={[
                              'px-2 py-1 rounded-full text-[11px] font-medium border transition-all',
                              active
                                ? 'text-white border-transparent'
                                : 'text-ink-muted border-line hover:border-line-accent hover:text-ink-secondary',
                            ].join(' ')}
                            style={active ? { background: b.color, borderColor: b.color } : {}}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <textarea
                    className="w-full bg-surface-2 border border-line rounded-xl text-xs text-ink-primary placeholder:text-ink-muted/60 resize-none outline-none leading-relaxed px-3 py-2.5 focus:border-accent-violet transition-colors"
                    placeholder="Any extra notes… (e.g. keep the rounded corners, use the hero section)"
                    rows={3}
                    value={branchNotes.get(b.id) ?? ''}
                    onChange={(e) => setBranchNotes((prev) => new Map(prev).set(b.id, e.target.value))}
                  />
                </div>
              );
            })}
          </motion.div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" onClick={closeModal}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleBlend}
            loading={loading}
            disabled={blendBranches.length < 2}
            className="!bg-ink-primary !text-canvas hover:!opacity-80"
            icon={<Merge size={14} />}
          >
            Blend into new version
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BlendBranchCard({
  branch,
  selected,
  disabled,
  onClick,
}: {
  branch: Branch;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const latestCode = branch.checkpoints[branch.checkpoints.length - 1]?.codeSnapshot ?? '';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'w-full text-left rounded-2xl border overflow-hidden transition-all',
        selected
          ? 'border-accent-violet ring-1 ring-accent-violet/40'
          : disabled
          ? 'border-line opacity-40 cursor-not-allowed'
          : 'border-line hover:border-line-accent',
      ].join(' ')}
    >
      {/* Preview thumbnail */}
      <div className="relative h-36 overflow-hidden bg-white">
        {latestCode ? (
          <iframe
            srcDoc={latestCode}
            className="absolute top-0 left-0 border-none pointer-events-none"
            style={{ width: '1400px', height: '900px', transformOrigin: 'top left', transform: 'scale(0.30)' }}
            sandbox="allow-scripts"
            title={branch.name}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-2">
            <span className="text-xs text-ink-muted">No preview yet</span>
          </div>
        )}
        {selected && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent-violet flex items-center justify-center">
            <Check size={10} className="text-white" />
          </div>
        )}
      </div>
      {/* Label */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-2">
        <span className="text-xs font-medium text-ink-primary truncate flex-1">{toDisplayName(branch.name)}</span>
        {branch.description && (
          <span className="text-2xs text-ink-muted truncate max-w-[80px]">{branch.description}</span>
        )}
      </div>
    </button>
  );
}


