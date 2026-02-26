import { Users, GitBranch, Plus } from 'lucide-react';
import { TopNav } from '@/components/shared/TopNav';
import { ProjectCanvas } from '@/components/canvas/ProjectCanvas';
import { MergeModal } from '@/components/canvas/MergeModal';
import { useProjectStore } from '@/store/useProjectStore';
import { useUIStore } from '@/store/useUIStore';

export function CanvasPage() {
  const project = useProjectStore((s) => s.project);
  const openModal = useUIStore((s) => s.openModal);
  const branches = project?.branches ?? [];
  const activeBranches = branches.filter((b) => b.status === 'active').length;

  return (
    <div className="flex flex-col h-full bg-canvas">
      <TopNav
        right={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-status-active animate-pulse-slow" />
              <span>{activeBranches} active</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
              <Users size={12} />
              <span>3 online</span>
            </div>

            {/* Primary CTA — mirrors GitHub's "New" button */}
            <button
              onClick={() => openModal('newBranch')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-violet hover:bg-accent-violet-dark text-white text-xs font-medium transition-colors"
            >
              <Plus size={13} />
              New branch
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-hidden">
        <ProjectCanvas />
      </div>

      {/* Modals */}
      <MergeModal variant="merge" />
      <MergeModal variant="newBranch" />
    </div>
  );
}
