import { memo } from 'react';
import { getBezierPath, type EdgeProps } from '@xyflow/react';
import type { BranchEdgeData } from '@/types/canvas';

export const BranchEdge = memo(function BranchEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;
  const data = props.data as BranchEdgeData | undefined;
  const isActive = data?.isActive ?? true;
  const isMerge = data?.isMergeEdge ?? false;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  if (isMerge) {
    const gradientId = `mg-${id}`;
    return (
      <>
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={sourceX}
            y1={sourceY}
            x2={targetX}
            y2={targetY}
          >
            <stop offset="0%" stopColor={data?.parentColor as string} stopOpacity="0.7" />
            <stop offset="100%" stopColor={data?.childColor as string} stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <path
          id={id}
          d={edgePath}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="5 4"
          className="animate-march-ants"
        />
      </>
    );
  }

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
