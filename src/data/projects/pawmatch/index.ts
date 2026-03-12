/**
 * PawMatch — Project Orchestrator
 *
 * Tinder-style pet matching app. Defines the branch tree
 * and assembles the full project from individual branch files.
 */
import type { Branch, BranchStatus, Collaborator, Comment, Project } from '@/types/branch';

import * as main from './branches/main';
import * as traitsAndPortraits from './branches/traits-and-portraits';
import * as funFacts from './branches/fun-facts';
import * as nearbyParks from './branches/nearby-parks';
import * as factPortraits from './branches/fact-portraits';

const now = Date.now();
const day = 1000 * 60 * 60 * 24;
const hour = 1000 * 60 * 60;

// ── Branch tree ─────────────────────────────────────────────────
//   main
//   ├── traits-and-portraits ──┐
//   ├── fun-facts ─────────────┼── fact-portraits (merged)
//   └── nearby-parks

interface BranchMetadata {
  id: string;
  name: string;
  description: string;
  status: BranchStatus;
  color: string;
  collaborators: Collaborator[];
  tags: string[];
}

interface BranchNode {
  module: { code: string; comments: Comment[]; metadata: BranchMetadata };
  parentId: string | null;
  mergeParentIds?: string[];
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
    createdAt: now - day * 2,
    updatedAt: now - hour * 1,
  },
  {
    module: traitsAndPortraits,
    parentId: 'pm_branch_root',
    position: { x: 440, y: 420 },
    previewScrollY: 350,
    createdAt: now - day * 1,
    updatedAt: now - hour * 0.5,
  },
  {
    module: funFacts,
    parentId: 'pm_branch_root',
    position: { x: 700, y: 420 },
    previewScrollY: 420,
    createdAt: now - day * 1,
    updatedAt: now - hour * 0.25,
  },
  {
    module: nearbyParks,
    parentId: 'pm_branch_root',
    position: { x: 180, y: 420 },
    previewScrollY: 440,
    createdAt: now - day * 1,
    updatedAt: now - hour * 0.1,
  },
  {
    module: factPortraits,
    parentId: 'pm_branch_traits',          // primary parent: traits-and-portraits
    mergeParentIds: ['pm_branch_facts'],   // secondary parent: fun-facts
    position: { x: 570, y: 720 },
    previewScrollY: 280,
    createdAt: now - hour * 2,
    updatedAt: now - hour * 0.05,
  },
];

// ── Assembly ────────────────────────────────────────────────────

function buildBranch(node: BranchNode): Branch {
  const { module: mod, parentId, mergeParentIds, position, createdAt, updatedAt, previewScrollY } = node;
  return {
    ...mod.metadata,
    parentId,
    ...(mergeParentIds ? { mergeParentIds } : {}),
    position,
    createdAt,
    updatedAt,
    ...(previewScrollY !== undefined ? { previewScrollY } : {}),
    comments: mod.comments,
    checkpoints: [
      {
        id: `ckpt_${mod.metadata.id.replace('pm_branch_', '')}1`,
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

export const pawMatchProject: Project = {
  id: 'proj_pawmatch',
  name: 'PawMatch',
  description: 'A Tinder-style pet matching app — swipe to find your perfect furry companion.',
  createdAt: now - day * 2,
  updatedAt: now - hour * 1,
  rootBranchId: 'pm_branch_root',
  branches,
};
