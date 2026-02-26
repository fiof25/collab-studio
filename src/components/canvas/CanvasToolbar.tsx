import { useReactFlow } from '@xyflow/react';
import { ZoomIn, ZoomOut, Maximize2, GitBranch, Merge } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useCanvasStore } from '@/store/useCanvasStore';

export function CanvasToolbar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const openModal = useUIStore((s) => s.openModal);
  const triggerFitView = useCanvasStore((s) => s.triggerFitView);

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 glass rounded-2xl p-1.5 shadow-float">
      <ToolButton onClick={() => zoomIn({ duration: 200 })} title="Zoom in">
        <ZoomIn size={15} />
      </ToolButton>
      <ToolButton onClick={() => zoomOut({ duration: 200 })} title="Zoom out">
        <ZoomOut size={15} />
      </ToolButton>
      <ToolButton
        onClick={() => {
          fitView({ duration: 400, padding: 0.15 });
          triggerFitView();
        }}
        title="Fit view"
      >
        <Maximize2 size={15} />
      </ToolButton>

      {/* Divider */}
      <div className="h-px bg-line mx-1 my-0.5" />

      <ToolButton
        onClick={() => openModal('newBranch')}
        title="New branch"
        accent
      >
        <GitBranch size={15} />
      </ToolButton>
      <ToolButton
        onClick={() => openModal('merge')}
        title="Blend branches"
        blend
      >
        <Merge size={15} />
      </ToolButton>
    </div>
  );
}

function ToolButton({
  children,
  title,
  onClick,
  accent,
  blend,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  accent?: boolean;
  blend?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={
        accent
          ? 'w-8 h-8 rounded-xl flex items-center justify-center transition-all text-white bg-gradient-to-br from-accent-violet to-accent-cyan hover:opacity-90'
          : blend
          ? 'w-8 h-8 rounded-xl flex items-center justify-center transition-all text-white bg-gradient-to-br from-accent-pink via-accent-violet to-accent-cyan hover:opacity-90'
          : 'w-8 h-8 rounded-xl flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface-3 transition-all'
      }
    >
      {children}
    </button>
  );
}
