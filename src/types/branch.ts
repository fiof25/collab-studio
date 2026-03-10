import type { Blueprint } from './blueprint';

export type BranchStatus = 'active' | 'archived' | 'merging' | 'merged';

export interface ProjectFile {
  path: string;      // e.g. "index.html", "src/components/Hero.tsx"
  content: string;
  language: string;  // "html", "css", "typescript", "javascript", etc.
}

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
  codeSnapshot: string;  // kept for backward compat (single HTML string)
  files?: ProjectFile[]; // multi-file support; single-file branches use [{ path: 'index.html', ... }]
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
  blueprint?: Blueprint | null;
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
