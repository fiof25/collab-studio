import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
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
  const createBranch = useProjectStore((s) => s.createBranch);
  const getChildBranches = useProjectStore((s) => s.getChildBranches);
  const deleteBranch = useProjectStore((s) => s.deleteBranch);
  const restoreBranch = useProjectStore((s) => s.restoreBranch);
  const pushToast = useUIStore((s) => s.pushToast);
  const setLastUndo = useUIStore((s) => s.setLastUndo);

  const branch = previewPopupBranchId ? getBranchById(previewPopupBranchId) : null;

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
            const POPUP_H = 155;
            const POPUP_W = 260;
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
            <div className="p-3 pb-2">
              <h3 className="text-sm font-semibold text-ink-primary truncate mb-1.5">
                {toDisplayName(branch.name)}
              </h3>

              <p className="text-xs text-ink-secondary leading-relaxed mb-2 line-clamp-2">
                {branch.description}
              </p>

              <span className="text-2xs text-ink-muted">
                Updated {formatRelativeTime(branch.updatedAt)}
              </span>
            </div>

            {/* Footer actions */}
            <div className="border-t border-line flex">
              <button
                onClick={handleStartNewVersion}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
              >
                <Plus size={12} />
                Branch off
              </button>
              {branch.parentId && (
                <>
                  <div className="w-px bg-line" />
                  <button
                    onClick={handleDelete}
                    title="Delete this branch"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs text-ink-muted hover:text-red-400 hover:bg-surface-2 transition-colors"
                  >
                    <Trash2 size={12} />
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
