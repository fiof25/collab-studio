import { memo, useRef, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Camera, Plus, Pencil } from 'lucide-react';
import { clsx } from 'clsx';
import { AvatarGroup } from '@/components/shared/Avatar';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useUIStore } from '@/store/useUIStore';
import { formatRelativeTime } from '@/utils/dateUtils';
import { toDisplayName } from '@/utils/branchUtils';
import type { BranchNodeData } from '@/types/canvas';
import type { BranchStatus } from '@/types/branch';

const NODE_W = 240;
const PREVIEW_H = 138;
// Extra bottom padding keeps the hover chip inside the node bounding box,
// so moving from card → chip doesn't fire onMouseLeave on the node.
const CHIP_PAD = 28;

const statusDot: Record<BranchStatus, string> = {
  active: 'bg-status-active',
  merging: 'bg-status-merging animate-pulse',
  merged: 'bg-status-merged',
  archived: 'bg-status-archived',
};

let hoverTimer: ReturnType<typeof setTimeout> | null = null;

export const BranchNode = memo(function BranchNode(props: NodeProps) {
  const data = props.data as BranchNodeData;
  const navigate = useNavigate();
  const nodeRef = useRef<HTMLDivElement>(null);
  const openPreviewPopup = useCanvasStore((s) => s.openPreviewPopup);
  const closePreviewPopup = useCanvasStore((s) => s.closePreviewPopup);
  const scheduleClosePreviewPopup = useCanvasStore((s) => s.scheduleClosePreviewPopup);
  const createBranch = useProjectStore((s) => s.createBranch);
  const getChildBranches = useProjectStore((s) => s.getChildBranches);
  const pushToast = useUIStore((s) => s.pushToast);
  const updateBranch = useProjectStore((s) => s.updateBranch);
  const isArchived = data.status === 'archived';
  const wasDraggedRef = useRef(false);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (props.dragging) wasDraggedRef.current = true;
  }, [props.dragging]);

  useEffect(() => {
    if (renaming) renameInputRef.current?.focus();
  }, [renaming]);

  const startRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameDraft(data.name);
    setRenaming(true);
  };

  const commitRename = () => {
    const trimmed = renameDraft.trim();
    if (trimmed && trimmed !== data.name) {
      updateBranch(data.branchId, { name: trimmed });
    }
    setRenaming(false);
  };

  const handleMouseEnter = () => {
    hoverTimer = setTimeout(() => {
      const rect = nodeRef.current?.getBoundingClientRect();
      if (rect) {
        openPreviewPopup(data.branchId, { x: rect.right + 12, y: rect.top });
      }
    }, 350);
  };

  const handleMouseLeave = () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    // Schedule instead of immediate close — gives the cursor time to reach the popup
    scheduleClosePreviewPopup();
  };

  const handleClick = () => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }
    navigate(`/branch/${data.branchId}`);
  };

  const handleStartNewVersion = (e: React.MouseEvent) => {
    e.stopPropagation();
    const siblings = getChildBranches(data.branchId);
    const name = `v${siblings.length + 1}`;
    const newBranch = createBranch(data.branchId, name, `New version from ${data.name}`);
    closePreviewPopup();
    pushToast({ type: 'success', message: `"${name}" created — click the name to rename` });
    navigate(`/branch/${newBranch.id}`);
  };

  const scale = NODE_W / 800;
  const iframeH = Math.ceil(PREVIEW_H / scale);

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="opacity-0 pointer-events-none"
        style={{ background: 'transparent', border: 'none' }}
      />

      <motion.div
        ref={nodeRef}
        layoutId={`branch-card-${data.branchId}`}
        whileHover={props.dragging ? {} : { scale: 1.02, y: -2 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        className="cursor-pointer select-none group relative"
        style={{ width: NODE_W, paddingBottom: CHIP_PAD }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* Card */}
        <div
          className={clsx(
            'rounded-xl overflow-hidden bg-surface-1 border border-line flex flex-col',
            isArchived && 'opacity-50'
          )}
        >
          {/* Solid color top accent */}
          <div className="h-0.5 flex-shrink-0" style={{ background: data.color }} />

          {/* Snapshot preview */}
          <div
            className="overflow-hidden bg-white flex-shrink-0"
            style={{ height: PREVIEW_H }}
          >
            {data.codeSnapshot ? (
              <iframe
                srcDoc={data.codeSnapshot}
                title={`Preview: ${data.name}`}
                sandbox="allow-scripts"
                style={{
                  width: 800,
                  height: iframeH,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                  border: 'none',
                  display: 'block',
                }}
              />
            ) : (
              <div className="w-full h-full bg-surface-2 flex items-center justify-center">
                <Camera size={18} className="text-ink-muted" />
              </div>
            )}
          </div>

          {/* Info strip */}
          <div className="px-2.5 pt-2 pb-2 border-t border-line flex flex-col gap-1.5">
            {/* Name row */}
            <div className="flex items-center gap-1.5 group/name">
              {renaming ? (
                <input
                  ref={renameInputRef}
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setRenaming(false);
                    e.stopPropagation();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-xs font-medium bg-transparent border-b outline-none text-ink-primary min-w-0"
                  style={{ borderColor: data.color + '60' }}
                />
              ) : (
                <span className="text-xs font-medium text-ink-primary truncate flex-1">
                  {toDisplayName(data.name)}
                </span>
              )}
              {!renaming && (
                <button
                  onClick={startRename}
                  className="opacity-0 group-hover/name:opacity-60 hover:!opacity-100 text-ink-muted transition-opacity flex-shrink-0"
                  title="Rename"
                >
                  <Pencil size={9} />
                </button>
              )}
              <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', statusDot[data.status])} />
            </div>

            {/* Description */}
            {data.description && (
              <p className="text-2xs text-ink-muted truncate">{data.description}</p>
            )}

            {/* Avatars + time */}
            <div className="flex items-center justify-between">
              <AvatarGroup collaborators={data.collaborators} max={3} size="xs" />
              <span className="text-2xs text-ink-muted">
                {formatRelativeTime(data.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Hover chip — floats below the card on hover */}
        <div
          className={clsx(
            'absolute bottom-0 left-0 right-0 flex justify-center',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
            'pointer-events-none group-hover:pointer-events-auto'
          )}
        >
          <button
            onClick={handleStartNewVersion}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-1 border border-line text-2xs text-ink-muted hover:text-ink-primary hover:border-line-accent transition-colors"
          >
            <Plus size={10} />
            Branch off
          </button>
        </div>
      </motion.div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="opacity-0 pointer-events-none"
        style={{ background: 'transparent', border: 'none', bottom: CHIP_PAD }}
      />
    </>
  );
});
