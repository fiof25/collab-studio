import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/store/useProjectStore';
import { useUIStore } from '@/store/useUIStore';
import { TopNav } from '@/components/shared/TopNav';
import { IDELayout } from '@/components/ide/IDELayout';
import { BranchBreadcrumb } from '@/components/ide/BranchBreadcrumb';
import { BranchActions } from '@/components/ide/BranchActions';
import { MergeModal } from '@/components/canvas/MergeModal';
import { CommentsPanel } from '@/components/ide/CommentsPanel';

export function BranchPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const getBranchById = useProjectStore((s) => s.getBranchById);
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
    return () => setActiveBranch(null);
  }, [branchId, branch, navigate, pushToast, setActiveBranch]);

  if (!branch || !branchId) return null;

  return (
    <div className="flex flex-col h-full bg-canvas">
      <TopNav
        showBack
        left={
          <div className="flex items-center gap-2 min-w-0 ml-2">
            <BranchBreadcrumb branchId={branchId} />
          </div>
        }
        right={<BranchActions branchId={branchId} />}
      />

      <IDELayout branchId={branchId} accentColor={branch.color} />

      {/* Modals */}
      <MergeModal variant="merge" />
      <MergeModal variant="newBranch" />
      <CommentsPanel branchId={branchId} />
    </div>
  );
}
