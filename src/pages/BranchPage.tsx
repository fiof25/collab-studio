import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/store/useProjectStore';
import { useChatStore } from '@/store/useChatStore';
import { useUIStore } from '@/store/useUIStore';
import { mockThreads } from '@/data/mockMessages';
import { TopNav } from '@/components/shared/TopNav';
import { IDELayout } from '@/components/ide/IDELayout';
import { BranchBreadcrumb } from '@/components/ide/BranchBreadcrumb';
import { BranchActions } from '@/components/ide/BranchActions';
import { MergeModal } from '@/components/canvas/MergeModal';
import { CommentsModal } from '@/components/ide/CommentsModal';
import { Badge } from '@/components/shared/Badge';

export function BranchPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const getBranchById = useProjectStore((s) => s.getBranchById);
  const { ensureThread, addMessage } = useChatStore();
  const pushToast = useUIStore((s) => s.pushToast);
  const setActiveBranch = useUIStore((s) => s.setActiveBranch);

  const branch = branchId ? getBranchById(branchId) : undefined;

  useEffect(() => {
    if (!branch || !branchId) {
      pushToast({ type: 'error', message: 'Branch not found' });
      navigate('/');
      return;
    }

    setActiveBranch(branchId);

    // Load mock messages for this branch if any
    ensureThread(branchId);
    const existing = useChatStore.getState().threads[branchId];
    if (!existing?.messages.length && mockThreads[branchId]) {
      mockThreads[branchId]!.forEach((msg) => addMessage(branchId, msg));
    }

    return () => setActiveBranch(null);
  }, [branchId, branch, navigate, pushToast, ensureThread, addMessage, setActiveBranch]);

  if (!branch || !branchId) return null;

  return (
    <div className="flex flex-col h-full bg-canvas">
      <TopNav
        showBack
        left={
          <div className="flex items-center gap-2 min-w-0 ml-2">
            <BranchBreadcrumb branchId={branchId} />
            <Badge status={branch.status} />
          </div>
        }
        right={<BranchActions branchId={branchId} />}
      />

      <IDELayout branchId={branchId} accentColor={branch.color} />

      {/* Modals */}
      <MergeModal variant="merge" />
      <MergeModal variant="newBranch" />
      <CommentsModal branchId={branchId} />
    </div>
  );
}
