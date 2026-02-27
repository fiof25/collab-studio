import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Branch, Comment, Project } from '@/types/branch';
import { branchColorFromId } from '@/utils/colorUtils';
import { computeTreeLayout } from '@/utils/branchUtils';

interface ProjectStore {
  project: Project | null;
  loadProject: (project: Project) => void;
  createBranch: (parentId: string, name: string, description: string) => Branch;
  updateBranch: (id: string, patch: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
  mergeBranches: (sourceId: string, targetId: string) => { source: Branch; target: Branch } | null;
  getBranchById: (id: string) => Branch | undefined;
  getChildBranches: (parentId: string) => Branch[];
  getAncestorChain: (id: string) => Branch[];
  addComment: (branchId: string, content: string, author: { id: string; name: string; avatarUrl: string; color: string }) => Comment;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: null,

  loadProject: (project) => {
    // Compute initial layout positions if not set
    const positions = computeTreeLayout(project.branches, project.rootBranchId);
    const branches = project.branches.map((b) => ({
      ...b,
      position: b.position ?? positions[b.id] ?? { x: 0, y: 0 },
    }));
    set({ project: { ...project, branches } });
  },

  createBranch: (parentId, name, description) => {
    const { project } = get();
    if (!project) throw new Error('No project loaded');

    const parent = project.branches.find((b) => b.id === parentId);
    const newId = `branch_${nanoid(8)}`;
    const color = branchColorFromId(newId);

    // Compute position below parent with offset
    const siblings = project.branches.filter((b) => b.parentId === parentId);
    const parentPos = parent?.position ?? { x: 400, y: 50 };
    const position = {
      x: parentPos.x + (siblings.length - Math.floor(siblings.length / 2)) * 280,
      y: parentPos.y + 220,
    };

    // Copy latest checkpoint from parent
    const latestCheckpoint = parent?.checkpoints[parent.checkpoints.length - 1];
    const newBranch: Branch = {
      id: newId,
      name,
      description,
      parentId,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color,
      tags: [],
      collaborators: parent?.collaborators.slice(0, 1) ?? [],
      position,
      checkpoints: latestCheckpoint
        ? [{ ...latestCheckpoint, id: `ckpt_${nanoid(6)}`, branchId: newId, label: 'Branched off from ' + parent?.name }]
        : [],
      comments: [],
    };

    set((s) => ({
      project: s.project
        ? { ...s.project, branches: [...s.project.branches, newBranch] }
        : null,
    }));

    return newBranch;
  },

  updateBranch: (id, patch) => {
    set((s) => ({
      project: s.project
        ? {
            ...s.project,
            branches: s.project.branches.map((b) =>
              b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b
            ),
          }
        : null,
    }));
  },

  deleteBranch: (id) => {
    set((s) => ({
      project: s.project
        ? {
            ...s.project,
            branches: s.project.branches.filter((b) => b.id !== id && b.parentId !== id),
          }
        : null,
    }));
  },

  mergeBranches: (sourceId, targetId) => {
    const { project } = get();
    if (!project) return null;
    const source = project.branches.find((b) => b.id === sourceId);
    const target = project.branches.find((b) => b.id === targetId);
    if (!source || !target) return null;
    // Both branches are retired
    get().updateBranch(sourceId, { status: 'merged' });
    get().updateBranch(targetId, { status: 'merged' });
    return { source, target };
  },

  getBranchById: (id) => {
    return get().project?.branches.find((b) => b.id === id);
  },

  getChildBranches: (parentId) => {
    return get().project?.branches.filter((b) => b.parentId === parentId) ?? [];
  },

  getAncestorChain: (id) => {
    const { project } = get();
    if (!project) return [];
    const branches = project.branches;
    const chain: Branch[] = [];
    let current = branches.find((b) => b.id === id);
    while (current) {
      chain.unshift(current);
      if (!current.parentId) break;
      current = branches.find((b) => b.id === current!.parentId);
    }
    return chain;
  },

  addComment: (branchId, content, author) => {
    const comment: Comment = {
      id: `cmt_${nanoid(8)}`,
      branchId,
      authorId: author.id,
      authorName: author.name,
      authorAvatarUrl: author.avatarUrl,
      authorColor: author.color,
      content: content.trim(),
      timestamp: Date.now(),
    };
    set((s) => ({
      project: s.project
        ? {
            ...s.project,
            branches: s.project.branches.map((b) =>
              b.id === branchId
                ? { ...b, comments: [...b.comments, comment], updatedAt: Date.now() }
                : b
            ),
          }
        : null,
    }));
    return comment;
  },
}));
