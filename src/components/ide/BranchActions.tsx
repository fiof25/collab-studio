import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Merge, Camera, MessageCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';
import { nanoid } from 'nanoid';

interface BranchActionsProps {
  branchId: string;
}

export function BranchActions({ branchId }: BranchActionsProps) {
  const navigate = useNavigate();
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const { getBranchById, updateBranch, deleteBranch } = useProjectStore();

  const branch = getBranchById(branchId);
  const isRoot = !branch?.parentId;

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFork = () => openModal('newBranch', { parentId: branchId });
  const handleMerge = () => openModal('merge', { sourceId: branchId });
  const handleComments = () => openModal('comments', { branchId });

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
    <div className="flex items-center gap-1.5">
      <Button variant="ghost" size="sm" icon={<Camera size={13} />} onClick={handleCheckpoint} title="Save version">
        Save version
      </Button>
      <Button variant="ghost" size="sm" icon={<MessageCircle size={13} />} onClick={handleComments}>
        Comments
      </Button>
      <Button variant="ghost" size="sm" icon={<GitBranch size={13} />} onClick={handleFork}>
        Branch off
      </Button>
      <Button variant="blend" size="sm" icon={<Merge size={13} />} onClick={handleMerge}>
        Blend
      </Button>

      {!isRoot && (
        <button
          onClick={handleDelete}
          title={confirmingDelete ? 'Click again to confirm' : 'Delete this branch'}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-sm font-medium transition-all border ${
            confirmingDelete
              ? 'border-red-500/60 text-red-400 bg-red-500/10'
              : 'border-line text-ink-muted hover:border-red-500/40 hover:text-red-400'
          }`}
        >
          <Trash2 size={13} />
          {confirmingDelete ? 'Confirm?' : ''}
        </button>
      )}
    </div>
  );
}
