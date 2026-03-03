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

  return (
    <path
      id={id}
      d={edgePath}
      fill="none"
      style={{ stroke: 'rgb(var(--node-border))' }}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  );
});
