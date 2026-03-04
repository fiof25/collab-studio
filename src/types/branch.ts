export type BranchStatus = 'active' | 'archived' | 'merging' | 'merged';

export interface CommentReply {
  id: string;
  authorName: string;
  authorAvatarUrl: string;
  authorColor: string;
  content: string;
  timestamp: number;
}

export interface Comment {
  id: string;
  branchId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  authorColor: string;
  content: string;
  timestamp: number;
  x?: number; // % from left of preview
  y?: number; // % from top of preview
  resolved?: boolean;
  replies?: CommentReply[];
}

export interface Collaborator {
  id: string;
  name: string;
  avatarUrl: string;
  color: string;
}

export interface BranchCheckpoint {
  id: string;
  branchId: string;
  label: string;
  timestamp: number;
  thumbnailUrl: string;
  codeSnapshot: string;
}

export interface Branch {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  mergeParentIds?: string[]; // additional parents for blend nodes
  status: BranchStatus;
  createdAt: number;
  updatedAt: number;
  color: string;
  checkpoints: BranchCheckpoint[];
  collaborators: Collaborator[];
  tags: string[];
  position: { x: number; y: number };
  comments: Comment[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  branches: Branch[];
  rootBranchId: string;
}
