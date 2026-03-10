import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Merge, GitBranch, Check, ChevronRight, Loader2, CheckCircle2, ArrowRight, Layers, AlertCircle, RotateCcw } from 'lucide-react';
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
  const contextSourceId = modalContext?.sourceId as string | undefined;
  const contextTargetId = modalContext?.targetId as string | undefined;
  const [sourceId, setSourceId] = useState(contextSourceId ?? '');
  const [targetId, setTargetId] = useState(contextTargetId ?? '');

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

  const open =
    variant === 'merge'
      ? activeModal === 'merge'
      : variant === 'newDraft'
      ? activeModal === 'newDraft'
      : activeModal === 'newBranch';

  const branches = project?.branches ?? [];
  const activeBranches = branches.filter((b) => b.status === 'active' || b.status === 'merging');

  const sourceBranch = branches.find((b) => b.id === sourceId);
  const targetBranch = branches.find((b) => b.id === targetId);

  // Sync when modal opens
  useEffect(() => {
    if (activeModal === 'merge') {
      const src = contextSourceId ?? '';
      const tgt = contextTargetId ?? '';
      setSourceId(src);
      setTargetId(tgt);
      setStep(src && tgt ? 'features' : 'select');
      setSelectedFeatureIds(new Set());
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
    if (step !== 'qa' || !sourceBranch || !targetBranch) return;
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
        sourceFiles: getFiles(sourceBranch),
        targetFiles: getFiles(targetBranch),
        sourceBlueprint: sourceBranch.blueprint ?? null,
        targetBlueprint: targetBranch.blueprint ?? null,
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
  }, [step, sourceBranch?.id, targetBranch?.id, Array.from(selectedFeatureIds).sort().join(',')]);

  // Toggle branch selection (picker mode)
  const handleBranchClick = (id: string) => {
    if (sourceId === id) {
      setSourceId(targetId);
      setTargetId('');
    } else if (targetId === id) {
      setTargetId('');
    } else if (!sourceId) {
      setSourceId(id);
    } else if (!targetId) {
      setTargetId(id);
    }
  };

  const sourceFeatures: BlueprintFeature[] = sourceBranch?.blueprint?.features ?? [];

  const toggleFeature = (id: string) => {
    setSelectedFeatureIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addProgress = (line: string) => setProgressLines((p) => [...p, line]);

  const handleExecuteMerge = async () => {
    if (!sourceBranch || !targetBranch) return;
    setStep('executing');
    setProgressLines([]);
    setMergeError(null);

    const getFiles = (branch: Branch): ProjectFile[] =>
      branch.checkpoints.at(-1)?.files ??
      [{ path: 'index.html', content: branch.checkpoints.at(-1)?.codeSnapshot ?? '', language: 'html' }];

    let mergedFiles: ProjectFile[] = getFiles(targetBranch);

    await executeMerge(
      {
        sourceFiles: getFiles(sourceBranch),
        targetFiles: getFiles(targetBranch),
        plan: scoutPlan,
        answers: questionAnswers,
        selectedFeatureIds: Array.from(selectedFeatureIds),
        sourceBlueprint: sourceBranch.blueprint ?? null,
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
    const mergedName = `Merge: ${toDisplayName(sourceBranch.name)} → ${toDisplayName(targetBranch.name)}`;
    const child = createBranch(targetBranch.id, mergedName, '');
    updateBranch(child.id, {
      mergeParentIds: [sourceBranch.id],
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
        parentBranchName: targetBranch.name,
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
      <Modal open={open} onClose={closeModal} title="New draft" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-ink-muted leading-relaxed">
            Start a completely fresh draft — not branched from anything.
          </p>
          <div>
            <label className="text-xs text-ink-muted mb-1.5 block">Draft name</label>
            <input
              className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent-violet"
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
              className="flex-1"
              icon={<GitBranch size={14} />}
            >
              Create draft
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── New Branch variant ───────────────────────────────────────────────────────

  if (variant === 'newBranch') {
    return (
      <Modal open={open} onClose={closeModal} title="New version" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-ink-muted mb-1.5 block">Based on</label>
            <select
              className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent-violet"
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
              className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent-violet"
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

  const stepTitles: MergeStep[] = ['select', 'features', 'qa'];
  const currentStepIdx = STEP_INDEX[step];
  const modalSize = step === 'features' ? '3xl' : step === 'executing' || step === 'done' ? 'md' : '2xl';

  return (
    <Modal
      open={open}
      onClose={step === 'executing' ? () => {} : closeModal}
      title={STEP_TITLE[step]}
      size={modalSize}
    >
      <div className="space-y-5">

        {/* Progress breadcrumb (only during setup steps) */}
        {(step === 'select' || step === 'features' || step === 'qa') && (
          <div className="flex items-center gap-1.5 text-[11px]">
            {stepTitles.map((s, i) => {
              const done = currentStepIdx > i;
              const active = currentStepIdx === i;
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <span
                    className={clsx(
                      'transition-colors',
                      done ? 'text-accent-violet' : active ? 'text-ink-primary font-medium' : 'text-ink-muted'
                    )}
                  >
                    {done ? <Check size={10} className="inline" /> : null}
                    {' '}{STEP_TITLE[s]}
                  </span>
                  {i < stepTitles.length - 1 && <ChevronRight size={10} className="text-ink-muted/50" />}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Step: select ── */}
        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-xs text-ink-muted">
              Pick a <span className="text-accent-violet font-medium">source</span> (features to bring in) and a{' '}
              <span className="text-ink-secondary font-medium">target</span> (base to merge into).
            </p>
            <div className="grid grid-cols-2 gap-3">
              {activeBranches.map((b) => {
                const isSource = sourceId === b.id;
                const isTarget = targetId === b.id;
                const bothPicked = !!(sourceId && targetId);
                const role: 'source' | 'target' | null = isSource ? 'source' : isTarget ? 'target' : null;
                return (
                  <BlendBranchCard
                    key={b.id}
                    branch={b}
                    selected={isSource || isTarget}
                    disabled={bothPicked && !isSource && !isTarget}
                    role={role}
                    onClick={() => handleBranchClick(b.id)}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-1">
              <Button variant="ghost" onClick={closeModal}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => setStep('features')}
                disabled={!sourceId || !targetId}
                icon={<ArrowRight size={14} />}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: features ── */}
        {step === 'features' && sourceBranch && targetBranch && (
          <div className="space-y-4">
            <p className="text-xs text-ink-muted">
              Select which features from{' '}
              <span className="text-accent-violet font-medium">{toDisplayName(sourceBranch.name)}</span>{' '}
              to merge into{' '}
              <span className="text-ink-secondary font-medium">{toDisplayName(targetBranch.name)}</span>.
            </p>

            <div className="flex gap-4 min-h-[420px]">
              {/* Left: source preview + overlay */}
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <p className="text-[11px] font-medium text-ink-muted uppercase tracking-wide">
                  Source — {toDisplayName(sourceBranch.name)}
                </p>
                <SourcePreviewWithOverlay
                  branch={sourceBranch}
                  features={sourceFeatures}
                  selectedIds={selectedFeatureIds}
                  onToggle={toggleFeature}
                />
              </div>

              {/* Right: feature checklist + target thumbnail */}
              <div className="w-64 flex-shrink-0 flex flex-col gap-4">
                {/* Feature checklist */}
                <div className="flex-1 flex flex-col gap-2">
                  <p className="text-[11px] font-medium text-ink-muted uppercase tracking-wide">Features to import</p>
                  {sourceFeatures.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line py-8 px-4 text-center">
                      <Layers size={18} className="text-ink-muted/50" />
                      <p className="text-xs text-ink-muted">No blueprint yet. Generate one in the IDE to unlock feature selection.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[300px] pr-1">
                      {sourceFeatures.map((f) => {
                        const checked = selectedFeatureIds.has(f.id);
                        return (
                          <button
                            key={f.id}
                            onClick={() => toggleFeature(f.id)}
                            className={clsx(
                              'flex items-start gap-2.5 text-left px-3 py-2.5 rounded-xl border transition-all',
                              checked
                                ? 'border-accent-violet/60 bg-accent-violet/8'
                                : 'border-line hover:border-line-accent'
                            )}
                          >
                            <div
                              className={clsx(
                                'mt-0.5 w-3.5 h-3.5 rounded flex-shrink-0 border flex items-center justify-center transition-all',
                                checked ? 'bg-accent-violet border-accent-violet' : 'border-line'
                              )}
                            >
                              {checked && <Check size={8} className="text-white" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-ink-primary leading-snug">{f.name}</p>
                              <p className="text-[10px] text-ink-muted mt-0.5 leading-relaxed line-clamp-2">{f.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Target preview */}
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-medium text-ink-muted uppercase tracking-wide">
                    Target — {toDisplayName(targetBranch.name)}
                  </p>
                  <TargetThumbnail branch={targetBranch} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button variant="ghost" onClick={() => setStep('select')}>Back</Button>
              <Button
                variant="primary"
                onClick={() => setStep('qa')}
                icon={<ArrowRight size={14} />}
              >
                Review
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: qa ── */}
        {step === 'qa' && sourceBranch && targetBranch && (
          <div className="space-y-4">
            {/* Merge summary card */}
            <div className="rounded-2xl border border-line bg-surface-2 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-accent-violet/15 flex items-center justify-center flex-shrink-0">
                  <Merge size={14} className="text-accent-violet" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-primary">
                    {toDisplayName(sourceBranch.name)}{' '}
                    <span className="text-ink-muted font-normal">→</span>{' '}
                    {toDisplayName(targetBranch.name)}
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {selectedFeatureIds.size > 0
                      ? `${selectedFeatureIds.size} feature${selectedFeatureIds.size !== 1 ? 's' : ''} selected`
                      : 'Full merge — all features'}
                  </p>
                </div>
              </div>
              {selectedFeatureIds.size > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {sourceFeatures
                    .filter((f) => selectedFeatureIds.has(f.id))
                    .map((f) => (
                      <span key={f.id} className="px-2 py-0.5 rounded-full bg-accent-violet/15 text-accent-violet text-[11px] font-medium">
                        {f.name}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Scout loading */}
            {scoutLoading && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface-2 border border-line">
                <Loader2 size={13} className="animate-spin text-ink-muted flex-shrink-0" />
                <p className="text-xs text-ink-muted">Scout analyzing prototypes…</p>
              </div>
            )}

            {/* Scout results */}
            {scoutDone && (
              <div className="space-y-3">
                {/* Summary from scout */}
                {scoutSummary && (
                  <p className="text-xs text-ink-secondary leading-relaxed">{scoutSummary}</p>
                )}

                {/* Plan steps */}
                {scoutPlan.length > 0 && (
                  <div className="space-y-1.5">
                    {scoutPlan.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-ink-secondary">
                        <span className="text-accent-violet font-mono font-semibold flex-shrink-0 mt-0.5">{i + 1}.</span>
                        {step.description}
                      </div>
                    ))}
                  </div>
                )}

                {/* Conflict questions */}
                {scoutQuestions.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    <p className="text-[11px] font-medium text-ink-muted uppercase tracking-wide">Resolve conflicts</p>
                    {scoutQuestions.map((q) => (
                      <div key={q.id} className="rounded-xl border border-line bg-surface-2 p-3 space-y-2">
                        <p className="text-xs font-medium text-ink-primary">{q.question}</p>
                        <div className="flex flex-col gap-1.5">
                          {q.options.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => setQuestionAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                              className={clsx(
                                'text-left px-3 py-2 rounded-lg text-xs border transition-all',
                                questionAnswers[q.id] === opt
                                  ? 'border-accent-violet bg-accent-violet/10 text-ink-primary font-medium'
                                  : 'border-line text-ink-secondary hover:border-line-accent'
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-status-success/10 border border-status-success/25">
                    <CheckCircle2 size={14} className="text-status-success flex-shrink-0" />
                    <p className="text-xs text-status-success">No conflicts detected</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <Button variant="ghost" onClick={() => setStep('features')}>Back</Button>
              <Button
                variant="primary"
                onClick={handleExecuteMerge}
                disabled={scoutLoading || (scoutQuestions.length > 0 && scoutQuestions.some((q) => !questionAnswers[q.id]))}
                icon={<Merge size={14} />}
              >
                Merge
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: executing ── */}
        {step === 'executing' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-surface-2 p-4 min-h-[180px] max-h-[240px] overflow-y-auto font-mono text-xs text-ink-secondary space-y-1.5">
              <AnimatePresence initial={false}>
                {progressLines.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2"
                  >
                    <span className="text-ink-muted/50 select-none">›</span>
                    {line}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={progressEndRef} />
            </div>
            {mergeError ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25">
                  <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400">{mergeError}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep('qa')} className="flex-1">Back</Button>
                  <Button variant="primary" onClick={handleExecuteMerge} className="flex-1" icon={<RotateCcw size={14} />}>
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-ink-muted">
                <Loader2 size={13} className="animate-spin" />
                Working…
              </div>
            )}
          </div>
        )}

        {/* ── Step: done ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-5 py-4">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.4 }}
              className="w-14 h-14 rounded-2xl bg-accent-violet/15 flex items-center justify-center"
            >
              <CheckCircle2 size={24} className="text-accent-violet" />
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-semibold text-ink-primary">Merge complete</p>
              <p className="text-xs text-ink-muted mt-1">A new branch was created with the merged result.</p>
            </div>
            <div className="flex gap-2 w-full flex-wrap">
              {createdBranchId && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    deleteBranch(createdBranchId);
                    pushToast({ type: 'success', message: 'Merge undone' });
                    closeModal();
                  }}
                  className="flex-1"
                  icon={<RotateCcw size={14} />}
                >
                  Undo
                </Button>
              )}
              <Button variant="ghost" onClick={closeModal} className="flex-1">Close</Button>
              {createdBranchId && (
                <Button
                  variant="primary"
                  onClick={() => {
                    closeModal();
                    navigate(`/branch/${createdBranchId}`);
                  }}
                  className="flex-1"
                  icon={<ArrowRight size={14} />}
                >
                  View branch
                </Button>
              )}
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function BlendBranchCard({
  branch,
  selected,
  disabled,
  role,
  onClick,
}: {
  branch: Branch;
  selected: boolean;
  disabled: boolean;
  role: 'source' | 'target' | null;
  onClick: () => void;
}) {
  const latestCode =
    branch.checkpoints.at(-1)?.files?.find((f) => f.path === 'index.html')?.content ??
    branch.checkpoints.at(-1)?.codeSnapshot ?? '';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'w-full text-left rounded-2xl border overflow-hidden transition-all',
        selected
          ? 'border-accent-violet ring-1 ring-accent-violet/40'
          : disabled
          ? 'border-line opacity-40 cursor-not-allowed'
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
              role === 'source'
                ? 'bg-accent-violet text-white'
                : 'bg-black/60 text-white/90'
            )}
          >
            {role}
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
    <div className="relative flex-1 rounded-2xl overflow-hidden border border-line bg-white" style={{ minHeight: 360 }}>
      {latestCode ? (
        <>
          <iframe
            srcDoc={latestCode}
            className="absolute top-0 left-0 border-none pointer-events-none"
            style={{ width: '1200px', height: '900px', transformOrigin: 'top left', transform: 'scale(0.37)', transformBox: 'fill-box' }}
            sandbox="allow-scripts"
            title={branch.name}
          />
          <div className="absolute inset-0" style={{ height: `${(900 * 0.37)}px` }}>
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
