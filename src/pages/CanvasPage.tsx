import { MessageCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopNav } from '@/components/shared/TopNav';
import { ProjectCanvas } from '@/components/canvas/ProjectCanvas';
import { MergeModal } from '@/components/canvas/MergeModal';
import { GlobalCommentsPanel } from '@/components/canvas/GlobalCommentsPanel';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useAutoBlueprint } from '@/hooks/useAutoBlueprint';

export function CanvasPage() {
  useAutoBlueprint();
  const navigate = useNavigate();
  const { globalCommentsPanelOpen, toggleGlobalCommentsPanel } = useUIStore();
  const { project, createRootBranch } = useProjectStore();

  const handleNewRoot = () => {
    const branch = createRootBranch('Untitled', '');
    navigate(`/branch/${branch.id}`);
  };

  const openCommentCount = (project?.branches ?? [])
    .flatMap((b) => b.comments ?? [])
    .filter((c) => !c.resolved).length;

  return (
    <div className="flex flex-col h-full bg-canvas">
      <TopNav
        right={
          <div className="flex items-center gap-4">
            {/* Global comments button */}
            <button
              onClick={toggleGlobalCommentsPanel}
              title="All comments"
              className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
                globalCommentsPanelOpen
                  ? 'bg-accent-violet text-white'
                  : 'text-ink-muted hover:text-ink-primary hover:bg-surface-2'
              }`}
            >
              <MessageCircle size={17} />
              {openCommentCount > 0 && !globalCommentsPanelOpen && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-accent-violet text-white text-[8px] font-bold flex items-center justify-center leading-none">
                  {openCommentCount > 9 ? '9+' : openCommentCount}
                </span>
              )}
            </button>

            <button
              onClick={handleNewRoot}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-ink-primary hover:opacity-80 text-canvas text-base font-medium transition-opacity"
            >
              <Plus size={16} />
              New Root
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
      <MergeModal variant="newDraft" />
      <GlobalCommentsPanel />
    </div>
  );
}
