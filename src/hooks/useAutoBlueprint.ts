import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import type { ProjectFile } from '@/types/branch';

const SERVER_URL = 'http://localhost:3001';

/**
 * Auto-generates blueprints for any branch that has code but no blueprint yet.
 * Runs once on mount, then re-runs when new branches without blueprints appear.
 * Requests are staggered by 600ms to stay within rate limits.
 */
export function useAutoBlueprint() {
  const branches = useProjectStore((s) => s.project?.branches);
  const getBranchById = useProjectStore((s) => s.getBranchById);
  const updateBlueprint = useProjectStore((s) => s.updateBlueprint);
  const updateBranch = useProjectStore((s) => s.updateBranch);

  // Track which branch IDs we've already queued so we don't duplicate on re-render
  const queued = useRef(new Set<string>());

  useEffect(() => {
    if (!branches) return;

    // Find branches with code but no blueprint, not yet queued
    const toGenerate = branches.filter((b) => {
      if (queued.current.has(b.id)) return false;
      if (b.blueprint) return false;
      const ckpt = b.checkpoints.at(-1);
      return !!(ckpt?.files?.length || ckpt?.codeSnapshot);
    });

    if (toGenerate.length === 0) return;

    // Mark all as queued immediately so re-renders don't re-queue them
    toGenerate.forEach((b) => queued.current.add(b.id));

    // Stagger requests by 600ms each
    toGenerate.forEach((branch, i) => {
      setTimeout(async () => {
        const ckpt = branch.checkpoints.at(-1);
        if (!ckpt) return;

        const files: ProjectFile[] =
          ckpt.files?.length
            ? ckpt.files
            : [{ path: 'index.html', content: ckpt.codeSnapshot ?? '', language: 'html' }];

        if (!files[0]?.content) return;

        const parentBranch = branch.parentId ? getBranchById(branch.parentId) : undefined;

        try {
          const [bpRes, snapRes] = await Promise.allSettled([
            fetch(`${SERVER_URL}/api/blueprint/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                branchId: branch.id,
                branchName: branch.name,
                parentBranchName: parentBranch?.name,
                files,
              }),
            }).then((r) => r.json()),
            fetch(`${SERVER_URL}/api/blueprint/snapshot`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ branchId: branch.id, branchName: branch.name, files }),
            }).then((r) => r.json()),
          ]);

          if (bpRes.status === 'fulfilled' && bpRes.value?.success) {
            updateBlueprint(branch.id, bpRes.value.blueprint);
          }
          if (snapRes.status === 'fulfilled' && snapRes.value?.success && snapRes.value.description && !branch.descriptionPinned) {
            updateBranch(branch.id, { description: snapRes.value.description });
          }
        } catch {
          // Server not running — silently skip
        }
      }, i * 600);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches?.length]);
}
