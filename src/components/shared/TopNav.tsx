import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';
import { useUIStore } from '@/store/useUIStore';

interface TopNavProps {
  left?: ReactNode;
  right?: ReactNode;
  showBack?: boolean;
}

export function TopNav({ left, right, showBack }: TopNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const project = useProjectStore((s) => s.project);
  const { taskPanelOpen, toggleTaskPanel } = useUIStore();
  const isCanvas = location.pathname === '/project';

  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-line bg-surface-1/80 backdrop-blur-sm flex-shrink-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        {showBack && !isCanvas && (
          <button
            onClick={() => navigate('/project')}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
        )}

        {isCanvas && (
          <button
            onClick={() => navigate('/')}
            className="text-sm font-semibold text-ink-primary hidden sm:block hover:opacity-70 transition-opacity"
          >
            Collab Studio
          </button>
        )}

        {project && isCanvas && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-line text-ink-muted">·</span>
            <span className="text-sm font-medium text-ink-secondary truncate">
              {project.name}
            </span>
          </div>
        )}

        {left}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Tasks panel toggle */}
        <button
          onClick={toggleTaskPanel}
          title="Versions"
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
            taskPanelOpen
              ? 'bg-surface-3 text-ink-primary'
              : 'text-ink-muted hover:text-ink-primary hover:bg-surface-2'
          }`}
        >
          <ClipboardList size={15} />
        </button>

        {right && <>{right}</>}
      </div>
    </header>
  );
}
