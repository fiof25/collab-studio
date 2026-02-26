import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Pencil } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';

interface BranchBreadcrumbProps {
  branchId: string;
}

export function BranchBreadcrumb({ branchId }: BranchBreadcrumbProps) {
  const navigate = useNavigate();
  const getAncestorChain = useProjectStore((s) => s.getAncestorChain);
  const updateBranch = useProjectStore((s) => s.updateBranch);
  const chain = getAncestorChain(branchId);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEditing = (currentName: string) => {
    setDraft(currentName);
    setEditing(true);
  };

  const commitRename = (id: string, currentName: string) => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== currentName) {
      updateBranch(id, { name: trimmed });
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1 min-w-0">
      {chain.map((branch, i) => {
        const isCurrent = i === chain.length - 1;
        return (
          <div key={branch.id} className="flex items-center gap-1 min-w-0">
            {i > 0 && (
              <ChevronRight size={12} className="text-ink-muted flex-shrink-0" />
            )}
            {isCurrent ? (
              editing ? (
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: branch.color }}
                  />
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commitRename(branch.id, branch.name)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(branch.id, branch.name);
                      if (e.key === 'Escape') setEditing(false);
                    }}
                    className="text-sm font-semibold font-mono bg-transparent border-b focus:outline-none max-w-[160px]"
                    style={{ color: branch.color, borderColor: branch.color + '60' }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => startEditing(branch.name)}
                  title="Click to rename"
                  className="flex items-center gap-1.5 group/name"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: branch.color }}
                  />
                  <span
                    className="text-sm font-semibold font-mono truncate max-w-[160px]"
                    style={{ color: branch.color }}
                  >
                    {branch.name}
                  </span>
                  <Pencil
                    size={10}
                    className="text-ink-muted opacity-0 group-hover/name:opacity-60 transition-opacity flex-shrink-0"
                  />
                </button>
              )
            ) : (
              <button
                onClick={() => navigate(`/branch/${branch.id}`)}
                className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-secondary transition-colors font-mono truncate max-w-[120px]"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-60"
                  style={{ background: branch.color }}
                />
                {branch.name}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
