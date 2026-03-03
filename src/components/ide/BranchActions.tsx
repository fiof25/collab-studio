import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, MessageCircle, Trash2 } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';
import { nanoid } from 'nanoid';

interface BranchActionsProps {
  branchId: string;
}

export function BranchActions({ branchId }: BranchActionsProps) {
  const navigate = useNavigate();
  const toggleCommentsPanel = useUIStore((s) => s.toggleCommentsPanel);
  const pushToast = useUIStore((s) => s.pushToast);
  const { getBranchById, updateBranch, deleteBranch } = useProjectStore();

  const branch = getBranchById(branchId);
  const isRoot = !branch?.parentId;

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openModal = useUIStore((s) => s.openModal);
  const handleFork = () => openModal('newBranch', { parentId: branchId });
  const handleComments = () => toggleCommentsPanel();

  const handleCheckpoint = () => {
    if (!branch) return;
    const label = `Version ${branch.checkpoints.length + 1}`;
    const newCheckpoint = {
      id: `ckpt_${nanoid(6)}`,
      branchId,
      label,
      timestamp: Date.now(),
      thumbnailUrl: '',
      codeSnapshot: branch.checkpoints[branch.checkpoints.length - 1]?.codeSnapshot ?? '',
    };
    updateBranch(branchId, { checkpoints: [...branch.checkpoints, newCheckpoint] });
    pushToast({ type: 'success', message: `Saved "${label}"` });
  };

  const handleDelete = () => {
    if (confirmingDelete) {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      deleteBranch(branchId);
      pushToast({ type: 'success', message: `"${branch?.name}" deleted` });
      navigate('/');
    } else {
      setConfirmingDelete(true);
      confirmTimer.current = setTimeout(() => setConfirmingDelete(false), 3000);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleComments}
        title="Comments"
        className="flex items-center justify-center w-8 h-8 rounded-xl text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
      >
        <MessageCircle size={15} />
      </button>

      <button
        onClick={handleCheckpoint}
        className="text-sm text-ink-muted hover:text-ink-primary transition-colors font-medium"
      >
        Save
      </button>

      <button
        onClick={handleFork}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ink-primary hover:opacity-80 text-canvas text-sm font-medium transition-opacity"
      >
        <GitBranch size={15} />
        New version
      </button>

      {!isRoot && (
        <button
          onClick={handleDelete}
          title={confirmingDelete ? 'Click again to confirm' : 'Delete this version'}
          className={`flex items-center justify-center w-8 h-8 rounded-xl transition-colors ${
            confirmingDelete
              ? 'text-red-400 bg-red-500/10'
              : 'text-ink-muted hover:text-red-400 hover:bg-surface-2'
          }`}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
