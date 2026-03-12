import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessagesSquare, GitBranch } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';
import { formatRelativeTime } from '@/utils/dateUtils';
import { toDisplayName } from '@/utils/branchUtils';
import type { Comment } from '@/types/branch';

const PANEL_W = 320;

interface FlatComment extends Comment {
  branchId: string;
  branchName: string;
  branchColor: string;
}

function getSection(ts: number): 'Today' | 'Yesterday' | 'Older' {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 1000 * 60 * 60 * 24) return 'Today';
  if (diff < 1000 * 60 * 60 * 48) return 'Yesterday';
  return 'Older';
}

export function GlobalCommentsPanel() {
  const navigate = useNavigate();
  const { globalCommentsPanelOpen, toggleGlobalCommentsPanel } = useUIStore();
  const project = useProjectStore((s) => s.project);

  // Gather all open comments across all branches, newest first
  const allComments: FlatComment[] = (project?.branches ?? [])
    .flatMap((b) =>
      (b.comments ?? [])
        .filter((c) => !c.resolved)
        .map((c) => ({ ...c, branchId: b.id, branchName: b.name, branchColor: b.color }))
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  // Group into sections
  const sections: { label: string; items: FlatComment[] }[] = [];
  for (const label of ['Today', 'Yesterday', 'Older'] as const) {
    const items = allComments.filter((c) => getSection(c.timestamp) === label);
    if (items.length > 0) sections.push({ label, items });
  }

  const handleCommentClick = (branchId: string) => {
    toggleGlobalCommentsPanel();
    navigate(`/branch/${branchId}`);
  };

  return (
    <AnimatePresence>
      {globalCommentsPanelOpen && (
        <motion.div
          initial={{ x: PANEL_W, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: PANEL_W, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="fixed top-12 bottom-0 right-0 z-30 flex flex-col bg-surface-1 border-l border-line"
          style={{ width: PANEL_W }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessagesSquare size={13} className="text-ink-muted" />
              <span className="text-sm font-semibold text-ink-primary">All Comments</span>
              {allComments.length > 0 && (
                <span className="text-xs text-ink-muted/60">{allComments.length} open</span>
              )}
            </div>
            <button
              onClick={toggleGlobalCommentsPanel}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-ink-muted px-4 text-center">
                <MessagesSquare size={24} className="opacity-30" />
                <p className="text-sm">No open comments.</p>
              </div>
            ) : (
              <div className="py-2">
                {sections.map(({ label, items }) => (
                  <div key={label}>
                    {/* Section header */}
                    <div className="px-4 py-1.5 sticky top-0 bg-surface-1 z-10">
                      <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                        {label}
                      </span>
                    </div>

                    {/* Comment rows */}
                    {items.map((comment) => (
                      <button
                        key={comment.id}
                        onClick={() => handleCommentClick(comment.branchId)}
                        className="w-full text-left flex gap-3 px-4 py-3 hover:bg-surface-2 transition-colors border-b border-line/40 last:border-0"
                      >
                        {/* Avatar */}
                        <img
                          src={comment.authorAvatarUrl}
                          alt={comment.authorName}
                          className="w-7 h-7 rounded-full flex-shrink-0 object-cover mt-0.5"
                        />

                        <div className="flex-1 min-w-0">
                          {/* Author + time */}
                          <div className="flex items-baseline gap-1.5 mb-0.5">
                            <span
                              className="text-xs font-semibold"
                              style={{ color: comment.authorColor }}
                            >
                              {comment.authorName.split(' ')[0]}
                            </span>
                            <span className="text-[10px] text-ink-muted ml-auto flex-shrink-0">
                              {formatRelativeTime(comment.timestamp)}
                            </span>
                          </div>

                          {/* Branch badge */}
                          <div className="flex items-center gap-1 mb-1">
                            <GitBranch size={9} className="flex-shrink-0 text-ink-muted" />
                            <span className="text-[10px] font-medium truncate text-ink-muted">
                              {toDisplayName(comment.branchName)}
                            </span>
                          </div>

                          {/* Comment text */}
                          <p className="text-xs text-ink-secondary leading-relaxed line-clamp-2">
                            {comment.content}
                          </p>

                          {/* Reply count */}
                          {(comment.replies?.length ?? 0) > 0 && (
                            <span className="text-[10px] text-ink-muted mt-1 block">
                              {comment.replies!.length} repl{comment.replies!.length === 1 ? 'y' : 'ies'}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
