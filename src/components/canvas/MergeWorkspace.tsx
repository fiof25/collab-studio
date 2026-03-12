import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Merge, Loader2, Sparkles, ArrowUp } from 'lucide-react';
import { clsx } from 'clsx';
import { nanoid } from 'nanoid';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';
import { toDisplayName } from '@/utils/branchUtils';
import { useMergeStream } from '@/hooks/useMergeStream';
import type { Branch, ProjectFile } from '@/types/branch';

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

/** Renders an iframe scaled to fill its container, using renderWidth as the virtual desktop width. */
function ScaledIframe({ srcDoc, title, scrollable = false, renderWidth = 1400 }: { srcDoc: string; title: string; scrollable?: boolean; renderWidth?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setScale(w / renderWidth);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [renderWidth]);
  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white">
      <iframe
        srcDoc={srcDoc}
        title={title}
        className="absolute top-0 left-0 border-none"
        style={{
          width: `${renderWidth}px`,
          height: `${Math.round(100 / scale)}%`,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          pointerEvents: scrollable ? 'auto' : 'none',
        }}
        sandbox={scrollable ? 'allow-scripts allow-same-origin' : 'allow-scripts'}
      />
    </div>
  );
}

function getSemanticArea(yPercent: number): string {
  if (yPercent < 12) return 'the navigation bar';
  if (yPercent < 35) return 'the hero section';
  if (yPercent < 58) return 'the features section';
  if (yPercent < 78) return 'the content section';
  return 'the footer';
}

function getFiles(branch: Branch): ProjectFile[] {
  return (
    branch.checkpoints.at(-1)?.files ?? [
      {
        path: 'index.html',
        content: branch.checkpoints.at(-1)?.codeSnapshot ?? '',
        language: 'html',
      },
    ]
  );
}

function getCode(branch: Branch | undefined): string {
  return (
    branch?.checkpoints.at(-1)?.files?.find((f) => f.path === 'index.html')?.content ??
    branch?.checkpoints.at(-1)?.codeSnapshot ??
    ''
  );
}

