import { create } from 'zustand';
import type { Project } from '@/types/branch';
import { mockProject, pawMatchProject } from '@/data/projects';

const emptyCollabProject: Project = {
  id: 'proj_02',
  name: 'New project',
  description: '',
  createdAt: Date.now() - 1000 * 60 * 6,
  updatedAt: Date.now(),
  rootBranchId: 'branch_draft_01',
  branches: [
    {
      id: 'branch_draft_01',
      name: 'main',
      description: '',
      parentId: null,
      status: 'active',
      color: '#8B5CF6',
      createdAt: Date.now() - 1000 * 60 * 6,
      updatedAt: Date.now(),
      collaborators: [],
      tags: [],
      position: { x: 400, y: 200 },
      checkpoints: [],
      comments: [],
    },
  ],
};

interface ProjectsStore {
  projects: Project[];
  addProject: (project: Project) => void;
}

export const useProjectsStore = create<ProjectsStore>((set) => ({
  projects: [emptyCollabProject, mockProject, pawMatchProject],
  // projects: [emptyCollabProject, pawMatchProject],
  addProject: (project) => set((s) => ({ projects: [...s.projects, project] })),
}));
