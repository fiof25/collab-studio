import { create } from 'zustand';
import type { Project } from '@/types/branch';
import { mockProject } from '@/data/mockProject';

const emptyCollabProject: Project = {
  id: 'proj_02',
  name: 'New project',
  description: '',
  createdAt: Date.now() - 1000 * 60 * 6,
  updatedAt: Date.now(),
  rootBranchId: '',
  branches: [],
};

interface ProjectsStore {
  projects: Project[];
  addProject: (project: Project) => void;
}

export const useProjectsStore = create<ProjectsStore>((set) => ({
  projects: [emptyCollabProject, mockProject],
  addProject: (project) => set((s) => ({ projects: [...s.projects, project] })),
}));
