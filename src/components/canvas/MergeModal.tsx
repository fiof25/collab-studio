import { useState } from 'react';
import { motion } from 'framer-motion';
import { Merge, ArrowRight, GitBranch } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';
import { hexToRgba } from '@/utils/colorUtils';

interface MergeModalProps {
  variant: 'merge' | 'newBranch';
}

export function MergeModal({ variant }: MergeModalProps) {
  const { activeModal, closeModal, modalContext } = useUIStore();
  const { project, mergeBranches, createBranch } = useProjectStore();
  const pushToast = useUIStore((s) => s.pushToast);

  const [sourceId, setSourceId] = useState(
    (modalContext?.sourceId as string) ?? ''
  );
  const [targetId, setTargetId] = useState(
    (modalContext?.targetId as string) ?? (project?.rootBranchId ?? '')
  );
  const [parentId, setParentId] = useState(
    (modalContext?.parentId as string) ?? (project?.rootBranchId ?? '')
  );
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  const open = variant === 'merge' ? activeModal === 'merge' : activeModal === 'newBranch';
  const branches = project?.branches ?? [];

  const sourceBranch = branches.find((b) => b.id === sourceId);
  const targetBranch = branches.find((b) => b.id === targetId);
  const parentBranch = branches.find((b) => b.id === parentId);

  const handleBlend = () => {
    if (!sourceId || !targetId || !newName.trim()) return;
    setLoading(true);
    setTimeout(() => {
      mergeBranches(sourceId, targetId, newName.trim());
      pushToast({ type: 'success', message: `Blended into "${newName.trim()}"` });
      closeModal();
      setLoading(false);
    }, 1200);
  };

  const handleCreate = () => {
    if (!parentId || !newName.trim()) return;
    setLoading(true);
    setTimeout(() => {
      createBranch(parentId, newName.trim(), `Branched off from ${parentBranch?.name}`);
      pushToast({ type: 'success', message: `Created branch "${newName.trim()}"` });
      closeModal();
      setLoading(false);
    }, 600);
  };

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
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-ink-muted mb-1.5 block">Branch name</label>
            <input
              className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent-violet font-mono"
              placeholder="my-new-feature"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
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

  return (
    <Modal open={open} onClose={closeModal} title="Blend Branches" size="md">
      <div className="space-y-5">
        {/* Branch selectors */}
        <div className="flex items-center gap-3">
          <BranchPicker
            label="Source"
            branches={branches.filter((b) => b.id !== targetId)}
            value={sourceId}
            onChange={setSourceId}
          />
          <div className="flex-shrink-0 text-ink-muted mt-5">
            <ArrowRight size={18} />
          </div>
          <BranchPicker
            label="Target"
            branches={branches.filter((b) => b.id !== sourceId)}
            value={targetId}
            onChange={setTargetId}
          />
        </div>

        {/* Blend result preview */}
        {sourceBranch && targetBranch && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-line bg-surface-2 p-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Merge size={14} className="text-accent-pink" />
                <span className="text-xs font-semibold text-ink-secondary">Blend result</span>
                <div
                  className="ml-1 w-4 h-4 rounded-full flex-shrink-0"
                  style={{ background: sourceBranch.color }}
                />
                <span className="text-xs text-ink-muted">+</span>
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ background: targetBranch.color }}
                />
              </div>
              <input
                className="w-full bg-surface-3 border border-line rounded-xl px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent-pink font-mono"
                placeholder={`${sourceBranch.name}-blend`}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
          </motion.div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={closeModal} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="blend"
            onClick={handleBlend}
            loading={loading}
            disabled={!sourceId || !targetId || !newName.trim()}
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

function BranchPicker({
  label,
  branches,
  value,
  onChange,
}: {
  label: string;
  branches: { id: string; name: string; color: string; status: import('@/types/branch').BranchStatus }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const selected = branches.find((b) => b.id === value);
  return (
    <div className="flex-1">
      <label className="text-xs text-ink-muted mb-1.5 block">{label}</label>
      <div className="relative">
        <select
          className="w-full bg-surface-2 border border-line rounded-xl pl-8 pr-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent-violet appearance-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select branch...</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {selected && (
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
            style={{ background: selected.color }}
          />
        )}
      </div>
      {selected && (
        <div className="mt-1.5">
          <Badge status={selected.status} />
        </div>
      )}
    </div>
  );
}
