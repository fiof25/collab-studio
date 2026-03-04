import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Merge, GitBranch, Check } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';
import { toDisplayName } from '@/utils/branchUtils';
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

  // Unified per-branch feature selection & notes (keyed by branchId)
  const [featureSelections, setFeatureSelections] = useState<Map<string, Set<string>>>(new Map());
  const [branchNotes, setBranchNotes] = useState<Map<string, string>>(new Map());

  const [loading, setLoading] = useState(false);

  // Sync context when modal opens
  useEffect(() => {
    if (activeModal === 'merge') {
      setSourceId(contextSourceId ?? '');
      setTargetId(contextTargetId ?? '');
      setFeatureSelections(new Map());
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

  const toggleFeature = (branchId: string, checkpointId: string) => {
    setFeatureSelections((prev) => {
      const next = new Map(prev);
      const s = new Set(next.get(branchId) ?? []);
      s.has(checkpointId) ? s.delete(checkpointId) : s.add(checkpointId);
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

  const handleBlend = () => {
    if (blendBranches.length < 2) return;
    setLoading(true);
    setTimeout(() => {
      const result = mergeMultipleBranches(blendBranches.map((b) => b.id));
      if (result) {
        const names = result.map((b) => `"${toDisplayName(b.name)}"`);
        const label = names.length === 2
          ? `${names[0]} and ${names[1]} blended`
          : `${names.length} versions blended`;
        pushToast({ type: 'success', message: label });
      }
      closeModal();
      setLoading(false);
    }, 900);
  };

  const handleCreate = () => {
    if (!parentId || !newName.trim()) return;
    setLoading(true);
    setTimeout(() => {
      createBranch(parentId, newName.trim(), `Based on ${parentBranch?.name}`);
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
        createRootBranch(newName.trim(), 'New draft');
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

  return (
    <Modal open={open} onClose={closeModal} title="Blend versions" size="lg">
      <div className="space-y-5">

        {isDragOrMultiTriggered ? (
          /* Drag or multi-select triggered: straight to feature picker */
          blendBranches.length >= 2 ? (
            <FeaturePicker
              branches={blendBranches}
              featureSelections={featureSelections}
              notes={branchNotes}
              onToggle={toggleFeature}
              onNoteChange={(branchId, val) => setBranchNotes((prev) => new Map(prev).set(branchId, val))}
            />
          ) : null
        ) : (
          /* Toolbar-triggered: pick two branches, then feature picker */
          <div className="space-y-4">
            <p className="text-xs text-ink-muted">
              Select two versions to blend.
            </p>
            <div className="flex flex-col gap-1.5">
              {activeBranches.map((b) => {
                const isSelected = sourceId === b.id || targetId === b.id;
                const bothSelected = !!(sourceId && targetId);
                return (
                  <BranchCard
                    key={b.id}
                    branch={b}
                    selected={isSelected}
                    disabled={bothSelected && !isSelected}
                    onClick={() => handleBranchClick(b.id)}
                  />
                );
              })}
            </div>

            {/* Feature picker appears once both branches are selected */}
            {blendBranches.length >= 2 && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                <FeaturePicker
                  branches={blendBranches}
                  featureSelections={featureSelections}
                  notes={branchNotes}
                  onToggle={toggleFeature}
                  onNoteChange={(branchId, val) => setBranchNotes((prev) => new Map(prev).set(branchId, val))}
                />
              </motion.div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={closeModal} className="flex-1">Cancel</Button>
          <Button
            variant="primary"
            onClick={handleBlend}
            loading={loading}
            disabled={blendBranches.length < 2}
            className="flex-1 !bg-ink-primary !text-canvas hover:!opacity-80"
            icon={<Merge size={14} />}
          >
            Blend
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface FeaturePickerProps {
  branches: Branch[];
  featureSelections: Map<string, Set<string>>;
  notes: Map<string, string>;
  onToggle: (branchId: string, checkpointId: string) => void;
  onNoteChange: (branchId: string, value: string) => void;
}

function FeaturePicker({ branches, featureSelections, notes, onToggle, onNoteChange }: FeaturePickerProps) {
  return (
    <div className="flex gap-3">
      {branches.map((b) => (
        <div key={b.id} className="flex-1 rounded-2xl border border-line bg-surface-2 p-3 space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.color }} />
            <span className="text-xs font-semibold text-ink-primary truncate">{toDisplayName(b.name)}</span>
          </div>
          <p className="text-2xs text-ink-secondary">Which features to include?</p>
          <div className="space-y-0.5">
            {b.checkpoints.length === 0 ? (
              <p className="text-2xs text-ink-secondary italic px-1 py-1">No checkpoints</p>
            ) : (
              b.checkpoints.map((ckpt) => (
                <CheckItem
                  key={ckpt.id}
                  label={ckpt.label}
                  checked={featureSelections.get(b.id)?.has(ckpt.id) ?? false}
                  onChange={() => onToggle(b.id, ckpt.id)}
                  color={b.color}
                />
              ))
            )}
          </div>
          <textarea
            className="w-full bg-surface-3 rounded-lg text-2xs text-ink-primary placeholder:text-ink-muted/50 resize-none outline-none leading-relaxed px-2 py-1.5"
            placeholder="Notes for this version…"
            rows={2}
            value={notes.get(b.id) ?? ''}
            onChange={(e) => onNoteChange(b.id, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

function CheckItem({
  label,
  checked,
  onChange,
  color,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onChange}
      className="w-full flex items-start gap-2 px-1.5 py-1 rounded-lg hover:bg-surface-3 transition-colors text-left group"
    >
      <div
        className={[
          'flex-shrink-0 mt-0.5 w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center transition-all',
          checked ? 'border-transparent' : 'border-line group-hover:border-line-accent',
        ].join(' ')}
        style={checked ? { background: color } : {}}
      >
        {checked && <Check size={9} className="text-white" />}
      </div>
      <span className="text-2xs leading-snug text-ink-primary">
        {label}
      </span>
    </button>
  );
}

function BranchCard({
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
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'w-full text-left px-2.5 py-2 rounded-xl border transition-all',
        selected
          ? 'border-accent-violet bg-accent-violet/10'
          : disabled
          ? 'border-line bg-surface-2 opacity-40 cursor-not-allowed'
          : 'border-line bg-surface-2 hover:border-line-accent hover:bg-surface-3',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-ink-primary truncate flex-1">
          {toDisplayName(branch.name)}
        </span>
        {selected && <Check size={11} className="text-accent-violet flex-shrink-0" />}
      </div>
      {branch.description && (
        <p className="text-2xs text-ink-muted truncate mt-0.5 pl-4">{branch.description}</p>
      )}
    </button>
  );
}
