export type BranchStatus = 'active' | 'archived' | 'merging' | 'merged';

export interface Comment {
  id: string;
  branchId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  authorColor: string;
  content: string;
  timestamp: number;
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
