import { useState, useRef, useEffect, type RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Merge, Loader2, ArrowUp, Pencil, Crosshair, X } from 'lucide-react';
import { FourPointStar } from '@/components/shared/FourPointStar';
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

interface SelectedElement {
  tag: string;
  text: string;
  branchName: string;
}

/** Renders an iframe scaled to fill its container, using renderWidth as the virtual desktop width. */
function ScaledIframe({ srcDoc, title, scrollable = false, renderWidth = 1400, iframeRef, onScaleChange }: {
  srcDoc: string;
  title: string;
  scrollable?: boolean;
  renderWidth?: number;
  iframeRef?: RefObject<HTMLIFrameElement>;
  onScaleChange?: (scale: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) {
        setScale(w / renderWidth);
        onScaleChange?.(w / renderWidth);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [renderWidth, onScaleChange]);
  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-surface-0">
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        title={title}
        className="absolute top-0 left-0 border-none"
        style={{
          width: `${renderWidth}px`,
          height: `${Math.ceil(100 / scale) + 2}%`,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          pointerEvents: scrollable ? 'auto' : 'none',
        }}
        sandbox={scrollable ? 'allow-scripts allow-same-origin' : 'allow-scripts'}
      />
    </div>
  );
}


function ElementPickerOverlay({
  iframeRef,
  scale,
  branchName,
  onSelect,
  onExit,
}: {
  iframeRef: RefObject<HTMLIFrameElement>;
  scale: number;
  branchName: string;
  onSelect: (el: SelectedElement) => void;
  onExit: () => void;
}) {
  const hoveredElRef = useRef<Element | null>(null);

  // Inject highlight style into iframe
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const style = doc.createElement('style');
    style.id = '__picker_style__';
    style.textContent = `.__ph__ { outline: 2px solid #7C3AED !important; outline-offset: 2px !important; background: rgba(124,58,237,0.1) !important; }`;
    doc.head?.appendChild(style);
    return () => {
      doc.getElementById('__picker_style__')?.remove();
      hoveredElRef.current?.classList.remove('__ph__');
      hoveredElRef.current = null;
    };
  }, [iframeRef]);

  // Esc to exit
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onExit(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onExit]);

  const getIframePoint = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const { x, y } = getIframePoint(e);
    const el = doc.elementFromPoint(x, y);
    if (el === hoveredElRef.current) return;
    hoveredElRef.current?.classList.remove('__ph__');
    if (el && el.tagName !== 'HTML' && el.tagName !== 'BODY') {
      el.classList.add('__ph__');
      hoveredElRef.current = el;
    } else {
      hoveredElRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    hoveredElRef.current?.classList.remove('__ph__');
    hoveredElRef.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const { x, y } = getIframePoint(e);
    const el = doc.elementFromPoint(x, y);
    if (!el || el.tagName === 'HTML' || el.tagName === 'BODY') return;
    el.classList.remove('__ph__');
    hoveredElRef.current = null;
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent ?? '')
      .replace(/\p{Extended_Pictographic}/gu, '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 50);
    onSelect({ tag, text, branchName });
  };

  return (
    <div
      className="absolute inset-0 z-30"
      style={{ cursor: 'crosshair' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    />
  );
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
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgContent, setEditingMsgContent] = useState('');
  const [aiPrompts, setAiPrompts] = useState<string[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Merge execution
  const [merging, setMerging] = useState(false);
  const [mergeErrMsg, setMergeErrMsg] = useState<string | null>(null);
  const [createdBranchId, setCreatedBranchId] = useState<string | null>(null);

  // Element picker
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const activeIframeRef = useRef<HTMLIFrameElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

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
      setIsSelectMode(false);
      setSelectedElement(null);
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

  // Exit select mode when switching between previews
  useEffect(() => {
    setIsSelectMode(false);
  }, [activeVersion]);

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
    let content = trimmed;
    if (selectedElement) {
      content = `<${selectedElement.tag}> from ${selectedElement.branchName} — ${trimmed}`;
      setSelectedElement(null);
    }
    addMessage('user', content);
    setInputValue('');
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
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#14141D' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-line flex-shrink-0 bg-surface-1">
        <button
          onClick={closeModal}
          className="flex items-center gap-2 text-base text-ink-muted hover:text-ink-primary transition-colors"
        >
          <ArrowLeft size={17} />
          <span>Back</span>
        </button>

        <div className="flex-1" />

<button
          onClick={handleMerge}
          disabled={!leftBranch || !rightBranch || merging || !!createdBranchId}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-white text-surface-0 text-base font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex-shrink-0"
        >
          {merging ? <Loader2 size={15} className="animate-spin" /> : <Merge size={15} />}
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
                <FourPointStar size={48} className="text-ink-muted" />
                <p className="text-sm text-ink-secondary leading-relaxed">
                  What should the merge keep from each version?
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={clsx(
                    'text-sm leading-relaxed group/msg relative',
                    msg.role === 'user'
                      ? 'text-ink-primary bg-surface-2 rounded-xl px-3 py-2 pr-8'
                      : 'text-ink-secondary px-1 py-0.5'
                  )}
                >
                  {msg.role === 'user' && editingMsgId === msg.id ? (
                    <textarea
                      autoFocus
                      value={editingMsgContent}
                      onChange={(e) => setEditingMsgContent(e.target.value)}
                      onBlur={() => {
                        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, content: editingMsgContent } : m));
                        setEditingMsgId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, content: editingMsgContent } : m));
                          setEditingMsgId(null);
                        }
                        if (e.key === 'Escape') {
                          setEditingMsgId(null);
                        }
                      }}
                      className="w-full resize-none bg-transparent text-sm text-ink-primary outline-none leading-snug pr-6"
                      rows={Math.max(1, editingMsgContent.split('\n').length)}
                    />
                  ) : (
                    msg.content
                  )}
                  {msg.role === 'user' && editingMsgId !== msg.id && (
                    <button
                      onClick={() => {
                        setEditingMsgId(msg.id);
                        setEditingMsgContent(msg.content);
                      }}
                      className="absolute top-2 right-2 opacity-40 group-hover/msg:opacity-100 transition-opacity text-ink-secondary hover:text-ink-primary"
                    >
                      <Pencil size={11} />
                    </button>
                  )}
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
                <div className="flex flex-wrap gap-2">
                  {aiPrompts.slice(0, 4).map((p, i) => (
                    <button
                      key={i}
                      onClick={() => addMessage('user', p)}
                      className="px-3 py-1.5 rounded-full border border-line bg-surface-3 hover:bg-surface-4 text-xs text-ink-secondary hover:text-ink-primary transition-colors text-left leading-snug"
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
            <div className="rounded-xl border border-line bg-surface-2 focus-within:border-white/20 transition-colors overflow-hidden">
              {/* Selected element context card */}
              {selectedElement && (
                <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/15 border border-violet-500/30 text-xs text-violet-300 min-w-0 flex-1">
                    <span className="font-mono font-medium flex-shrink-0">&lt;{selectedElement.tag}&gt;</span>
                    <span className="text-violet-400/60 flex-shrink-0">from</span>
                    <span className="font-medium flex-shrink-0">{selectedElement.branchName}</span>
                    {selectedElement.text && (
                      <span className="text-violet-400/50 truncate">· "{selectedElement.text}"</span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedElement(null)}
                    className="flex-shrink-0 text-ink-muted hover:text-ink-primary transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-end px-3 py-2.5">
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
                  rows={5}
                  disabled={merging}
                  className="flex-1 resize-none bg-transparent text-sm text-ink-primary placeholder:text-ink-muted outline-none leading-snug disabled:opacity-50"
                />
                <div className="flex items-center gap-1 flex-shrink-0 mb-0.5">
                  <button
                    onClick={() => setIsSelectMode((v) => !v)}
                    title={isSelectMode ? 'Cancel selection (Esc)' : 'Pick element from preview'}
                    className={clsx(
                      'w-7 h-7 rounded-full flex items-center justify-center transition-colors',
                      isSelectMode
                        ? 'bg-violet-500/30 text-violet-300 ring-1 ring-violet-500/50'
                        : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-3'
                    )}
                  >
                    <Crosshair size={13} />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || merging}
                    className={clsx(
                      'w-7 h-7 rounded-full flex items-center justify-center transition-colors',
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
          </div>
        </div>

        {/* ── Preview area ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 relative overflow-hidden" style={{ background: '#14141D' }}>

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

          <div className="absolute inset-0" style={{ background: '#14141D' }}>

            {/* Peek card — top-right, partially behind main preview */}
            {peekBranch && (
              <button
                onClick={() => setActiveVersion((v) => (v === 'left' ? 'right' : 'left'))}
                className="absolute z-10 overflow-hidden shadow-2xl transition-all group"
                style={{ right: '2%', top: '5%', width: '32%', height: '30%' }}
              >
                {peekCode ? (
                  <>
                    <ScaledIframe srcDoc={peekCode} title="peek-preview" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-center pt-4">
                      <span className="text-white text-sm font-semibold bg-violet-500 px-5 py-2 rounded-full shadow-lg">
                        Switch to {toDisplayName(peekBranch.name)}
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
                {toDisplayName(activeBranch?.name ?? '')}
              </span>
              {baseId === activeBranch?.id ? (
                <button
                  onClick={() => setBaseId(peekBranch?.id ?? '')}
                  className="inline-flex items-center px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
                >
                  Selected as Base
                </button>
              ) : (
                <button
                  onClick={() => setBaseId(activeBranch?.id ?? '')}
                  className="inline-flex items-center px-5 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
                >
                  Selected as Contributor
                </button>
              )}
            </div>

            {/* Main preview */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeVersion}
                initial={{ opacity: 0, scale: 0.97, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -10 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="absolute z-20 overflow-hidden border shadow-2xl transition-colors"
                style={{
                  left: '4%', top: '15%', right: '6%', bottom: '6%',
                  borderColor: isSelectMode ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.1)',
                }}
              >
                {activeCode ? (
                  <ScaledIframe
                    srcDoc={activeCode}
                    title="active-preview"
                    scrollable
                    renderWidth={1000}
                    iframeRef={activeIframeRef}
                    onScaleChange={setPreviewScale}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-2">
                    <span className="text-xs text-ink-muted">No preview yet</span>
                  </div>
                )}
                {isSelectMode && activeCode && (
                  <ElementPickerOverlay
                    iframeRef={activeIframeRef}
                    scale={previewScale}
                    branchName={toDisplayName(activeBranch?.name ?? '')}
                    onSelect={(el) => { setSelectedElement(el); setIsSelectMode(false); }}
                    onExit={() => setIsSelectMode(false)}
                  />
                )}
              </motion.div>
            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
}
