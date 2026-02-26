import { GitBranch, Merge, Camera, MessageCircle } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';
import { nanoid } from 'nanoid';

interface BranchActionsProps {
  branchId: string;
}

export function BranchActions({ branchId }: BranchActionsProps) {
  const openModal = useUIStore((s) => s.openModal);
  const pushToast = useUIStore((s) => s.pushToast);
  const { getBranchById, updateBranch } = useProjectStore();

  const branch = getBranchById(branchId);

  const handleFork = () => {
    openModal('newBranch', { parentId: branchId });
  };

  const handleMerge = () => {
    openModal('merge', { sourceId: branchId });
  };

  const handleComments = () => {
    openModal('comments', { branchId });
  };

  const handleCheckpoint = () => {
    if (!branch) return;
    const label = `Snapshot ${branch.checkpoints.length + 1}`;
    const newCheckpoint = {
      id: `ckpt_${nanoid(6)}`,
      branchId,
      label,
      timestamp: Date.now(),
      thumbnailUrl: '',
      codeSnapshot: branch.checkpoints[branch.checkpoints.length - 1]?.codeSnapshot ?? '',
    };
    updateBranch(branchId, {
      checkpoints: [...branch.checkpoints, newCheckpoint],
    });
    pushToast({ type: 'success', message: `Saved "${label}"` });
  };

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        icon={<Camera size={13} />}
        onClick={handleCheckpoint}
        title="Save snapshot"
      >
        Snapshot
      </Button>
      <Button
        variant="ghost"
        size="sm"
        icon={<MessageCircle size={13} />}
        onClick={handleComments}
      >
        Comments
      </Button>
      <Button
        variant="ghost"
        size="sm"
        icon={<GitBranch size={13} />}
        onClick={handleFork}
      >
        Branch off
      </Button>
      <Button
        variant="blend"
        size="sm"
        icon={<Merge size={13} />}
        onClick={handleMerge}
      >
        Blend
      </Button>
    </div>
  );
}
