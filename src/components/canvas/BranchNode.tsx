import { memo, useRef, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Camera, Pencil, Merge, GitBranch, Trash2, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useProjectStore } from '@/store/useProjectStore';
import { useUIStore } from '@/store/useUIStore';
import { formatRelativeTime } from '@/utils/dateUtils';
import { toDisplayName } from '@/utils/branchUtils';
import type { BranchNodeData } from '@/types/canvas';
const NODE_W = 240;
const PREVIEW_H = 138;

export const BranchNode = memo(function BranchNode(props: NodeProps) {
  const data = props.data as BranchNodeData;
  const navigate = useNavigate();
  const closePreviewPopup = useCanvasStore((s) => s.closePreviewPopup);
  const deleteBranch = useProjectStore((s) => s.deleteBranch);
  const blendTargetId = useCanvasStore((s) => s.blendTargetId);
  const isBlendTarget = blendTargetId === data.branchId;
  const createBranch = useProjectStore((s) => s.createBranch);
  const getChildBranches = useProjectStore((s) => s.getChildBranches);
  const pushToast = useUIStore((s) => s.pushToast);
  const updateBranch = useProjectStore((s) => s.updateBranch);
  const getBranchById = useProjectStore((s) => s.getBranchById);
  const isArchived = data.status === 'archived';

  // Unique commenters (open comments only)
  const openComments = getBranchById(data.branchId)?.comments.filter((c) => !c.resolved) ?? [];
  const uniqueCommenters = openComments.reduce<{ id: string; name: string; avatarUrl: string; color: string }[]>((acc, c) => {
    if (!acc.find((a) => a.id === c.authorId)) {
      acc.push({ id: c.authorId, name: c.authorName, avatarUrl: c.authorAvatarUrl, color: c.authorColor });
    }
    return acc;
  }, []);
  const wasDraggedRef = useRef(false);
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const descInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (props.dragging) wasDraggedRef.current = true;
  }, [props.dragging]);

  useEffect(() => {
    if (renaming) renameInputRef.current?.focus();
  }, [renaming]);

  useEffect(() => {
    if (editingDesc) descInputRef.current?.focus();
  }, [editingDesc]);

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

  const startEditDesc = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDescDraft(data.description ?? '');
    setEditingDesc(true);
  };

  const commitDesc = () => {
    const trimmed = descDraft.trim();
    if (trimmed !== (data.description ?? '')) {
      updateBranch(data.branchId, { description: trimmed, descriptionPinned: true });
    }
    setEditingDesc(false);
  };


  const handleClick = (e: React.MouseEvent) => {
    // Let React Flow handle shift/meta clicks for multi-select; don't navigate
    if (e.shiftKey || e.metaKey || e.ctrlKey) return;
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
    const newBranch = createBranch(data.branchId, name, '');
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
        layoutId={`branch-card-${data.branchId}`}
        whileHover={props.dragging ? {} : { scale: 1.02, y: -2 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        className="cursor-pointer select-none group relative"
        style={{ width: NODE_W }}
        onClick={handleClick}
      >
        {/* Card */}
        <div
          className={clsx(
            'rounded-xl overflow-hidden bg-surface-1 border flex flex-col transition-all duration-100 relative',
            isArchived && 'opacity-50',
            props.selected || isBlendTarget ? 'border-accent-violet'
            : 'border-transparent'
          )}
          style={
            props.selected || isBlendTarget
              ? { borderColor: 'rgb(139 92 246)' }
              : { borderColor: 'rgb(var(--node-border))' }
          }
        >
          {/* Snapshot preview */}
          <div
            className="overflow-hidden bg-surface-2 flex-shrink-0"
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
              <div className="w-full h-full bg-white flex items-center justify-center">
                <Camera size={18} className="text-gray-300" />
              </div>
            )}
          </div>

          {/* Info strip */}
          <div className="px-2.5 pt-1.5 pb-2 border-t border-line flex flex-col gap-1">
            {/* Name row */}
            <div className="flex items-baseline gap-1.5 group/name">
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
                  style={{ borderColor: 'var(--color-line)' }}
                />
              ) : (
                <>
                  <span className="text-xs font-medium text-ink-primary truncate min-w-0">
                    {toDisplayName(data.name)}
                  </span>
                  <button
                    onClick={startRename}
                    className="opacity-0 group-hover/name:opacity-60 hover:!opacity-100 text-ink-muted transition-opacity flex-shrink-0"
                    title="Rename"
                  >
                    <Pencil size={9} />
                  </button>
                </>
              )}
              {!renaming && (
                <span className="text-2xs text-ink-muted flex-shrink-0 ml-auto">
                  {formatRelativeTime(data.updatedAt)}
                </span>
              )}
            </div>

            {/* Description */}
            {editingDesc ? (
              <textarea
                ref={descInputRef}
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                onBlur={commitDesc}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitDesc(); }
                  if (e.key === 'Escape') setEditingDesc(false);
                  e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
                rows={2}
                className="w-full text-2xs text-ink-secondary bg-transparent border-b border-line outline-none resize-none leading-relaxed"
              />
            ) : (
              <p
                className="text-2xs text-ink-secondary line-clamp-2 cursor-text"
                onClick={startEditDesc}
                title="Click to edit description"
              >
                {data.description || <span className="text-ink-muted opacity-40">Add description…</span>}
              </p>
            )}

            {/* Comment notification */}
            {uniqueCommenters.length > 0 && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <div className="flex">
                  {uniqueCommenters.slice(0, 3).map((commenter, i) => (
                    <div
                      key={commenter.id}
                      className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 border border-surface-1"
                      style={{ marginLeft: i === 0 ? 0 : -5, zIndex: uniqueCommenters.length - i, borderColor: commenter.color, borderWidth: 1.5 }}
                    >
                      <img src={commenter.avatarUrl} alt={commenter.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {uniqueCommenters.length > 3 && (
                    <div
                      className="w-4 h-4 rounded-full bg-surface-3 border border-line flex items-center justify-center flex-shrink-0 text-[7px] font-bold text-ink-muted"
                      style={{ marginLeft: -5 }}
                    >
                      +{uniqueCommenters.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-ink-muted">
                  {openComments.length} comment{openComments.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Hover action bar */}
        <div className="absolute -bottom-8 left-0 right-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleStartNewVersion}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-2 border border-line text-ink-muted hover:text-ink-primary hover:bg-surface-3 transition-colors text-xs"
            title="Add branch"
          >
            <Plus size={11} />
            Add branch
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); deleteBranch(data.branchId); }}
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface-2 border border-line text-ink-muted hover:text-red-400 hover:bg-surface-3 transition-colors"
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </div>

        {/* Blend target overlay */}
        {isBlendTarget && (
          <div className="absolute inset-0 rounded-xl flex items-center justify-center pointer-events-none z-10">
            <div className="px-3 py-1.5 rounded-full bg-accent-violet text-white text-xs font-semibold flex items-center gap-1.5">
              <Merge size={11} />
              Drop to merge
            </div>
          </div>
        )}

      </motion.div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="opacity-0 pointer-events-none"
        style={{ background: 'transparent', border: 'none' }}
      />
    </>
  );
});
