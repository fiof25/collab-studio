import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import type { ProjectFile } from '@/types/branch';

const SERVER_URL = '';

/**
 * Auto-generates/regenerates blueprints whenever a branch's latest checkpoint changes.
 * Tracks branchId → lastCheckpointId so re-generation fires on every new checkpoint.
 */
export function useAutoBlueprint() {
  const branches = useProjectStore((s) => s.project?.branches);
  const getBranchById = useProjectStore((s) => s.getBranchById);
  const updateBlueprint = useProjectStore((s) => s.updateBlueprint);
  const updateBranch = useProjectStore((s) => s.updateBranch);

  // Track branchId -> last checkpoint ID that was queued for generation
  const queued = useRef(new Map<string, string>());

  // Fingerprint changes whenever any branch gains a new checkpoint
  const fingerprint = branches
    ?.map((b) => `${b.id}:${b.checkpoints.at(-1)?.id ?? ''}`)
    .join('|') ?? '';

  useEffect(() => {
    if (!branches) return;

    const toGenerate = branches.filter((b) => {
      const ckpt = b.checkpoints.at(-1);
      if (!ckpt?.id) return false;
      // Skip if we already queued this exact checkpoint
      if (queued.current.get(b.id) === ckpt.id) return false;
      return !!(ckpt.files?.length || ckpt.codeSnapshot);
    });

    if (toGenerate.length === 0) return;

    // Mark as queued immediately to prevent duplicate requests on re-render
    toGenerate.forEach((b) => {
      const ckptId = b.checkpoints.at(-1)!.id;
      queued.current.set(b.id, ckptId);
    });

    toGenerate.forEach((branch, i) => {
      // Stagger requests: 2 calls per branch (generate + snapshot), rate limit is 10/min.
      // Use 2s intervals to stay well under the limit.
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
          // Run sequentially to avoid burst rate-limiting
          const bpRes = await fetch(`${SERVER_URL}/api/blueprint/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              branchId: branch.id,
              branchName: branch.name,
              parentBranchName: parentBranch?.name,
              files,
            }),
          });

          if (bpRes.ok) {
            const bpData = await bpRes.json();
            if (bpData?.success) updateBlueprint(branch.id, bpData.blueprint);
          }

          const snapRes = await fetch(`${SERVER_URL}/api/blueprint/snapshot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branchId: branch.id, branchName: branch.name, files }),
          });

          if (snapRes.ok) {
            const snapData = await snapRes.json();
            if (snapData?.success && snapData.description && !branch.descriptionPinned) {
              updateBranch(branch.id, { description: snapData.description });
            }
          }
        } catch {
          // Server not running — silently skip
        }
      }, i * 2000);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);
}
