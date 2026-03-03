import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useUIStore } from '@/store/useUIStore';
import { formatRelativeTime } from '@/utils/dateUtils';
import { toDisplayName } from '@/utils/branchUtils';

export function BranchPreviewPopup() {
  const navigate = useNavigate();
  const { previewPopupBranchId, previewPopupAnchor, closePreviewPopup, cancelClosePreviewPopup, scheduleClosePreviewPopup } = useCanvasStore();
  const getBranchById = useProjectStore((s) => s.getBranchById);
  const deleteBranch = useProjectStore((s) => s.deleteBranch);
  const restoreBranch = useProjectStore((s) => s.restoreBranch);
  const pushToast = useUIStore((s) => s.pushToast);
  const setLastUndo = useUIStore((s) => s.setLastUndo);

  const branch = previewPopupBranchId ? getBranchById(previewPopupBranchId) : null;

  const handleDelete = () => {
    if (!branch || !branch.parentId) return;
    const snapshot = { ...branch };
    deleteBranch(branch.id);
    closePreviewPopup();
    const undo = () => {
      restoreBranch(snapshot);
      setLastUndo(null);
    };
    setLastUndo(undo);
    pushToast({
      type: 'success',
      message: `"${toDisplayName(snapshot.name)}" deleted`,
      duration: 5000,
      onUndo: undo,
    });
  };

  return (
    <AnimatePresence>
      {branch && previewPopupAnchor && (
        <motion.div
          key={branch.id}
          initial={{ opacity: 0, scale: 0.92, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 6 }}
          transition={{ type: 'spring', duration: 0.22, bounce: 0.12 }}
          className="fixed z-50 pointer-events-none"
          style={(() => {
            const POPUP_H = 100;
            const POPUP_W = 200;
            const GAP = 8;
            const left = Math.min(Math.max(GAP, previewPopupAnchor.x - POPUP_W / 2), window.innerWidth - POPUP_W - GAP);
            const spaceAbove = previewPopupAnchor.y - GAP;
            const top = spaceAbove >= POPUP_H
              ? previewPopupAnchor.y - GAP - POPUP_H
              : previewPopupAnchor.bottom + GAP;
            return { left, top, width: POPUP_W };
          })()}
        >
          <div
            className="rounded-xl overflow-hidden border border-line bg-surface-1 pointer-events-auto"
            onMouseEnter={cancelClosePreviewPopup}
            onMouseLeave={scheduleClosePreviewPopup}
          >
            {/* Info section */}
            <div className="px-2.5 py-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-ink-primary truncate">
                  {toDisplayName(branch.name)}
                </h3>
                <span className="text-2xs text-ink-muted">
                  {formatRelativeTime(branch.updatedAt)}
                </span>
              </div>
              {branch.parentId && (
                <button
                  onClick={handleDelete}
                  title="Delete"
                  className="flex-shrink-0 text-ink-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
