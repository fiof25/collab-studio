import { Plus } from 'lucide-react';
import { TopNav } from '@/components/shared/TopNav';
import { ProjectCanvas } from '@/components/canvas/ProjectCanvas';
import { MergeModal } from '@/components/canvas/MergeModal';
import { useUIStore } from '@/store/useUIStore';

export function CanvasPage() {
  const openModal = useUIStore((s) => s.openModal);
  return (
    <div className="flex flex-col h-full bg-canvas">
      <TopNav
        right={
          <div className="flex items-center gap-3">
            {/* Primary CTA — mirrors GitHub's "New" button */}
            <button
              onClick={() => openModal('newBranch')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ink-primary hover:opacity-80 text-canvas text-sm font-medium transition-opacity"
            >
              <Plus size={15} />
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
