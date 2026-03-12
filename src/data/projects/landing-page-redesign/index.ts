/**
 * Landing Page Redesign — Project Orchestrator
 *
 * Defines the branch tree structure and assembles the full project
 * from individual branch files. Each branch's code, comments, and
 * metadata live in their own file under ./branches/.
 */
import type { Branch, Project } from '@/types/branch';

import * as main from './branches/main';
import * as heroRedesign from './branches/hero-redesign';
import * as darkMode from './branches/dark-mode';
import * as mobileFirst from './branches/mobile-first';
import * as perfPass from './branches/perf-pass';
import * as darkMobileBlend from './branches/dark-mobile-blend';

const now = Date.now();
const day = 1000 * 60 * 60 * 24;
const hour = 1000 * 60 * 60;

// ── Branch tree ─────────────────────────────────────────────────
// Defines the parent→child relationships and canvas positions.
//
//   main
//   ├── hero-redesign
//   │   ├── mobile-first
//   │   └── perf-pass
//   └── dark-mode
//       └── dark-mobile-blend (merged)

import type { BranchStatus } from '@/types/branch';

interface BranchMetadata {
  id: string;
  name: string;
  description: string;
  status: BranchStatus;
  color: string;
  collaborators: import('@/types/branch').Collaborator[];
  tags: string[];
}

interface BranchNode {
  module: { code: string; comments: import('@/types/branch').Comment[]; metadata: BranchMetadata };
  parentId: string | null;
  position: { x: number; y: number };
  createdAt: number;
  updatedAt: number;
  previewScrollY?: number;
}

const tree: BranchNode[] = [
  {
    module: main,
    parentId: null,
    position: { x: 440, y: 100 },
    createdAt: now - day * 7,
    updatedAt: now - hour * 2,
  },
  {
    module: heroRedesign,
    parentId: 'branch_root',
    position: { x: 180, y: 420 },
    createdAt: now - day * 5,
    updatedAt: now - hour * 1,
  },
  {
    module: darkMode,
    parentId: 'branch_root',
    position: { x: 700, y: 420 },
    createdAt: now - day * 4,
    updatedAt: now - hour * 3,
  },
  {
    module: mobileFirst,
    parentId: 'branch_hero',
    position: { x: 0, y: 760 },
    createdAt: now - day * 3,
    updatedAt: now - hour * 0.5,
  },
  {
    module: perfPass,
    parentId: 'branch_hero',
    position: { x: 360, y: 760 },
    createdAt: now - day * 3,
    updatedAt: now - day * 1,
  },
  {
    module: darkMobileBlend,
    parentId: 'branch_dark',
    position: { x: 700, y: 760 },
    createdAt: now - day * 1,
    updatedAt: now - hour * 0.25,
  },
];

// ── Assembly ────────────────────────────────────────────────────

function buildBranch(node: BranchNode): Branch {
  const { module: mod, parentId, position, createdAt, updatedAt, previewScrollY } = node;
  return {
    ...mod.metadata,
    parentId,
    position,
    createdAt,
    updatedAt,
    ...(previewScrollY !== undefined ? { previewScrollY } : {}),
    comments: mod.comments,
    checkpoints: [
      {
        id: `ckpt_${mod.metadata.id.replace('branch_', '')}1`,
        branchId: mod.metadata.id,
        label: mod.metadata.description,
        timestamp: createdAt,
        thumbnailUrl: '',
        codeSnapshot: mod.code,
      },
    ],
  };
}

export const branches: Branch[] = tree.map(buildBranch);

export const mockProject: Project = {
  id: 'proj_01',
  name: 'Landing Page Redesign',
  description: 'Collaborative redesign of the main product landing page.',
  createdAt: now - day * 7,
  updatedAt: now - hour * 0.25,
  rootBranchId: 'branch_root',
  branches,
};
