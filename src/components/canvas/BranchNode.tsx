import { memo, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Crown, MessageCircle, Camera } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge } from '@/components/shared/Badge';
import { AvatarGroup } from '@/components/shared/Avatar';
import { useCanvasStore } from '@/store/useCanvasStore';
import { formatRelativeTime } from '@/utils/dateUtils';
import { hexToRgba } from '@/utils/colorUtils';
import type { BranchNodeData } from '@/types/canvas';

const NODE_W = 240;
const PREVIEW_H = 138;
const INFO_H = 72;

let hoverTimer: ReturnType<typeof setTimeout> | null = null;

export const BranchNode = memo(function BranchNode(props: NodeProps) {
  const data = props.data as BranchNodeData;
  const navigate = useNavigate();
  const nodeRef = useRef<HTMLDivElement>(null);
  const openPreviewPopup = useCanvasStore((s) => s.openPreviewPopup);
  const closePreviewPopup = useCanvasStore((s) => s.closePreviewPopup);
  const isArchived = data.status === 'archived';

  const handleMouseEnter = () => {
    hoverTimer = setTimeout(() => {
      const rect = nodeRef.current?.getBoundingClientRect();
      if (rect) {
        openPreviewPopup(data.branchId, {
          x: rect.right + 12,
          y: rect.top,
        });
      }
    }, 350);
  };

  const handleMouseLeave = () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    closePreviewPopup();
  };

  const handleClick = () => {
    navigate(`/branch/${data.branchId}`);
  };

  // Scale factor: iframe renders at 800px wide, we fit it into NODE_W
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
        whileHover={{ scale: 1.04, y: -3 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        className="cursor-pointer select-none"
        style={{ width: NODE_W }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* Outer gradient border */}
        <div
          className="rounded-2xl p-px"
          style={{
            background: `linear-gradient(145deg, ${data.color}90 0%, ${data.color}28 60%, transparent 100%)`,
            boxShadow: `0 4px 28px ${hexToRgba(data.color, 0.18)}`,
          }}
        >
          <div
            className={clsx(
              'rounded-2xl overflow-hidden bg-surface-1',
              isArchived && 'opacity-60'
            )}
            style={{ width: NODE_W - 2, height: PREVIEW_H + INFO_H }}
          >
            {/* ── Snapshot preview ── */}
            <div
              className="relative overflow-hidden bg-white"
              style={{ width: NODE_W - 2, height: PREVIEW_H }}
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
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: hexToRgba(data.color, 0.06) }}
                >
                  <Camera size={20} style={{ color: hexToRgba(data.color, 0.3) }} />
                </div>
              )}

              {/* Branch name tag overlay */}
              <div className="absolute top-2 left-2 z-10">
                {data.isRoot ? (
                  <div
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-2xs font-semibold"
                    style={{ background: hexToRgba(data.color, 0.9), color: '#fff' }}
                  >
                    <Crown size={9} />
                    main
                  </div>
                ) : (
                  <div
                    className="px-1.5 py-0.5 rounded-lg text-2xs font-mono font-semibold"
                    style={{ background: hexToRgba(data.color, 0.9), color: '#fff' }}
                  >
                    {data.name}
                  </div>
                )}
              </div>

              {/* Bottom fade */}
              <div
                className="absolute bottom-0 left-0 right-0 h-5 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, transparent, rgba(20,20,28,0.6))' }}
              />
            </div>

            {/* ── Info strip ── */}
            <div className="px-2.5 pt-2 pb-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-1">
                <Badge status={data.status} />
                {data.commentCount > 0 && (
                  <div className="flex items-center gap-0.5 text-ink-muted">
                    <MessageCircle size={11} />
                    <span className="text-2xs">{data.commentCount}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-1">
                <AvatarGroup collaborators={data.collaborators} max={3} size="xs" />
                <div className="flex items-center gap-2 text-ink-muted">
                  <div className="flex items-center gap-0.5">
                    <Camera size={10} />
                    <span className="text-2xs">{data.checkpointCount}</span>
                  </div>
                  <span className="text-2xs">{formatRelativeTime(data.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
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
