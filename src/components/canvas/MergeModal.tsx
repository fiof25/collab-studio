import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Merge, GitBranch, Check, ChevronRight, ChevronLeft, Loader2, CheckCircle2, ArrowRight, AlertCircle, RotateCcw, Plus, X, Zap, MessageSquare, ListChecks } from 'lucide-react';
import { clsx } from 'clsx';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { FeatureOverlay } from './FeatureOverlay';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';
import { toDisplayName } from '@/utils/branchUtils';
import { useMergeStream, type ConflictQuestion } from '@/hooks/useMergeStream';
import type { Branch, ProjectFile } from '@/types/branch';
import type { BlueprintFeature, MergePlanStep, MergeRecord } from '@/types/blueprint';

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
  const { project, createBranch, createRootBranch, updateBranch, updateBlueprint } = useProjectStore();
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
  const [aiPrompts, setAiPrompts] = useState<string[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);

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
      setAiPrompts([]);
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

  // Fetch AI-suggested prompts when both branches are known
  useEffect(() => {
    if (!baseBranch || !contributorBranch) return;
    const controller = new AbortController();
    setPromptsLoading(true);
    const getHtml = (b: typeof baseBranch) =>
      b?.checkpoints.at(-1)?.files?.find(f => f.path === 'index.html')?.content
      ?? b?.checkpoints.at(-1)?.codeSnapshot
      ?? '';
    fetch('/api/merge/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseName: toDisplayName(baseBranch.name),
        contributorName: toDisplayName(contributorBranch.name),
        baseBlueprint: baseBranch.blueprint ?? null,
        contributorBlueprint: contributorBranch.blueprint ?? null,
        baseHtml: getHtml(baseBranch),
        contributorHtml: getHtml(contributorBranch),
      }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => { setAiPrompts(data.prompts ?? []); })
      .catch(() => {})
      .finally(() => setPromptsLoading(false));
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseBranch?.id, contributorBranch?.id]);

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

    // Build merge record for audit trail
    const mergeRecord: MergeRecord = {
      sourceId: contributorBranch.id,
      sourceName: toDisplayName(contributorBranch.name),
      targetId: baseBranch.id,
      targetName: toDisplayName(baseBranch.name),
      featuresMigrated: Array.from(selectedFeatureIds),
      mergePlan: scoutPlan,
      conflictsResolved: scoutQuestions
        .filter((q) => questionAnswers[q.id])
        .map((q) => `${q.question} → ${questionAnswers[q.id]}`),
      timestamp: Date.now(),
    };

    // Fire-and-forget blueprint + snapshot agents (include merge history)
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
      .then((data) => {
        if (data.success) {
          const blueprint = { ...data.blueprint, mergeHistory: [mergeRecord, ...(data.blueprint.mergeHistory ?? [])] };
          updateBlueprint(child.id, blueprint);
        }
      })
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

      // Build merge record for audit trail (quick merge — no scout plan)
      const mergeRecord: MergeRecord = {
        sourceId: contributorBranch.id,
        sourceName: toDisplayName(contributorBranch.name),
        targetId: baseBranch.id,
        targetName: toDisplayName(baseBranch.name),
        featuresMigrated: Array.from(selectedFeatureIds),
        mergePlan: [],
        conflictsResolved: [],
        timestamp: Date.now(),
      };

      // Fire-and-forget blueprint generation with merge history
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
        .then((data) => {
          if (data.success) {
            const blueprint = { ...data.blueprint, mergeHistory: [mergeRecord, ...(data.blueprint.mergeHistory ?? [])] };
            updateBlueprint(child.id, blueprint);
          }
        })
        .catch(() => {});

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
        const branch = createRootBranch(newName.trim(), '');
        pushToast({ type: 'success', message: `"${newName.trim()}" created` });
        closeModal();
        setLoading(false);
        navigate(`/branch/${branch.id}`);
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

      </div>
    );
  };


  const canAdvanceFromSelect = !!baseBranch && !!contributorBranch;
  const baseFeatures: BlueprintFeature[] = baseBranch?.blueprint?.features ?? [];
  const allQuestionsAnswered = scoutQuestions.length === 0 || scoutQuestions.every((q) => questionAnswers[q.id]);

  const handleAnswerQuestion = (questionId: string, answer: string) => {
    setQuestionAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  return (
    <Modal open={open} onClose={step === 'executing' ? () => {} : closeModal} size="merge" bare>
      <div className="flex flex-col overflow-hidden bg-surface-1 border border-line rounded-2xl shadow-float" style={{ maxHeight: '90vh' }}>

        {/* Header with step indicator */}
        <div className="relative flex flex-col items-center px-6 pt-4 pb-3 border-b border-line flex-shrink-0">
          <div className="flex items-center justify-center w-full">
            <h2 className="text-base font-semibold text-ink-primary tracking-tight">{STEP_TITLE[step]}</h2>
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
          {/* Step dots */}
          <div className="flex items-center gap-1.5 mt-2.5">
            {(['select', 'features', 'qa', 'executing', 'done'] as MergeStep[]).map((s) => (
              <div
                key={s}
                className={clsx(
                  'h-1.5 rounded-full transition-all',
                  s === step ? 'w-6 bg-accent-violet' : STEP_INDEX[s] < STEP_INDEX[step] ? 'w-1.5 bg-accent-violet/50' : 'w-1.5 bg-line'
                )}
              />
            ))}
          </div>
        </div>

        {/* ── STEP: select ────────────────────────────────── */}
        {step === 'select' && (
          <>
            <div className="relative flex-1 min-h-0 flex flex-col">
              <div className="flex flex-1 min-h-0 border-b border-line">
                <div
                  className="flex flex-col flex-1 min-w-0 min-h-0 rounded-none transition-all"
                  style={{ border: baseId === leftBranch?.id ? '2px solid rgb(139 92 246)' : '2px solid transparent' }}
                >
                  {renderPreviewColumn(leftBranch, baseId === leftBranch?.id)}
                </div>
                <div className="w-px bg-line flex-shrink-0" />
                <div
                  className="flex flex-col flex-1 min-w-0 min-h-0 rounded-none transition-all"
                  style={{ border: baseId === rightBranch?.id ? '2px solid rgb(139 92 246)' : '2px solid transparent' }}
                >
                  {renderPreviewColumn(rightBranch, baseId === rightBranch?.id)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 px-6 py-3 flex-shrink-0">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink-primary hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                {/* Quick merge — skips features/qa */}
                <button
                  onClick={() => { setStep('features'); }}
                  disabled={!canAdvanceFromSelect}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#ffffff', color: '#0D0D12' }}
                >
                  <ChevronRight size={13} />
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP: features ──────────────────────────────── */}
        {step === 'features' && (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto border-b border-line">
              <div className="flex gap-0 min-h-0" style={{ minHeight: 400 }}>
                {/* Left: contributor preview with feature overlay */}
                <div className="flex-1 min-w-0 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-black/50 text-white/90">Contributor</span>
                    <span className="text-sm font-medium text-ink-primary truncate">{contributorBranch ? toDisplayName(contributorBranch.name) : ''}</span>
                  </div>
                  {contributorBranch && (
                    <SourcePreviewWithOverlay
                      branch={contributorBranch}
                      features={contributorFeatures}
                      selectedIds={selectedFeatureIds}
                      onToggle={toggleFeature}
                    />
                  )}
                  {contributorFeatures.length === 0 && (
                    <div className="mt-3 px-3 py-2 rounded-lg bg-surface-2 border border-line">
                      <p className="text-xs text-ink-muted">No blueprint features detected. The AI will analyze the full code during merge.</p>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="w-px bg-line flex-shrink-0" />

                {/* Right: feature checklists + instructions */}
                <div className="flex-1 min-w-0 p-4 flex flex-col gap-4">
                  {/* Contributor features checklist */}
                  {contributorFeatures.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Features to bring in</h4>
                      <div className="space-y-1.5">
                        {contributorFeatures.map((f) => (
                          <label key={f.id} className="flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-2 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedFeatureIds.has(f.id)}
                              onChange={() => toggleFeature(f.id)}
                              className="mt-0.5 accent-accent-violet"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-ink-primary">{f.name}</p>
                              {f.description && <p className="text-xs text-ink-muted mt-0.5">{f.description}</p>}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Base features (read-only, all selected) */}
                  {baseFeatures.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Base features (kept)</h4>
                      <div className="space-y-1">
                        {baseFeatures.map((f) => (
                          <div key={f.id} className="flex items-start gap-2.5 px-3 py-1.5 rounded-lg opacity-60">
                            <Check size={14} className="text-accent-violet mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-ink-primary">{f.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Merge instructions */}
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Instructions (optional)</h4>
                    {(aiPrompts.length > 0 || promptsLoading) && (
                      <div className="mb-2 flex items-center gap-1.5">
                        {promptsLoading ? (
                          <div className="flex items-center gap-1.5">
                            <Loader2 size={11} className="animate-spin text-ink-muted" />
                            <span className="text-xs text-ink-muted">Generating suggestions…</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 [&::-webkit-scrollbar]:hidden">
                            {aiPrompts.map((prompt, i) => (
                              <button
                                key={i}
                                onClick={() => setMergeInstructions((prev) => prev ? `${prev} ${prompt}` : prompt)}
                                className="flex-shrink-0 px-2.5 py-1 rounded-full border border-line bg-surface-2 hover:bg-surface-3 text-[11px] text-ink-secondary transition-colors whitespace-nowrap"
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <textarea
                      className="w-full resize-none bg-surface-2 border border-line rounded-lg px-3 py-2.5 text-sm text-ink-primary placeholder:text-ink-muted outline-none focus:border-ink-muted transition-colors leading-relaxed"
                      placeholder="E.g., Keep the Base's layout but bring in the new hero section…"
                      value={mergeInstructions}
                      onChange={(e) => setMergeInstructions(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-3 flex-shrink-0">
              <button
                onClick={() => setStep('select')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink-primary hover:bg-surface-2 transition-colors"
              >
                <ChevronLeft size={13} />
                Back
              </button>
              <div className="flex items-center gap-2">
                {/* Quick merge — skip scout */}
                <button
                  onClick={handleFlatMerge}
                  disabled={merging}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink-primary hover:bg-surface-2 transition-colors disabled:opacity-40"
                >
                  <Zap size={13} />
                  {merging ? 'Merging…' : 'Quick Merge'}
                </button>
                {/* Full flow — advance to scout/qa */}
                <button
                  onClick={() => setStep('qa')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
                  style={{ background: '#ffffff', color: '#0D0D12' }}
                >
                  <MessageSquare size={13} />
                  Analyze & Review
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP: qa (scout analysis + questions + plan review) ── */}
        {step === 'qa' && (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto border-b border-line px-6 py-5" style={{ minHeight: 300 }}>
              {/* Scout loading */}
              {scoutLoading && (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <Loader2 size={28} className="animate-spin" style={{ color: 'rgb(139 92 246)' }} />
                  <p className="text-sm font-medium text-ink-primary">Analyzing both versions…</p>
                  <p className="text-xs text-ink-muted">The Scout agent is comparing code and blueprints</p>
                </div>
              )}

              {/* Scout results */}
              {scoutDone && (
                <div className="space-y-5">
                  {/* Summary */}
                  {scoutSummary && (
                    <div>
                      <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">Analysis Summary</h4>
                      <div className="px-4 py-3 rounded-xl bg-surface-2 border border-line">
                        <p className="text-sm text-ink-primary leading-relaxed">{scoutSummary}</p>
                      </div>
                    </div>
                  )}

                  {/* Questions */}
                  {scoutQuestions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
                        <MessageSquare size={12} className="inline mr-1.5 -mt-0.5" />
                        Resolve conflicts ({Object.keys(questionAnswers).length}/{scoutQuestions.length})
                      </h4>
                      <div className="space-y-3">
                        {scoutQuestions.map((q) => (
                          <div key={q.id} className="px-4 py-3 rounded-xl bg-surface-2 border border-line">
                            <p className="text-sm font-medium text-ink-primary mb-2">{q.question}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {q.options.map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => handleAnswerQuestion(q.id, opt)}
                                  className={clsx(
                                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                    questionAnswers[q.id] === opt
                                      ? 'bg-accent-violet text-white'
                                      : 'bg-surface-3 text-ink-secondary hover:bg-surface-3/80 border border-line'
                                  )}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Merge plan */}
                  {scoutPlan.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
                        <ListChecks size={12} className="inline mr-1.5 -mt-0.5" />
                        Merge Plan ({scoutPlan.length} steps)
                      </h4>
                      <div className="rounded-xl bg-surface-2 border border-line divide-y divide-line">
                        {scoutPlan.map((planStep, i) => (
                          <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                            <span className={clsx(
                              'flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase',
                              planStep.action === 'create' ? 'bg-emerald-500/15 text-emerald-400' :
                              planStep.action === 'modify' ? 'bg-amber-500/15 text-amber-400' :
                              planStep.action === 'copy' ? 'bg-cyan-500/15 text-cyan-400' :
                              'bg-red-500/15 text-red-400'
                            )}>
                              {planStep.action}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-mono text-ink-secondary">{planStep.file}</p>
                              <p className="text-xs text-ink-muted mt-0.5">{planStep.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No questions / empty plan fallback */}
                  {scoutQuestions.length === 0 && scoutPlan.length === 0 && !scoutSummary && (
                    <div className="flex flex-col items-center justify-center gap-2 py-8">
                      <CheckCircle2 size={24} className="text-emerald-400" />
                      <p className="text-sm text-ink-primary font-medium">No conflicts detected</p>
                      <p className="text-xs text-ink-muted">The merge looks straightforward. Ready to proceed.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-3 flex-shrink-0">
              <button
                onClick={() => setStep('features')}
                disabled={scoutLoading}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink-primary hover:bg-surface-2 transition-colors disabled:opacity-40"
              >
                <ChevronLeft size={13} />
                Back
              </button>
              <div className="flex items-center gap-2">
                {mergeError && <p className="text-xs text-red-400">{mergeError}</p>}
                <button
                  onClick={handleExecuteMerge}
                  disabled={scoutLoading || (scoutQuestions.length > 0 && !allQuestionsAnswered)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#ffffff', color: '#0D0D12' }}
                >
                  <Merge size={13} />
                  Merge
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── STEP: executing ─────────────────────────────── */}
        {step === 'executing' && (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto border-b border-line px-6 py-5" style={{ minHeight: 250 }}>
              <div className="space-y-1.5">
                {progressLines.map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {i === progressLines.length - 1 && !line.startsWith('Done') && !line.startsWith('Error') ? (
                      <Loader2 size={12} className="animate-spin text-accent-violet mt-0.5 flex-shrink-0" />
                    ) : line.startsWith('Error') ? (
                      <AlertCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    )}
                    <p className={clsx('text-sm', line.startsWith('Error') ? 'text-red-400' : 'text-ink-primary')}>{line}</p>
                  </div>
                ))}
                <div ref={progressEndRef} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-3 flex-shrink-0">
              {mergeError && (
                <button
                  onClick={() => setStep('qa')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink-primary hover:bg-surface-2 transition-colors"
                >
                  <RotateCcw size={13} />
                  Retry
                </button>
              )}
            </div>
          </>
        )}

        {/* ── STEP: done ──────────────────────────────────── */}
        {step === 'done' && (
          <>
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 py-12 border-b border-line">
              <CheckCircle2 size={40} className="text-emerald-400" />
              <p className="text-lg font-semibold text-ink-primary">Merge complete</p>
              <p className="text-sm text-ink-muted">Your new branch has been created</p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-3 flex-shrink-0">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink-primary hover:bg-surface-2 transition-colors"
              >
                Close
              </button>
              {createdBranchId && (
                <button
                  onClick={() => { closeModal(); navigate(`/branch/${createdBranchId}`); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: '#ffffff', color: '#0D0D12' }}
                >
                  <ArrowRight size={13} />
                  Open Branch
                </button>
              )}
            </div>
          </>
        )}

      </div>
    </Modal>
  );
}
// ── Sub-components ─────────────────────────────────────────────────────────────

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

