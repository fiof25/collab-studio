import type { Branch, Project, BranchCheckpoint, Collaborator, ProjectFile } from '@/types/branch';
import type { Blueprint, BlueprintFeature, MergePlanStep, MergeRecord } from '@/types/blueprint';

let counter = 0;
function uid(prefix = 'test') {
  return `${prefix}_${++counter}`;
}

export function createTestCollaborator(overrides: Partial<Collaborator> = {}): Collaborator {
  const id = uid('user');
  return {
    id,
    name: `User ${id}`,
    avatarUrl: `https://example.com/avatar/${id}.png`,
    color: '#8B5CF6',
    ...overrides,
  };
}

export function createTestCheckpoint(overrides: Partial<BranchCheckpoint> = {}): BranchCheckpoint {
  const id = uid('ckpt');
  return {
    id,
    branchId: overrides.branchId ?? 'branch_1',
    label: 'Initial',
    timestamp: Date.now(),
    thumbnailUrl: '',
    codeSnapshot: '<html><body>Hello</body></html>',
    files: [
      { path: 'index.html', content: '<html><body>Hello</body></html>', language: 'html' },
    ],
    ...overrides,
  };
}

export function createTestBranch(overrides: Partial<Branch> = {}): Branch {
  const id = overrides.id ?? uid('branch');
  return {
    id,
    name: `test-branch-${id}`,
    description: 'A test branch',
    parentId: null,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    color: '#8B5CF6',
    tags: [],
    collaborators: [createTestCollaborator()],
    position: { x: 400, y: 50 },
    checkpoints: [createTestCheckpoint({ branchId: id })],
    comments: [],
    ...overrides,
  };
}

export function createTestFeature(overrides: Partial<BlueprintFeature> = {}): BlueprintFeature {
  const id = overrides.id ?? uid('feat');
  return {
    id,
    name: `Feature ${id}`,
    description: 'A test feature',
    behavior: 'Renders a test component',
    state: [],
    entryPoints: [],
    codeRegions: [],
    files: ['index.html'],
    dependencies: [],
    ...overrides,
  };
}

export function createTestBlueprint(overrides: Partial<Blueprint> = {}): Blueprint {
  return {
    title: 'Test Blueprint',
    summary: 'A test blueprint summary',
    purpose: 'Testing',
    architecture: {
      pattern: 'Single page static',
      initFlow: 'DOMContentLoaded → render()',
      stateModel: [],
      eventModel: [],
    },
    techStack: ['HTML', 'CSS'],
    fileStructure: [{ path: 'index.html', description: 'Main file' }],
    features: [createTestFeature()],
    designTokens: { primary: '#8B5CF6' },
    changeHistory: ['Initial creation'],
    parent: null,
    raw: '# Test Blueprint',
    ...overrides,
  };
}

export function createTestMergePlanStep(overrides: Partial<MergePlanStep> = {}): MergePlanStep {
  return {
    action: 'modify',
    file: 'index.html',
    description: 'Merge hero section',
    status: 'pending',
    ...overrides,
  };
}

export function createTestMergeRecord(overrides: Partial<MergeRecord> = {}): MergeRecord {
  return {
    sourceId: 'branch_src',
    sourceName: 'Source Branch',
    targetId: 'branch_tgt',
    targetName: 'Target Branch',
    featuresMigrated: ['feat_1'],
    mergePlan: [createTestMergePlanStep()],
    conflictsResolved: [],
    timestamp: Date.now(),
    ...overrides,
  };
}

export function createTestProject(overrides: Partial<Project> = {}): Project {
  const rootBranch = createTestBranch({ id: 'branch_root', name: 'main', parentId: null });
  return {
    id: 'project_test',
    name: 'Test Project',
    description: 'A test project',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    branches: [rootBranch],
    rootBranchId: rootBranch.id,
    ...overrides,
  };
}

/** Reset the counter between test files if needed */
export function resetFactoryCounter() {
  counter = 0;
}
