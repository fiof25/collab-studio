import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';

interface BranchBreadcrumbProps {
  branchId: string;
}

export function BranchBreadcrumb({ branchId }: BranchBreadcrumbProps) {
  const navigate = useNavigate();
  const getAncestorChain = useProjectStore((s) => s.getAncestorChain);
  const chain = getAncestorChain(branchId);

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
              <div className="flex items-center gap-1.5">
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
              </div>
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
