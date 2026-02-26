import { memo } from 'react';
import { getBezierPath, type EdgeProps } from '@xyflow/react';
import type { BranchEdgeData } from '@/types/canvas';

export const BranchEdge = memo(function BranchEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;
  const data = props.data as BranchEdgeData | undefined;
  const isActive = data?.isActive ?? true;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <path
      id={id}
      d={edgePath}
      fill="none"
      style={{ stroke: 'var(--edge-color)' }}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeDasharray={isActive ? undefined : '5 5'}
      strokeOpacity={isActive ? 1 : 0.5}
    />
  );
});
