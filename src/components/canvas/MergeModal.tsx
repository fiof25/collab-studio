import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Merge, GitBranch, Check, ChevronRight, Loader2, CheckCircle2, ArrowRight, Layers, AlertCircle, RotateCcw, Plus, Camera, X } from 'lucide-react';
import { clsx } from 'clsx';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { FeatureOverlay } from './FeatureOverlay';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';
import { toDisplayName } from '@/utils/branchUtils';
import { useMergeStream, type ConflictQuestion } from '@/hooks/useMergeStream';
import type { Branch, ProjectFile } from '@/types/branch';
import type { BlueprintFeature, MergePlanStep } from '@/types/blueprint';

type MergeStep = 'select' | 'features' | 'qa' | 'executing' | 'done';

const STEP_INDEX: Record<MergeStep, number> = { select: 0, features: 1, qa: 2, executing: 3, done: 4 };
const STEP_TITLE: Record<MergeStep, string> = {
  select: 'Choose versions',
  features: 'Select features',
  qa: 'Review',
  executing: 'Merging…',
  done: 'Done',
};

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface MergeModalProps {
  variant: 'merge' | 'newBranch' | 'newDraft';
}

export function MergeModal({ variant }: MergeModalProps) {
  const navigate = useNavigate();
  const { activeModal, closeModal, modalContext } = useUIStore();
  const { project, createBranch, createRootBranch, updateBranch, deleteBranch, updateBlueprint } = useProjectStore();
  const pushToast = useUIStore((s) => s.pushToast);

  // newBranch / newDraft state
  const [parentId, setParentId] = useState(
    (modalContext?.parentId as string) ?? (project?.rootBranchId ?? '')
  );
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  // merge step machine
  const [step, setStep] = useState<MergeStep>('select');

  // branch selection
  // contextBranchIds: branches pre-selected on canvas; falls back to sourceId/targetId legacy context
  const contextSourceId = modalContext?.sourceId as string | undefined;
  const contextTargetId = modalContext?.targetId as string | undefined;
  const contextBranchIds = (modalContext?.branchIds as string[] | undefined)
    ?? (contextSourceId && contextTargetId ? [contextSourceId, contextTargetId] : undefined);

  // baseId = the branch that stays as foundation; contributorId = the branch donating features
  const [baseId, setBaseId] = useState(contextTargetId ?? '');
  const [contributorId, setContributorId] = useState(contextSourceId ?? '');

  // feature selection (from source blueprint)
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<string>>(new Set());

  // Scout state
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutDone, setScoutDone] = useState(false);
  const [scoutPlan, setScoutPlan] = useState<MergePlanStep[]>([]);
  const [scoutSummary, setScoutSummary] = useState('');
  const [scoutQuestions, setScoutQuestions] = useState<ConflictQuestion[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});

  // executing progress
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [createdBranchId, setCreatedBranchId] = useState<string | null>(null);
  const progressEndRef = useRef<HTMLDivElement>(null);

  const { startScout, executeMerge } = useMergeStream();

  const [mergeInstructions, setMergeInstructions] = useState('');
  const [merging, setMerging] = useState(false);
  const [mergeErrMsg, setMergeErrMsg] = useState<string | null>(null);
  const [selectedBaseFeatureIds, setSelectedBaseFeatureIds] = useState<Set<string>>(new Set());

  const open =
    variant === 'merge'
      ? activeModal === 'merge'
      : variant === 'newDraft'
      ? activeModal === 'newDraft'
      : activeModal === 'newBranch';

  const branches = project?.branches ?? [];
  const activeBranches = branches.filter((b) => b.status === 'active' || b.status === 'merging');

  // Only show branches that were selected on the canvas (or all active if opened without context)
  const pickableBranches = contextBranchIds
    ? branches.filter((b) => contextBranchIds.includes(b.id))
    : activeBranches;

  const baseBranch = branches.find((b) => b.id === baseId);
  const contributorBranch = branches.find((b) => b.id === contributorId);

  // Sync when modal opens
  useEffect(() => {
    if (activeModal === 'merge') {
      const base = contextTargetId ?? contextBranchIds?.[0] ?? '';
      const contributor = contextSourceId ?? contextBranchIds?.[1] ?? '';
      setBaseId(base);
      setContributorId(contributor);
      setStep('select');
      const bBranch = branches.find((b) => b.id === base);
      const cBranch = branches.find((b) => b.id === contributor);
      setSelectedBaseFeatureIds(new Set((bBranch?.blueprint?.features ?? []).map((f) => f.id)));
      setSelectedFeatureIds(new Set((cBranch?.blueprint?.features ?? []).map((f) => f.id)));
      setMergeInstructions('');
      setMerging(false);
      setMergeErrMsg(null);
      setProgressLines([]);
      setMergeError(null);
      setCreatedBranchId(null);
      setScoutLoading(false);
      setScoutDone(false);
      setScoutPlan([]);
      setScoutSummary('');
      setScoutQuestions([]);
      setQuestionAnswers({});
    }
    if (activeModal === 'newBranch') {
      setParentId((modalContext?.parentId as string) ?? (project?.rootBranchId ?? ''));
      setNewName('');
    }
    if (activeModal === 'newDraft') {
      setNewName('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModal]);

  // Scroll progress to bottom
  useEffect(() => {
    progressEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progressLines]);

  // Trigger Scout when entering the qa step
  useEffect(() => {
    if (step !== 'qa' || !contributorBranch || !baseBranch) return;
    const controller = new AbortController();
    setScoutLoading(true);
    setScoutDone(false);
    setScoutPlan([]);
    setScoutSummary('');
    setScoutQuestions([]);

    const getFiles = (branch: Branch): ProjectFile[] =>
      branch.checkpoints.at(-1)?.files ??
      [{ path: 'index.html', content: branch.checkpoints.at(-1)?.codeSnapshot ?? '', language: 'html' }];

    startScout(
      {
        sourceFiles: getFiles(contributorBranch),
        targetFiles: getFiles(baseBranch),
        sourceBlueprint: contributorBranch.blueprint ?? null,
        targetBlueprint: baseBranch.blueprint ?? null,
        selectedFeatureIds: Array.from(selectedFeatureIds),
      },
      (event) => {
        if (event.type === 'plan') {
          setScoutPlan(event.plan ?? []);
          setScoutSummary(event.summary ?? '');
          setScoutQuestions(event.questions ?? []);
          setScoutLoading(false);
          setScoutDone(true);
        }
        if (event.type === 'error') {
          setScoutLoading(false);
          setScoutDone(true);
        }
      },
      controller.signal
    ).catch(() => { setScoutLoading(false); setScoutDone(true); });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, contributorBranch?.id, baseBranch?.id, Array.from(selectedFeatureIds).sort().join(',')]);

  // Clicking a branch in the select step sets it as base; clicking again deselects
  const handleBranchClick = (id: string) => {
    if (baseId === id) {
      setBaseId('');
      setContributorId('');
    } else {
      setBaseId(id);
      // The contributor is whichever pickable branch isn't the base
      // (for 2-branch case; with more branches this would be the first non-base)
      const others = pickableBranches.filter((b) => b.id !== id);
      setContributorId(others[0]?.id ?? '');
    }
  };

  const contributorFeatures: BlueprintFeature[] = contributorBranch?.blueprint?.features ?? [];

  const toggleFeature = (id: string) => {
    setSelectedFeatureIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addProgress = (line: string) => setProgressLines((p) => [...p, line]);

  const handleExecuteMerge = async () => {
    if (!contributorBranch || !baseBranch) return;
    setStep('executing');
    setProgressLines([]);
    setMergeError(null);

    const getFiles = (branch: Branch): ProjectFile[] =>
      branch.checkpoints.at(-1)?.files ??
      [{ path: 'index.html', content: branch.checkpoints.at(-1)?.codeSnapshot ?? '', language: 'html' }];

    let mergedFiles: ProjectFile[] = getFiles(baseBranch);

    await executeMerge(
      {
        sourceFiles: getFiles(contributorBranch),
        targetFiles: getFiles(baseBranch),
        plan: scoutPlan,
        answers: questionAnswers,
        selectedFeatureIds: Array.from(selectedFeatureIds),
        sourceBlueprint: contributorBranch.blueprint ?? null,
      },
      (event) => {
        if (event.type === 'progress') addProgress(event.message);
        if (event.type === 'done') mergedFiles = event.mergedFiles;
        if (event.type === 'error') { addProgress(`Error: ${event.error}`); setMergeError(event.error); }
      }
    ).catch((err: Error) => { addProgress(`Error: ${err.message}`); setMergeError(err.message); });

    addProgress('Creating branch…');
    await delay(200);

    const mergedCode = mergedFiles.find((f) => f.path === 'index.html')?.content ?? '';
    const mergedName = `Merge: ${toDisplayName(contributorBranch.name)} → ${toDisplayName(baseBranch.name)}`;
    const child = createBranch(baseBranch.id, mergedName, '');
    updateBranch(child.id, {
      mergeParentIds: [contributorBranch.id],
      checkpoints: [
        {
          id: child.checkpoints[0]?.id ?? 'ckpt_merge',
          branchId: child.id,
          label: 'Merged version',
          timestamp: Date.now(),
          thumbnailUrl: '',
          codeSnapshot: mergedCode,
          files: mergedFiles,
        },
      ],
    });

    setCreatedBranchId(child.id);

    // Fire-and-forget blueprint + snapshot agents
    void fetch('/api/blueprint/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branchId: child.id,
        branchName: child.name,
        parentBranchName: baseBranch.name,
        files: mergedFiles,
      }),
    })
      .then((r) => r.json())
      .then((data) => { if (data.success) updateBlueprint(child.id, data.blueprint); })
      .catch(() => {});

    addProgress('Done!');
    await delay(300);
    setStep('done');
  };

  const handleCreate = () => {
    if (!parentId || !newName.trim()) return;
    setLoading(true);
    setTimeout(() => {
      createBranch(parentId, newName.trim(), '');
      pushToast({ type: 'success', message: `"${newName.trim()}" created` });
      closeModal();
      setLoading(false);
    }, 600);
  };

  const toggleBaseFeature = (id: string) => {
    setSelectedBaseFeatureIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleFlatMerge = async () => {
    if (!contributorBranch || !baseBranch) return;
    setMerging(true);
    setMergeErrMsg(null);

    const getFiles = (branch: Branch): ProjectFile[] =>
      branch.checkpoints.at(-1)?.files ??
      [{ path: 'index.html', content: branch.checkpoints.at(-1)?.codeSnapshot ?? '', language: 'html' }];

    let mergedFiles: ProjectFile[] = getFiles(baseBranch);
    let errorMsg: string | null = null;

    await executeMerge(
      {
        sourceFiles: getFiles(contributorBranch),
        targetFiles: getFiles(baseBranch),
        plan: [],
        answers: {},
        selectedFeatureIds: Array.from(selectedFeatureIds),
        sourceBlueprint: contributorBranch.blueprint ?? null,
        instructions: mergeInstructions || undefined,
      },
      (event) => {
        if (event.type === 'done') mergedFiles = event.mergedFiles;
        if (event.type === 'error') { errorMsg = event.error; }
      }
    ).catch((err: Error) => { errorMsg = err.message; });

    if (!errorMsg) {
      const mergedCode = mergedFiles.find((f) => f.path === 'index.html')?.content ?? '';
      const mergedName = `Merge: ${toDisplayName(contributorBranch.name)} → ${toDisplayName(baseBranch.name)}`;
      const child = createBranch(baseBranch.id, mergedName, '');
      updateBranch(child.id, {
        mergeParentIds: [contributorBranch.id],
        checkpoints: [{
          id: child.checkpoints[0]?.id ?? 'ckpt_merge',
          branchId: child.id,
          label: 'Merged version',
          timestamp: Date.now(),
          thumbnailUrl: '',
          codeSnapshot: mergedCode,
          files: mergedFiles,
        }],
      });
      pushToast({ type: 'success', message: 'Merge complete' });
      closeModal();
    } else {
      setMergeErrMsg(errorMsg);
    }
    setMerging(false);
  };

  // ── New Draft variant ────────────────────────────────────────────────────────

  if (variant === 'newDraft') {
    const handleCreateDraft = () => {
      if (!newName.trim()) return;
      setLoading(true);
      setTimeout(() => {
        createRootBranch(newName.trim(), '');
        pushToast({ type: 'success', message: `"${newName.trim()}" created` });
        closeModal();
        setLoading(false);
      }, 600);
    };

    return (
      <Modal open={open} onClose={closeModal} title="New Root" size="sm">
        <div className="space-y-4">
          <div>
            <input
              className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-ink-muted"
              placeholder="my-new-draft"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateDraft()}
              autoFocus
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={closeModal} className="flex-1">Cancel</Button>
            <Button
              variant="primary"
              onClick={handleCreateDraft}
              loading={loading}
              disabled={!newName.trim()}
              className="flex-1 !bg-ink-primary !text-canvas hover:!opacity-80"
              icon={<Plus size={14} />}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── New Branch variant ───────────────────────────────────────────────────────

  if (variant === 'newBranch') {
    return (
      <Modal open={open} onClose={closeModal} title="Add branch" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-ink-muted mb-1.5 block">Based on</label>
            <select
              className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-ink-muted"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {toDisplayName(b.name)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-ink-muted mb-1.5 block">Version name</label>
            <input
              className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-ink-muted"
              placeholder="my-new-version"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={closeModal} className="flex-1">Cancel</Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={loading}
              disabled={!newName.trim() || !parentId}
              className="flex-1"
              icon={<GitBranch size={14} />}
            >
              Create version
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Merge variant ────────────────────────────────────────────────────────────

  // Fixed column positions — never swap, only the base designation moves
  const leftBranch = pickableBranches[0];
  const rightBranch = pickableBranches[1];

  const handleSelectBase = (id: string) => {
    if (id === baseId || !id) return;
    setBaseId(id);
    setContributorId(id === leftBranch?.id ? (rightBranch?.id ?? '') : (leftBranch?.id ?? ''));
  };

  const getCode = (b: Branch | undefined) =>
    b?.checkpoints.at(-1)?.files?.find((f) => f.path === 'index.html')?.content ??
    b?.checkpoints.at(-1)?.codeSnapshot ?? '';

  const previewScale = 310 / 1400;
  const PREVIEW_H = 200;

  const renderPreviewColumn = (branch: Branch | undefined, isBase: boolean) => {
    const code = getCode(branch);
    const features = branch?.blueprint?.features ?? [];
    const featureSelectedIds = isBase ? selectedBaseFeatureIds : selectedFeatureIds;
    const toggleFn = isBase ? toggleBaseFeature : toggleFeature;

    return (
      <div
        className="flex flex-col flex-1 min-w-0 min-h-0 transition-all"
        style={{ background: isBase ? 'rgba(139,92,246,0.04)' : undefined }}
      >
        {/* Fixed: title + preview */}
        <div
          onClick={() => !isBase && handleSelectBase(branch?.id ?? '')}
          className="flex flex-col gap-4 px-6 pt-4 pb-4 flex-shrink-0"
          style={{ cursor: isBase ? 'default' : 'pointer' }}
        >
          {/* Title row */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <h3 className="text-base font-bold text-ink-primary truncate">
              {branch ? toDisplayName(branch.name) : <span className="text-ink-muted font-normal">No branch selected</span>}
            </h3>
            {isBase && (
              <span className="flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold text-white" style={{ background: 'rgb(139 92 246)' }}>
                Selected as Base
              </span>
            )}
          </div>

          {/* Preview */}
          <div
            className="rounded-lg overflow-hidden bg-surface-2 border border-line relative flex-shrink-0"
            style={{ height: PREVIEW_H }}
          >
            {code ? (
              <iframe
                srcDoc={code}
                className="absolute top-0 left-0 border-none pointer-events-none"
                style={{ width: '1400px', height: `${Math.ceil(PREVIEW_H / previewScale)}px`, transformOrigin: 'top left', transform: `scale(${previewScale})` }}
                sandbox="allow-scripts"
                title={branch?.name}
              />
            ) : (
              <div className="w-full h-full bg-white" />
            )}
          </div>
        </div>

        {/* Scrollable: feature list */}
        {features.length > 0 && (
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
            <div className="flex flex-col gap-2">
              {features.map((f) => (
                <button
                  key={f.id}
                  onClick={(e) => { e.stopPropagation(); toggleFn(f.id); }}
                  className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl border border-line bg-surface-2 hover:bg-surface-3 transition-colors"
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0 rounded"
                    style={{
                      width: 20, height: 20,
                      background: featureSelectedIds.has(f.id) ? 'rgb(139 92 246)' : 'transparent',
                      border: featureSelectedIds.has(f.id) ? 'none' : '1.5px solid rgb(var(--color-line, 63 63 70))',
                    }}
                  >
                    {featureSelectedIds.has(f.id) && <Check size={11} className="text-white" />}
                  </div>
                  <span className="text-sm text-ink-primary">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };


  return (
    <Modal open={open} onClose={merging ? () => {} : closeModal} size="merge" bare>
      <div className="flex flex-col overflow-hidden bg-surface-1 border border-line rounded-2xl shadow-float" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="relative flex items-center justify-center px-6 py-4 border-b border-line flex-shrink-0">
          <h2 className="text-base font-semibold text-ink-primary tracking-tight">Merge Mode</h2>
          <button
            onClick={closeModal}
            className="absolute right-4 w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Two-column preview area + instructions (with loading overlay) */}
        <div className="relative flex-1 min-h-0 flex flex-col">

          {/* Loading overlay */}
          {merging && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-none" style={{ background: 'rgba(13,13,18,0.75)', backdropFilter: 'blur(4px)' }}>
              <Loader2 size={28} className="animate-spin" style={{ color: 'rgb(139 92 246)' }} />
              <p className="text-sm font-medium text-ink-primary">Merging versions…</p>
              <p className="text-xs text-ink-muted">This may take a moment</p>
            </div>
          )}

          {/* Two-column preview area */}
          <div className="flex flex-1 min-h-0 border-b border-line">

            <div
              className="flex flex-col flex-1 min-w-0 min-h-0 rounded-none transition-all"
              style={{ border: baseId === leftBranch?.id ? '2px solid rgb(139 92 246)' : '2px solid transparent' }}
            >
              {renderPreviewColumn(leftBranch, baseId === leftBranch?.id)}
            </div>

            {/* Divider */}
            <div className="w-px bg-line flex-shrink-0" />

            <div
              className="flex flex-col flex-1 min-w-0 min-h-0 rounded-none transition-all"
              style={{ border: baseId === rightBranch?.id ? '2px solid rgb(139 92 246)' : '2px solid transparent' }}
            >
              {renderPreviewColumn(rightBranch, baseId === rightBranch?.id)}
            </div>

          </div>

        </div>

        {/* Merge Instructions */}
        <div className="px-6 py-4 flex-shrink-0 border-b border-line">
          <textarea
            className="w-full resize-none bg-surface-2 border border-line rounded-lg px-4 py-3 text-base text-ink-primary placeholder:text-ink-muted outline-none focus:border-ink-muted transition-colors leading-relaxed"
            placeholder="E.g., Keep the Base's layout and navigation, but bring in the new hero section and color scheme from the other version."
            value={mergeInstructions}
            onChange={(e) => setMergeInstructions(e.target.value)}
            rows={4}
            style={{ fontFamily: 'inherit' }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-3 flex-shrink-0">
          {mergeErrMsg && (
            <p className="flex-1 text-xs text-red-400">{mergeErrMsg}</p>
          )}
          <button
            onClick={closeModal}
            className="px-5 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink-primary hover:bg-surface-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleFlatMerge}
            disabled={!baseBranch || !contributorBranch || merging}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#ffffff', color: '#0D0D12' }}
          >
            {merging ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Merging…
              </>
            ) : (
              <>
                <Merge size={13} />
                Merge
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
// ── Sub-components ─────────────────────────────────────────────────────────────

function BlendBranchCard({
  branch,
  selected,
  role,
  onClick,
}: {
  branch: Branch;
  selected: boolean;
  role: 'base' | 'contributor' | null;
  onClick: () => void;
}) {
  const latestCode =
    branch.checkpoints.at(-1)?.files?.find((f) => f.path === 'index.html')?.content ??
    branch.checkpoints.at(-1)?.codeSnapshot ?? '';

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left rounded-2xl border overflow-hidden transition-all',
        selected
          ? 'border-accent-violet ring-1 ring-accent-violet/40'
          : role === 'contributor'
          ? 'border-line/60 ring-1 ring-line/30'
          : 'border-line hover:border-line-accent'
      )}
    >
      <div className="relative h-36 overflow-hidden bg-white">
        {latestCode ? (
          <iframe
            srcDoc={latestCode}
            className="absolute top-0 left-0 border-none pointer-events-none"
            style={{ width: '1400px', height: '900px', transformOrigin: 'top left', transform: 'scale(0.30)' }}
            sandbox="allow-scripts"
            title={branch.name}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-2">
            <span className="text-xs text-ink-muted">No preview yet</span>
          </div>
        )}
        {role && (
          <div
            className={clsx(
              'absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
              role === 'base'
                ? 'bg-accent-violet text-white'
                : 'bg-black/50 text-white/80'
            )}
          >
            {role === 'base' ? 'Base' : 'Contributor'}
          </div>
        )}
        {selected && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent-violet flex items-center justify-center">
            <Check size={10} className="text-white" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-2">
        <span className="text-xs font-medium text-ink-primary truncate flex-1">{toDisplayName(branch.name)}</span>
        {branch.description && (
          <span className="text-[10px] text-ink-muted truncate max-w-[80px]">{branch.description}</span>
        )}
      </div>
    </button>
  );
}

function SourcePreviewWithOverlay({
  branch,
  features,
  selectedIds,
  onToggle,
}: {
  branch: Branch;
  features: BlueprintFeature[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const latestCode =
    branch.checkpoints.at(-1)?.files?.find((f) => f.path === 'index.html')?.content ??
    branch.checkpoints.at(-1)?.codeSnapshot ?? '';

  return (
    <div className="relative rounded-2xl overflow-hidden border border-line bg-white" style={{ height: 380 }}>
      {latestCode ? (
        <>
          <iframe
            srcDoc={latestCode}
            className="absolute top-0 left-0 border-none pointer-events-none"
            style={{ width: '1200px', height: '900px', transformOrigin: 'top left', transform: 'scale(0.50)', transformBox: 'fill-box' }}
            sandbox="allow-scripts"
            title={branch.name}
          />
          <div className="absolute inset-0">
            <FeatureOverlay features={features} selectedIds={selectedIds} onToggle={onToggle} />
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs text-ink-muted">No preview yet</span>
        </div>
      )}
    </div>
  );
}

function TargetThumbnail({ branch }: { branch: Branch }) {
  const latestCode =
    branch.checkpoints.at(-1)?.files?.find((f) => f.path === 'index.html')?.content ??
    branch.checkpoints.at(-1)?.codeSnapshot ?? '';

  return (
    <div className="relative h-32 rounded-xl overflow-hidden border border-line bg-white">
      {latestCode ? (
        <iframe
          srcDoc={latestCode}
          className="absolute top-0 left-0 border-none pointer-events-none"
          style={{ width: '800px', height: '600px', transformOrigin: 'top left', transform: 'scale(0.20)' }}
          sandbox="allow-scripts"
          title={branch.name}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-surface-2">
          <span className="text-xs text-ink-muted">No preview</span>
        </div>
      )}
    </div>
  );
}
