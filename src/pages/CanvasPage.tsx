import { MessageCircle, Plus } from 'lucide-react';
import { TopNav } from '@/components/shared/TopNav';
import { ProjectCanvas } from '@/components/canvas/ProjectCanvas';
import { MergeModal } from '@/components/canvas/MergeModal';
import { GlobalCommentsPanel } from '@/components/canvas/GlobalCommentsPanel';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';

export function CanvasPage() {
  const openModal = useUIStore((s) => s.openModal);
  const { globalCommentsPanelOpen, toggleGlobalCommentsPanel } = useUIStore();
  const project = useProjectStore((s) => s.project);

  const openCommentCount = (project?.branches ?? [])
    .flatMap((b) => b.comments ?? [])
    .filter((c) => !c.resolved).length;

  return (
    <div className="flex flex-col h-full bg-canvas">
      <TopNav
        right={
          <div className="flex items-center gap-3">
            {/* Global comments button */}
            <button
              onClick={toggleGlobalCommentsPanel}
              title="All comments"
              className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-colors ${
                globalCommentsPanelOpen
                  ? 'bg-accent-violet text-white'
                  : 'text-ink-muted hover:text-ink-primary hover:bg-surface-2'
              }`}
            >
              <MessageCircle size={15} />
              {openCommentCount > 0 && !globalCommentsPanelOpen && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-accent-violet text-white text-[8px] font-bold flex items-center justify-center leading-none">
                  {openCommentCount > 9 ? '9+' : openCommentCount}
                </span>
              )}
            </button>

            <button
              onClick={() => openModal('newDraft')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ink-primary hover:opacity-80 text-canvas text-sm font-medium transition-opacity"
            >
              <Plus size={15} />
              New draft
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