export function MergeWorkspace() {
  const navigate = useNavigate();
  const { activeModal, closeModal, modalContext } = useUIStore();
  const { project, createBranch, updateBranch, updateBlueprint } = useProjectStore();
  const pushToast = useUIStore((s) => s.pushToast);
  const { executeMerge } = useMergeStream();

  const open = activeModal === 'merge';

  const contextSourceId = modalContext?.sourceId as string | undefined;
  const contextTargetId = modalContext?.targetId as string | undefined;
  const contextBranchIds =
    (modalContext?.branchIds as string[] | undefined) ??
    (contextSourceId && contextTargetId ? [contextSourceId, contextTargetId] : undefined);

  const branches = project?.branches ?? [];
  const pickableBranches = contextBranchIds
    ? branches.filter((b) => contextBranchIds.includes(b.id))
    : branches.filter((b) => b.status === 'active' || b.status === 'merging');

  const leftBranch = pickableBranches[0];
  const rightBranch = pickableBranches[1];

  const [activeVersion, setActiveVersion] = useState<'left' | 'right'>('left');
  const [baseId, setBaseId] = useState<string>('');

  // Chat state
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [aiPrompts, setAiPrompts] = useState<string[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Merge execution
  const [merging, setMerging] = useState(false);
  const [mergeErrMsg, setMergeErrMsg] = useState<string | null>(null);
  const [createdBranchId, setCreatedBranchId] = useState<string | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setActiveVersion('left');
      setBaseId(contextTargetId ?? contextBranchIds?.[0] ?? leftBranch?.id ?? '');
      setMessages([]);
      setInputValue('');
      setMerging(false);
      setMergeErrMsg(null);
      setCreatedBranchId(null);
      setAiPrompts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fetch AI prompt suggestions when both branches are known
  useEffect(() => {
    if (!open || !leftBranch || !rightBranch) return;
    const controller = new AbortController();
    setPromptsLoading(true);
    fetch('/api/merge/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseName: toDisplayName(leftBranch.name),
        contributorName: toDisplayName(rightBranch.name),
        baseBlueprint: leftBranch.blueprint ?? null,
        contributorBlueprint: rightBranch.blueprint ?? null,
        baseHtml: getCode(leftBranch),
        contributorHtml: getCode(rightBranch),
      }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setAiPrompts(data.prompts ?? []))
      .catch(() => {})
      .finally(() => setPromptsLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leftBranch?.id, rightBranch?.id]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [...prev, { id: nanoid(6), role, content }]);
  };

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || merging) return;
    addMessage('user', trimmed);
    setInputValue('');
  };

  const handleClickOverlay = (e: React.MouseEvent<HTMLDivElement>, branchName: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    const area = getSemanticArea(yPercent);
    setInputValue((prev) => (prev ? `${prev} [${area} of "${branchName}"] ` : `[${area} of "${branchName}"] `));
    inputRef.current?.focus();
  };

  const handleMerge = async () => {
    if (!leftBranch || !rightBranch || merging) return;

    const baseBranch = branches.find((b) => b.id === baseId) ?? leftBranch;
    const contributorBranch = baseBranch.id === leftBranch.id ? rightBranch : leftBranch;

    const instructions = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('\n');

    setMerging(true);
    setMergeErrMsg(null);

    let mergedFiles: ProjectFile[] = getFiles(baseBranch);
    let errorMsg: string | null = null;

    await executeMerge(
      {
        sourceFiles: getFiles(contributorBranch),
        targetFiles: getFiles(baseBranch),
        plan: [],
        answers: {},
        selectedFeatureIds: [],
        sourceBlueprint: contributorBranch.blueprint ?? null,
        instructions: instructions || undefined,
      },
      (event) => {
        if (event.type === 'done') mergedFiles = event.mergedFiles;
        if (event.type === 'error') errorMsg = event.error;
      }
    ).catch((err: Error) => {
      errorMsg = err.message;
    });

    if (!errorMsg) {
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
      addMessage('assistant', `Merge complete ✓ Created "${mergedName}".`);

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
          if (data.success) updateBlueprint(child.id, data.blueprint);
        })
        .catch(() => {});
    } else {
      setMergeErrMsg(errorMsg);
      addMessage('assistant', `Merge failed: ${errorMsg}`);
    }

    setMerging(false);
  };

  if (!open) return null;

  const activeBranch = activeVersion === 'left' ? leftBranch : rightBranch;
  const peekBranch = activeVersion === 'left' ? rightBranch : leftBranch;
  const activeCode = getCode(activeBranch);
  const peekCode = getCode(peekBranch);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-0">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-line flex-shrink-0 bg-surface-1">
        <button
          onClick={closeModal}
          className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-primary transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>

        <span className="flex-1 text-center text-sm font-medium text-ink-muted">Merge Mode</span>

        <button
          onClick={handleMerge}
          disabled={!leftBranch || !rightBranch || merging || !!createdBranchId}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white text-surface-0 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex-shrink-0"
        >
          {merging ? <Loader2 size={12} className="animate-spin" /> : <Merge size={12} />}
          {merging ? 'Merging…' : createdBranchId ? 'Merged ✓' : 'Merge'}
        </button>

        {createdBranchId && (
          <button
            onClick={() => { closeModal(); navigate(`/branch/${createdBranchId}`); }}
            className="px-3 py-1.5 rounded-lg border border-violet-500/30 text-violet-400 text-xs font-medium hover:bg-violet-500/10 transition-colors flex-shrink-0"
          >
            Open result →
          </button>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left chat sidebar */}
        <div className="w-[28%] flex-shrink-0 flex flex-col border-r border-line bg-surface-1">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-5">
                <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center">
                  <Sparkles size={18} className="text-ink-muted" />
                </div>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  What should the merge keep from each version?
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={clsx(
                    'text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'text-ink-primary bg-surface-2 rounded-xl px-3 py-2'
                      : 'text-ink-secondary px-1 py-0.5'
                  )}
                >
                  {msg.content}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* AI prompt chips */}
          {(aiPrompts.length > 0 || promptsLoading) && (
            <div className="px-3 py-3 border-t border-line">
              {promptsLoading ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin text-ink-muted" />
                  <span className="text-xs text-ink-muted">Loading suggestions…</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {aiPrompts.slice(0, 4).map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setInputValue((prev) => (prev ? `${prev} ${p}` : p))}
                      className="px-3 py-2 rounded-lg border border-line bg-surface-2 hover:bg-surface-3 text-xs text-ink-secondary hover:text-ink-primary transition-colors text-left line-clamp-2 leading-snug"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat input */}
          <div className="p-3 border-t border-line">
            {mergeErrMsg && (
              <p className="text-xs text-red-400 mb-2">{mergeErrMsg}</p>
            )}
            <div className="flex gap-2 items-end rounded-xl border border-line bg-surface-2 focus-within:border-white/20 px-3 py-2.5 transition-colors">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Describe what to merge…"
                rows={2}
                disabled={merging}
                className="flex-1 resize-none bg-transparent text-sm text-ink-primary placeholder:text-ink-muted outline-none leading-snug disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || merging}
                className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 mb-0.5',
                  inputValue.trim() && !merging
                    ? 'bg-white text-surface-0'
                    : 'bg-surface-3 text-ink-muted cursor-not-allowed'
                )}
              >
                <ArrowUp size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Preview area ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 relative bg-surface-0 overflow-hidden">

          {/* Merging overlay */}
          {merging && (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3"
              style={{ background: 'rgba(13,13,18,0.85)', backdropFilter: 'blur(6px)' }}
            >
              <Loader2 size={32} className="animate-spin text-violet-400" />
              <p className="text-sm font-semibold text-ink-primary">Merging versions…</p>
              <p className="text-xs text-ink-muted">This may take a moment</p>
            </div>
          )}

          <div className="absolute inset-0 bg-surface-0">

            {/* Peek card — top-right, partially behind main preview */}
            {peekBranch && (
              <button
                onClick={() => setActiveVersion((v) => (v === 'left' ? 'right' : 'left'))}
                className="absolute z-10 overflow-hidden border border-white/10 hover:border-violet-400/40 shadow-2xl transition-all group"
                style={{ right: '5%', top: '5%', width: '32%', height: '30%' }}
                title={`Switch to ${activeVersion === 'left' ? 'Version 2' : 'Version 1'}`}
              >
                {peekCode ? (
                  <>
                    <iframe
                      srcDoc={peekCode}
                      className="absolute top-0 left-0 border-none pointer-events-none bg-white"
                      style={{ width: '1400px', height: '900px', transformOrigin: 'top left', transform: 'scale(0.293)' }}
                      sandbox="allow-scripts"
                      title="peek-preview"
                    />
                    <div className="absolute inset-0 bg-black/50 group-hover:bg-black/25 transition-colors flex items-end justify-start p-2.5">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-[11px] font-semibold bg-black/60 px-2.5 py-1 rounded-full">
                        Switch to {activeVersion === 'left' ? 'Version 2' : 'Version 1'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-surface-2" />
                )}
              </button>
            )}

            {/* Version label + base button — above the main preview */}
            <div
              className="absolute z-20 flex items-center gap-4"
              style={{ left: '4%', top: '6%' }}
            >
              <span className="text-xl font-semibold" style={{ color: '#BABAE4' }}>
                {activeVersion === 'left' ? 'Version 1' : 'Version 2'}
              </span>
              {baseId === activeBranch?.id ? (
                <span className="inline-flex items-center px-5 py-2 rounded-full bg-violet-500 text-white text-sm font-semibold">
                  Selected as Base
                </span>
              ) : (
                <button
                  onClick={() => setBaseId(activeBranch?.id ?? '')}
                  className="inline-flex items-center px-5 py-2 rounded-full border border-white/20 text-sm text-ink-secondary hover:border-violet-400/50 hover:text-violet-300 transition-colors font-medium"
                >
                  Select as Base
                </button>
              )}
            </div>

            {/* Main preview */}
            <div
              className="absolute z-20 overflow-hidden border border-white/10 shadow-2xl"
              style={{ left: '4%', top: '16%', right: '4%', bottom: '4%' }}
            >
              {activeCode ? (
                <ScaledIframe srcDoc={activeCode} title="active-preview" scrollable renderWidth={1000} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface-2">
                  <span className="text-xs text-ink-muted">No preview yet</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
