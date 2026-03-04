import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Branch, Comment, CommentReply, Project } from '@/types/branch';
import { branchColorFromId } from '@/utils/colorUtils';
import { computeTreeLayout } from '@/utils/branchUtils';

interface ProjectStore {
  project: Project | null;
  loadProject: (project: Project) => void;
  createBranch: (parentId: string, name: string, description: string) => Branch;
  createRootBranch: (name: string, description: string) => Branch;
  updateBranch: (id: string, patch: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
  mergeBranches: (sourceId: string, targetId: string) => { source: Branch; target: Branch } | null;
  mergeMultipleBranches: (ids: string[]) => Branch[] | null;
  restoreBranch: (branch: Branch) => void;
  getBranchById: (id: string) => Branch | undefined;
  getChildBranches: (parentId: string) => Branch[];
  getAncestorChain: (id: string) => Branch[];
  addComment: (branchId: string, content: string, author: { id: string; name: string; avatarUrl: string; color: string }, pos?: { x: number; y: number }) => Comment;
  resolveComment: (branchId: string, commentId: string) => void;
  addReply: (branchId: string, commentId: string, content: string, author: { name: string; avatarUrl: string; color: string }) => void;
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

  createRootBranch: (name, description) => {
    const { project } = get();
    if (!project) throw new Error('No project loaded');

    const newId = `branch_${nanoid(8)}`;
    const color = branchColorFromId(newId);

    // Place new root to the right of all existing branches
    const maxX = project.branches.reduce((m, b) => Math.max(m, b.position?.x ?? 0), 0);
    const position = { x: maxX + 500, y: 50 };

    const newBranch: Branch = {
      id: newId,
      name,
      description,
      parentId: null,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color,
      tags: [],
      collaborators: [],
      position,
      checkpoints: [],
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
    set((s) => {
      if (!s.project) return s;
      // Collect all descendant IDs (recursive)
      const toDelete = new Set<string>([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const b of s.project.branches) {
          if (!toDelete.has(b.id) && b.parentId !== null && toDelete.has(b.parentId)) {
            toDelete.add(b.id);
            grew = true;
          }
        }
      }
      return {
        project: {
          ...s.project,
          branches: s.project.branches.filter((b) => !toDelete.has(b.id)),
        },
      };
    });
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

  restoreBranch: (branch) => {
    set((s) => ({
      project: s.project
        ? { ...s.project, branches: [...s.project.branches, branch] }
        : null,
    }));
  },

  mergeMultipleBranches: (ids) => {
    const { project } = get();
    if (!project || ids.length < 2) return null;
    const branches = ids.map((id) => project.branches.find((b) => b.id === id)).filter(Boolean) as Branch[];
    if (branches.length < 2) return null;
    ids.forEach((id) => get().updateBranch(id, { status: 'merged' }));
    return branches;
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

  addComment: (branchId, content, author, pos) => {
    const comment: Comment = {
      id: `cmt_${nanoid(8)}`,
      branchId,
      authorId: author.id,
      authorName: author.name,
      authorAvatarUrl: author.avatarUrl,
      authorColor: author.color,
      content: content.trim(),
      timestamp: Date.now(),
      ...(pos ?? {}),
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

  resolveComment: (branchId, commentId) => {
    set((s) => ({
      project: s.project ? {
        ...s.project,
        branches: s.project.branches.map((b) =>
          b.id === branchId
            ? { ...b, comments: b.comments.map((c) => c.id === commentId ? { ...c, resolved: !c.resolved } : c) }
            : b
        ),
      } : null,
    }));
  },

  addReply: (branchId, commentId, content, author) => {
    const reply: CommentReply = {
      id: `reply_${nanoid(8)}`,
      authorName: author.name,
      authorAvatarUrl: author.avatarUrl,
      authorColor: author.color,
      content: content.trim(),
      timestamp: Date.now(),
    };
    set((s) => ({
      project: s.project ? {
        ...s.project,
        branches: s.project.branches.map((b) =>
          b.id === branchId
            ? { ...b, comments: b.comments.map((c) => c.id === commentId ? { ...c, replies: [...(c.replies ?? []), reply] } : c) }
            : b
        ),
      } : null,
    }));
  },
}));
