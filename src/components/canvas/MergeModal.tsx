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
  variant: 'merge' | 'newBranch';
}

export function MergeModal({ variant }: MergeModalProps) {
  const { activeModal, closeModal, modalContext } = useUIStore();
  const { project, mergeBranches, createBranch } = useProjectStore();
  const pushToast = useUIStore((s) => s.pushToast);

  // newBranch state
  const [parentId, setParentId] = useState(
    (modalContext?.parentId as string) ?? (project?.rootBranchId ?? '')
  );
  const [newName, setNewName] = useState('');

  // merge state — pre-filled when triggered by drag, otherwise pick manually
  const contextSourceId = modalContext?.sourceId as string | undefined;
  const contextTargetId = modalContext?.targetId as string | undefined;
  const [sourceId, setSourceId] = useState(contextSourceId ?? '');
  const [targetId, setTargetId] = useState(contextTargetId ?? '');

  // Feature selection state
  const [sourceSelected, setSourceSelected] = useState<Set<string>>(new Set());
  const [targetSelected, setTargetSelected] = useState<Set<string>>(new Set());
  const [sourceNotes, setSourceNotes] = useState('');
  const [targetNotes, setTargetNotes] = useState('');

  const [loading, setLoading] = useState(false);

  // Sync context when modal opens
  useEffect(() => {
    if (activeModal === 'merge') {
      setSourceId(contextSourceId ?? '');
      setTargetId(contextTargetId ?? '');
      setSourceSelected(new Set());
      setTargetSelected(new Set());
      setSourceNotes('');
      setTargetNotes('');
    }
    if (activeModal === 'newBranch') {
      setParentId((modalContext?.parentId as string) ?? (project?.rootBranchId ?? ''));
      setNewName('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModal]);

  const open = variant === 'merge' ? activeModal === 'merge' : activeModal === 'newBranch';
  const branches = project?.branches ?? [];
  const activeBranches = branches.filter((b) => b.status === 'active' || b.status === 'merging');

  const sourceBranch = branches.find((b) => b.id === sourceId);
  const targetBranch = branches.find((b) => b.id === targetId);
  const parentBranch = branches.find((b) => b.id === parentId);

  const isDragTriggered = !!(contextSourceId && contextTargetId);

  const toggleSource = (id: string) =>
    setSourceSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleTarget = (id: string) =>
    setTargetSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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
    if (!sourceId || !targetId) return;
    setLoading(true);
    setTimeout(() => {
      const result = mergeBranches(sourceId, targetId);
      if (result) {
        const allFeats = [
          ...[...sourceSelected].map((id) => result.source.checkpoints.find((c) => c.id === id)?.label),
          ...[...targetSelected].map((id) => result.target.checkpoints.find((c) => c.id === id)?.label),
        ].filter(Boolean) as string[];
        const detail = allFeats.length ? ` — ${allFeats.join(', ')}` : '';
        pushToast({
          type: 'success',
          message: `"${toDisplayName(result.source.name)}" and "${toDisplayName(result.target.name)}" blended${detail}`,
        });
      }
      closeModal();
      setLoading(false);
    }, 900);
  };

  const handleCreate = () => {
    if (!parentId || !newName.trim()) return;
    setLoading(true);
    setTimeout(() => {
      createBranch(parentId, newName.trim(), `Branched off from ${parentBranch?.name}`);
      pushToast({ type: 'success', message: `"${newName.trim()}" created` });
      closeModal();
      setLoading(false);
    }, 600);
  };

  // ── New Branch variant ──────────────────────────────────────────────────────

  if (variant === 'newBranch') {
    return (
      <Modal open={open} onClose={closeModal} title="Branch off" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-ink-muted mb-1.5 block">Parent branch</label>
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
            <label className="text-xs text-ink-muted mb-1.5 block">Branch name</label>
            <input
              className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent-violet"
              placeholder="my-new-branch"
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
              Branch off
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Blend variant ───────────────────────────────────────────────────────────

  return (
    <Modal open={open} onClose={closeModal} title="Blend branches" size="lg">
      <div className="space-y-5">

        {isDragTriggered ? (
          /* Drag-triggered: straight to feature picker */
          sourceBranch && targetBranch ? (
            <FeaturePicker
              sourceBranch={sourceBranch}
              targetBranch={targetBranch}
              sourceSelected={sourceSelected}
              targetSelected={targetSelected}
              onSourceToggle={toggleSource}
              onTargetToggle={toggleTarget}
              sourceNotes={sourceNotes}
              targetNotes={targetNotes}
              onSourceNotesChange={setSourceNotes}
              onTargetNotesChange={setTargetNotes}
            />
          ) : null
        ) : (
          /* Toolbar-triggered: pick two branches, then feature picker */
          <div className="space-y-4">
            <p className="text-xs text-ink-muted">
              Select two branches to blend.
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
            {sourceBranch && targetBranch && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                <FeaturePicker
                  sourceBranch={sourceBranch}
                  targetBranch={targetBranch}
                  sourceSelected={sourceSelected}
                  targetSelected={targetSelected}
                  onSourceToggle={toggleSource}
                  onTargetToggle={toggleTarget}
                  sourceNotes={sourceNotes}
                  targetNotes={targetNotes}
                  onSourceNotesChange={setSourceNotes}
                  onTargetNotesChange={setTargetNotes}
                />
              </motion.div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={closeModal} className="flex-1">Cancel</Button>
          <Button
            variant="blend"
            onClick={handleBlend}
            loading={loading}
            disabled={!sourceId || !targetId}
            className="flex-1"
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
  sourceBranch: Branch;
  targetBranch: Branch;
  sourceSelected: Set<string>;
  targetSelected: Set<string>;
  onSourceToggle: (id: string) => void;
  onTargetToggle: (id: string) => void;
  sourceNotes: string;
  targetNotes: string;
  onSourceNotesChange: (v: string) => void;
  onTargetNotesChange: (v: string) => void;
}

function FeaturePicker({
  sourceBranch,
  targetBranch,
  sourceSelected,
  targetSelected,
  onSourceToggle,
  onTargetToggle,
  sourceNotes,
  targetNotes,
  onSourceNotesChange,
  onTargetNotesChange,
}: FeaturePickerProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 overflow-hidden">
      {/* Column headers */}
      <div className="flex border-b border-line">
        <div className="flex-1 px-4 py-2.5 flex items-center gap-2 border-r border-line">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: sourceBranch.color }} />
          <span className="text-xs font-semibold text-ink-primary truncate">
            {toDisplayName(sourceBranch.name)}
          </span>
        </div>
        <div className="flex-1 px-4 py-2.5 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: targetBranch.color }} />
          <span className="text-xs font-semibold text-ink-primary truncate">
            {toDisplayName(targetBranch.name)}
          </span>
        </div>
      </div>

      {/* Sub-labels */}
      <div className="flex border-b border-line">
        <div className="flex-1 px-4 pt-2.5 pb-1 border-r border-line">
          <p className="text-2xs text-ink-muted">Which features to include?</p>
        </div>
        <div className="flex-1 px-4 pt-2.5 pb-1">
          <p className="text-2xs text-ink-muted">Which features to include?</p>
        </div>
      </div>

      {/* Checkpoint checklist */}
      <div className="flex">
        <div className="flex-1 px-3 py-2 border-r border-line space-y-0.5">
          {sourceBranch.checkpoints.length === 0 ? (
            <p className="text-2xs text-ink-muted italic px-1 py-1">No checkpoints</p>
          ) : (
            sourceBranch.checkpoints.map((ckpt) => (
              <CheckItem
                key={ckpt.id}
                label={ckpt.label}
                checked={sourceSelected.has(ckpt.id)}
                onChange={() => onSourceToggle(ckpt.id)}
                color={sourceBranch.color}
              />
            ))
          )}
        </div>
        <div className="flex-1 px-3 py-2 space-y-0.5">
          {targetBranch.checkpoints.length === 0 ? (
            <p className="text-2xs text-ink-muted italic px-1 py-1">No checkpoints</p>
          ) : (
            targetBranch.checkpoints.map((ckpt) => (
              <CheckItem
                key={ckpt.id}
                label={ckpt.label}
                checked={targetSelected.has(ckpt.id)}
                onChange={() => onTargetToggle(ckpt.id)}
                color={targetBranch.color}
              />
            ))
          )}
        </div>
      </div>

      {/* Notes row */}
      <div className="flex border-t border-line">
        <div className="flex-1 px-3 py-2.5 border-r border-line">
          <textarea
            className="w-full bg-transparent text-2xs text-ink-primary placeholder:text-ink-muted/50 resize-none outline-none leading-relaxed"
            placeholder="Extra notes from this branch…"
            rows={2}
            value={sourceNotes}
            onChange={(e) => onSourceNotesChange(e.target.value)}
          />
        </div>
        <div className="flex-1 px-3 py-2.5">
          <textarea
            className="w-full bg-transparent text-2xs text-ink-primary placeholder:text-ink-muted/50 resize-none outline-none leading-relaxed"
            placeholder="Extra notes from this branch…"
            rows={2}
            value={targetNotes}
            onChange={(e) => onTargetNotesChange(e.target.value)}
          />
        </div>
      </div>
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
      <span className={['text-2xs leading-snug', checked ? 'text-ink-primary' : 'text-ink-muted'].join(' ')}>
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
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: branch.color }} />
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
