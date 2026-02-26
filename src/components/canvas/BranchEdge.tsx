import { memo } from 'react';
import { getBezierPath, type EdgeProps } from '@xyflow/react';
import type { BranchEdgeData } from '@/types/canvas';

export const BranchEdge = memo(function BranchEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;
  const data = props.data as BranchEdgeData | undefined;
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const gradId = `grad-${id}`;
  const parentColor = data?.parentColor ?? '#8B5CF6';
  const childColor = data?.childColor ?? '#06B6D4';
  const isActive = data?.isActive ?? true;

  return (
    <>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={parentColor} stopOpacity="0.8" />
          <stop offset="100%" stopColor={childColor} stopOpacity="0.8" />
        </linearGradient>
        <marker
          id={`arrow-${id}`}
          markerWidth="8"
          markerHeight="8"
          refX="4"
          refY="4"
          orient="auto"
        >
          <circle cx="4" cy="4" r="2" fill={childColor} opacity="0.8" />
        </marker>
      </defs>

      {/* Shadow/glow path */}
      <path
        d={edgePath}
        fill="none"
        stroke={childColor}
        strokeWidth="6"
        strokeOpacity="0.08"
        strokeLinecap="round"
      />

      {/* Main path */}
      <path
        d={edgePath}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={isActive ? undefined : '6 4'}
        strokeOpacity={isActive ? 1 : 0.5}
        markerEnd={`url(#arrow-${id})`}
        style={
          isActive
            ? undefined
            : undefined
        }
      />

      {/* Animated overlay for active branches */}
      {isActive && (
        <path
          d={edgePath}
          fill="none"
          stroke={childColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 14"
          strokeOpacity="0.3"
          style={{ animation: 'marchAnts 1.5s linear infinite' }}
        />
      )}
    </>
  );
});
