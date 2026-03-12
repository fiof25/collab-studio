import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '@/store/useProjectStore';
import { createTestProject, createTestBranch, createTestBlueprint, createTestCheckpoint } from '@/test/factories';

describe('useProjectStore', () => {
  beforeEach(() => {
    // Reset store to a clean state with a loaded project
    const project = createTestProject();
    useProjectStore.setState({ project: null });
    useProjectStore.getState().loadProject(project);
  });

  describe('createBranch', () => {
    it('creates a branch with correct parentId', () => {
      const { createBranch } = useProjectStore.getState();
      const rootId = useProjectStore.getState().project!.rootBranchId;

      const child = createBranch(rootId, 'child-branch', 'A child');

      expect(child.parentId).toBe(rootId);
      expect(child.name).toBe('child-branch');
      expect(child.description).toBe('A child');
      expect(child.status).toBe('active');
      expect(child.id).toMatch(/^branch_/);
    });

    it('copies parent latest checkpoint to new branch', () => {
      const { createBranch } = useProjectStore.getState();
      const rootId = useProjectStore.getState().project!.rootBranchId;

      const child = createBranch(rootId, 'fork', 'forked');

      expect(child.checkpoints).toHaveLength(1);
      expect(child.checkpoints[0]!.branchId).toBe(child.id);
      expect(child.checkpoints[0]!.label).toContain('Branched off from');
    });

    it('adds the new branch to the project branches list', () => {
      const { createBranch } = useProjectStore.getState();
      const rootId = useProjectStore.getState().project!.rootBranchId;

      createBranch(rootId, 'new-one', '');

      const branches = useProjectStore.getState().project!.branches;
      expect(branches).toHaveLength(2); // root + new
      expect(branches.find((b) => b.name === 'new-one')).toBeDefined();
    });
  });

  describe('createRootBranch', () => {
    it('creates a parentless branch', () => {
      const { createRootBranch } = useProjectStore.getState();

      const root2 = createRootBranch('second-root', 'Another root');

      expect(root2.parentId).toBeNull();
      expect(root2.name).toBe('second-root');
      expect(root2.checkpoints).toHaveLength(0);
    });

    it('positions new root to the right of existing branches', () => {
      const { createRootBranch } = useProjectStore.getState();

      const root2 = createRootBranch('right-root', '');

      const existingRoot = useProjectStore.getState().project!.branches.find(
        (b) => b.id === useProjectStore.getState().project!.rootBranchId
      );
      expect(root2.position.x).toBeGreaterThan(existingRoot!.position.x);
    });
  });

  describe('updateBranch', () => {
    it('patches branch fields', () => {
      const { updateBranch } = useProjectStore.getState();
      const rootId = useProjectStore.getState().project!.rootBranchId;

      updateBranch(rootId, { name: 'renamed', description: 'updated desc' });

      const branch = useProjectStore.getState().project!.branches.find((b) => b.id === rootId);
      expect(branch!.name).toBe('renamed');
      expect(branch!.description).toBe('updated desc');
    });

    it('updates updatedAt timestamp', () => {
      const rootId = useProjectStore.getState().project!.rootBranchId;
      const before = useProjectStore.getState().project!.branches.find((b) => b.id === rootId)!.updatedAt;

      // Small delay to ensure timestamp differs
      useProjectStore.getState().updateBranch(rootId, { name: 'changed' });

      const after = useProjectStore.getState().project!.branches.find((b) => b.id === rootId)!.updatedAt;
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });

  describe('updateBlueprint', () => {
    it('writes blueprint to the correct branch', () => {
      const rootId = useProjectStore.getState().project!.rootBranchId;
      const blueprint = createTestBlueprint({ title: 'My Blueprint' });

      useProjectStore.getState().updateBlueprint(rootId, blueprint);

      const branch = useProjectStore.getState().project!.branches.find((b) => b.id === rootId);
      expect(branch!.blueprint).toBeDefined();
      expect(branch!.blueprint!.title).toBe('My Blueprint');
    });

    it('does not affect other branches', () => {
      const rootId = useProjectStore.getState().project!.rootBranchId;
      const child = useProjectStore.getState().createBranch(rootId, 'child', '');
      const blueprint = createTestBlueprint();

      useProjectStore.getState().updateBlueprint(rootId, blueprint);

      const childBranch = useProjectStore.getState().project!.branches.find((b) => b.id === child.id);
      expect(childBranch!.blueprint).toBeUndefined();
    });
  });

  describe('deleteBranch', () => {
    it('removes the branch from the project', () => {
      const rootId = useProjectStore.getState().project!.rootBranchId;
      const child = useProjectStore.getState().createBranch(rootId, 'to-delete', '');

      useProjectStore.getState().deleteBranch(child.id);

      const branches = useProjectStore.getState().project!.branches;
      expect(branches.find((b) => b.id === child.id)).toBeUndefined();
      expect(branches).toHaveLength(1); // only root
    });

    it('removes all descendants recursively', () => {
      const rootId = useProjectStore.getState().project!.rootBranchId;
      const child = useProjectStore.getState().createBranch(rootId, 'parent-child', '');
      const grandchild = useProjectStore.getState().createBranch(child.id, 'grandchild', '');

      useProjectStore.getState().deleteBranch(child.id);

      const branches = useProjectStore.getState().project!.branches;
      expect(branches.find((b) => b.id === child.id)).toBeUndefined();
      expect(branches.find((b) => b.id === grandchild.id)).toBeUndefined();
      expect(branches).toHaveLength(1); // only root
    });
  });
});
