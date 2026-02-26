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
        commentCount: branch.comments.length,
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

    // Merge edges — drawn from the absorbed branch toward the surviving branch
    const mergeEdges: CanvasBranchEdge[] = project.branches
      .filter((b) => b.status === 'merged' && b.mergedIntoId)
      .map((branch) => {
        const target = project.branches.find((p) => p.id === branch.mergedIntoId);
        return {
          id: `merge_${branch.id}_${branch.mergedIntoId}`,
          type: 'branchEdge' as const,
          source: branch.id,
          target: branch.mergedIntoId!,
          data: {
            parentBranchId: branch.id,
            childBranchId: branch.mergedIntoId!,
            parentColor: branch.color,
            childColor: target?.color ?? '#EC4899',
            isActive: false,
            isMergeEdge: true,
          },
        };
      });

    return { nodes, edges: [...parentEdges, ...mergeEdges] };
  }, [project, rootBranchId]);
}
