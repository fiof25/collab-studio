import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Camera, MessageCircle } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectStore } from '@/store/useProjectStore';
import { Badge } from '@/components/shared/Badge';
import { AvatarGroup } from '@/components/shared/Avatar';
import { formatRelativeTime } from '@/utils/dateUtils';
import { hexToRgba } from '@/utils/colorUtils';

export function BranchPreviewPopup() {
  const { previewPopupBranchId, previewPopupAnchor } = useCanvasStore();
  const getBranchById = useProjectStore((s) => s.getBranchById);

  const branch = previewPopupBranchId ? getBranchById(previewPopupBranchId) : null;
  const latestComments = branch?.comments.slice(-2) ?? [];

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
          <div
            className="rounded-2xl overflow-hidden shadow-float border"
            style={{ background: '#14141C', borderColor: `${branch.color}40` }}
          >
            {/* Color accent bar */}
            <div
              className="h-1 w-full"
              style={{ background: `linear-gradient(90deg, ${branch.color}, ${branch.color}50)` }}
            />

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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
