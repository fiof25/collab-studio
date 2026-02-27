import type { Node, Edge } from '@xyflow/react';
import type { BranchStatus, Collaborator } from './branch';

export interface BranchNodeData extends Record<string, unknown> {
  branchId: string;
  name: string;
  description: string;
  status: BranchStatus;
  color: string;
  codeSnapshot: string;
  collaborators: Collaborator[];
  checkpointCount: number;
  commentCount: number;
  updatedAt: number;
  isRoot: boolean;
}

export interface BranchEdgeData extends Record<string, unknown> {
  parentBranchId: string;
  childBranchId: string;
  parentColor: string;
  childColor: string;
  isActive: boolean;
}

export type CanvasBranchNode = Node<BranchNodeData, 'branchNode'>;
export type CanvasBranchEdge = Edge<BranchEdgeData, 'branchEdge'>;

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}
