import { type ReactNode, useState, useRef } from 'react';
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
  const renameProject = useProjectStore((s) => s.renameProject);
  const { taskPanelOpen, toggleTaskPanel } = useUIStore();
  const isCanvas = location.pathname === '/project';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(project?.name ?? '');
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed) renameProject(trimmed);
    setEditing(false);
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-line bg-surface-1/80 backdrop-blur-sm flex-shrink-0 z-20">
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
            className="text-base font-bold text-ink-primary hidden sm:block hover:opacity-70 transition-opacity"
          >
            Collab AI Studio
          </button>
        )}

        {project && isCanvas && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-line text-ink-muted">·</span>
            {editing ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditing(false);
                }}
                className="text-base font-medium text-ink-primary bg-transparent border-b border-accent-violet outline-none w-40 truncate"
              />
            ) : (
              <button
                onClick={startEdit}
                className="text-base font-medium text-ink-secondary hover:text-ink-primary transition-colors truncate"
              >
                {project.name}
              </button>
            )}
          </div>
        )}

        {left}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Tasks panel toggle */}
        <button
          onClick={toggleTaskPanel}
          title="Versions"
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            taskPanelOpen
              ? 'bg-surface-3 text-ink-primary'
              : 'text-ink-muted hover:text-ink-primary hover:bg-surface-2'
          }`}
        >
          <ClipboardList size={17} />
        </button>

        {right && <>{right}</>}
      </div>
    </header>
  );
}
