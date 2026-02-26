import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GitBranch, ArrowLeft } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';

interface TopNavProps {
  left?: ReactNode;
  right?: ReactNode;
  showBack?: boolean;
}

export function TopNav({ left, right, showBack }: TopNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const project = useProjectStore((s) => s.project);
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

        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <div className="w-6 h-6 rounded-lg bg-accent-violet flex items-center justify-center">
            <GitBranch size={13} className="text-white" />
          </div>
          {isCanvas && (
            <span className="text-sm font-semibold text-ink-primary hidden sm:block">
              Collab Studio
            </span>
          )}
        </button>

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

      {right && <div className="flex items-center gap-2 flex-shrink-0">{right}</div>}
    </header>
  );
}
