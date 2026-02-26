import type { Branch } from '@/types/branch';

/** Converts a slug like "hero-redesign" to "Hero redesign" for display. */
export function toDisplayName(slug: string): string {
  const spaced = slug.replace(/-/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function getAncestorChain(branches: Branch[], branchId: string): Branch[] {
  const chain: Branch[] = [];
  let current = branches.find((b) => b.id === branchId);
  while (current) {
    chain.unshift(current);
    if (!current.parentId) break;
    current = branches.find((b) => b.id === current!.parentId);
  }
  return chain;
}

export function getChildren(branches: Branch[], parentId: string): Branch[] {
  return branches.filter((b) => b.parentId === parentId);
}

export function getDescendants(branches: Branch[], branchId: string): Branch[] {
  const result: Branch[] = [];
  const queue = [branchId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const children = getChildren(branches, id);
    result.push(...children);
    queue.push(...children.map((c) => c.id));
  }
  return result;
}

export function buildDepthMap(branches: Branch[], rootId: string): Record<string, number> {
  const map: Record<string, number> = {};
  const visit = (id: string, depth: number) => {
    map[id] = depth;
    getChildren(branches, id).forEach((c) => visit(c.id, depth + 1));
  };
  visit(rootId, 0);
  return map;
}

export function computeTreeLayout(
  branches: Branch[],
  rootId: string
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const NODE_W = 300;
  const NODE_H = 260;

  // BFS to compute level widths
  const levelNodes: string[][] = [];
  const queue: { id: string; level: number }[] = [{ id: rootId, level: 0 }];

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (!levelNodes[level]) levelNodes[level] = [];
    levelNodes[level].push(id);
    const children = getChildren(branches, id);
    children.forEach((c) => queue.push({ id: c.id, level: level + 1 }));
  }

  // Assign x/y based on level and sibling index
  levelNodes.forEach((nodeIds, level) => {
    const totalWidth = nodeIds.length * NODE_W;
    nodeIds.forEach((id, idx) => {
      positions[id] = {
        x: -totalWidth / 2 + idx * NODE_W + NODE_W / 2,
        y: level * NODE_H,
      };
    });
  });

  // Shift so root is at (400, 60)
  const rootPos = positions[rootId] ?? { x: 0, y: 0 };
  const offsetX = 400 - rootPos.x;
  const offsetY = 60 - rootPos.y;

  Object.keys(positions).forEach((id) => {
    positions[id]!.x += offsetX;
    positions[id]!.y += offsetY;
  });

  return positions;
}
