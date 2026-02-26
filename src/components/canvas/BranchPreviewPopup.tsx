import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Camera, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useUIStore } from '@/store/useUIStore';
import { Badge } from '@/components/shared/Badge';
import { AvatarGroup } from '@/components/shared/Avatar';
import { formatRelativeTime } from '@/utils/dateUtils';

export function BranchPreviewPopup() {
  const navigate = useNavigate();
  const { previewPopupBranchId, previewPopupAnchor, closePreviewPopup, cancelClosePreviewPopup, scheduleClosePreviewPopup } = useCanvasStore();
  const getBranchById = useProjectStore((s) => s.getBranchById);
  const createBranch = useProjectStore((s) => s.createBranch);
  const getChildBranches = useProjectStore((s) => s.getChildBranches);
  const deleteBranch = useProjectStore((s) => s.deleteBranch);
  const pushToast = useUIStore((s) => s.pushToast);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const branch = previewPopupBranchId ? getBranchById(previewPopupBranchId) : null;
  const latestComments = branch?.comments.slice(-2) ?? [];

  const handleStartNewVersion = () => {
    if (!branch) return;
    const siblings = getChildBranches(branch.id);
    const name = `v${siblings.length + 1}`;
    const newBranch = createBranch(branch.id, name, `New version from ${branch.name}`);
    closePreviewPopup();
    pushToast({ type: 'success', message: `"${name}" created — click the name to rename it` });
    navigate(`/branch/${newBranch.id}`);
  };

  const handleDelete = () => {
    if (!branch) return;
    const isRoot = !branch.parentId;
    if (isRoot) return;
    if (confirmingDelete) {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      const name = branch.name;
      deleteBranch(branch.id);
      closePreviewPopup();
      pushToast({ type: 'success', message: `"${name}" deleted` });
    } else {
      setConfirmingDelete(true);
      confirmTimer.current = setTimeout(() => setConfirmingDelete(false), 3000);
    }
  };

  return (
    <AnimatePresence>
      {branch && previewPopupAnchor && (
        <motion.div
          key={branch.id}
          initial={{ opacity: 0, scale: 0.92, x: -6 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.92, x: -6 }}
          transition={{ type: 'spring', duration: 0.22, bounce: 0.12 }}
          className="fixed z-50 pointer-events-none"
          style={{
            left: Math.min(previewPopupAnchor.x, window.innerWidth - 316),
            top: Math.max(8, Math.min(previewPopupAnchor.y, window.innerHeight - 480)),
            width: 300,
          }}
        >
          {/* pointer-events-auto so buttons work; mouse enter/leave keeps popup alive */}
          <div
            className="rounded-xl overflow-hidden border border-line bg-surface-1 pointer-events-auto"
            onMouseEnter={cancelClosePreviewPopup}
            onMouseLeave={scheduleClosePreviewPopup}
          >
            {/* Solid color top accent */}
            <div className="h-0.5 w-full" style={{ background: branch.color }} />

            {/* Info section */}
            <div className="p-3 pb-2">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <h3 className="text-sm font-semibold text-ink-primary font-mono truncate">
                  {branch.name}
                </h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge status={branch.status} />
                  <AvatarGroup collaborators={branch.collaborators} max={3} size="xs" />
                </div>
              </div>

              <p className="text-xs text-ink-secondary leading-relaxed mb-2.5 line-clamp-2">
                {branch.description}
              </p>

              {/* Tags */}
              {branch.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mb-2.5">
                  {branch.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-2xs bg-surface-2 text-ink-muted"
                    >
                      <Tag size={8} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 text-2xs text-ink-muted">
                <span className="flex items-center gap-1">
                  <Camera size={10} />
                  {branch.checkpoints.length} snapshots
                </span>
                <span>Updated {formatRelativeTime(branch.updatedAt)}</span>
              </div>
            </div>

            {/* Comments section */}
            {latestComments.length > 0 && (
              <>
                <div className="mx-3 border-t border-line" />
                <div className="p-3 pt-2.5">
                  <div className="flex items-center gap-1 mb-2">
                    <MessageCircle size={11} className="text-ink-muted" />
                    <span className="text-2xs font-medium text-ink-muted">
                      {branch.comments.length} comment{branch.comments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {latestComments.map((comment) => (
                      <div key={comment.id} className="flex gap-2">
                        <img
                          src={comment.authorAvatarUrl}
                          alt={comment.authorName}
                          className="w-5 h-5 rounded-full flex-shrink-0 bg-surface-3 mt-0.5"
                        />
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-1.5 mb-0.5">
                            <span
                              className="text-2xs font-semibold"
                              style={{ color: comment.authorColor }}
                            >
                              {comment.authorName.split(' ')[0]}
                            </span>
                            <span className="text-2xs text-ink-muted">
                              {formatRelativeTime(comment.timestamp)}
                            </span>
                          </div>
                          <p className="text-2xs text-ink-secondary leading-relaxed line-clamp-2">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Footer actions */}
            <div className="border-t border-line flex">
              <button
                onClick={handleStartNewVersion}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
              >
                <Plus size={12} />
                New version
              </button>
              {!branch.parentId ? null : (
                <>
                  <div className="w-px bg-line" />
                  <button
                    onClick={handleDelete}
                    title={confirmingDelete ? 'Click again to confirm' : 'Delete this version'}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs transition-colors ${
                      confirmingDelete
                        ? 'text-red-400 bg-red-500/10'
                        : 'text-ink-muted hover:text-red-400 hover:bg-surface-2'
                    }`}
                  >
                    <Trash2 size={12} />
                    {confirmingDelete ? 'Sure?' : ''}
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
