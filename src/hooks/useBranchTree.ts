import { useMemo } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import type { CanvasBranchNode, CanvasBranchEdge } from '@/types/canvas';

export function useBranchTree(): {
  nodes: CanvasBranchNode[];
  edges: CanvasBranchEdge[];
} {
  const project = useProjectStore((s) => s.project);
  const rootBranchId = project?.rootBranchId;

  return useMemo(() => {
    if (!project) return { nodes: [], edges: [] };

    const nodes: CanvasBranchNode[] = project.branches.map((branch) => ({
      id: branch.id,
      type: 'branchNode' as const,
      position: branch.position,
      data: {
        branchId: branch.id,
        name: branch.name,
        description: branch.description,
        status: branch.status,
        color: branch.color,
        codeSnapshot: branch.checkpoints[branch.checkpoints.length - 1]?.codeSnapshot ?? '',
        collaborators: branch.collaborators,
        checkpointCount: branch.checkpoints.length,
        commentCount: branch.comments.filter((c) => !c.resolved).length,
        updatedAt: branch.updatedAt,
        isRoot: branch.id === rootBranchId,
      },
    }));

    // Parent-child edges
    const parentEdges: CanvasBranchEdge[] = project.branches
      .filter((b) => b.parentId !== null)
      .map((branch) => {
        const parent = project.branches.find((p) => p.id === branch.parentId);
        return {
          id: `edge_${branch.parentId}_${branch.id}`,
          type: 'branchEdge' as const,
          source: branch.parentId!,
          target: branch.id,
          data: {
            parentBranchId: branch.parentId!,
            childBranchId: branch.id,
            parentColor: parent?.color ?? '#8B5CF6',
            childColor: branch.color,
            isActive: branch.status === 'active' || branch.status === 'merging',
          },
        };
      });

    // Extra edges for blend/merge secondary parents
    const mergeEdges: CanvasBranchEdge[] = project.branches
      .filter((b) => b.mergeParentIds && b.mergeParentIds.length > 0)
      .flatMap((branch) =>
        (branch.mergeParentIds ?? [])
          .filter((pid) => project.branches.some((p) => p.id === pid))
          .map((pid) => {
            const parent = project.branches.find((p) => p.id === pid);
            return {
              id: `edge_merge_${pid}_${branch.id}`,
              type: 'branchEdge' as const,
              source: pid,
              target: branch.id,
              data: {
                parentBranchId: pid,
                childBranchId: branch.id,
                parentColor: parent?.color ?? '#8B5CF6',
                childColor: branch.color,
                isActive: branch.status === 'active' || branch.status === 'merging',
                isMergeEdge: true,
              },
            };
          })
      );

    return { nodes, edges: [...parentEdges, ...mergeEdges] };
  }, [project, rootBranchId]);
}
