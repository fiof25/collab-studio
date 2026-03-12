import { useState, useRef, useEffect } from 'react';
import { RefreshCw, MessageCircle, X, Send, MonitorSmartphone, Camera, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { FullCodeViewer } from './CodeViewer';
import { BlueprintPanel } from './BlueprintPanel';
import { useProjectStore } from '@/store/useProjectStore';
import { useUIStore } from '@/store/useUIStore';
import { formatRelativeTime } from '@/utils/dateUtils';
import type { Comment } from '@/types/branch';

interface PreviewPanelProps {
  branchId: string;
  accentColor: string;
}

type ActiveTab = 'preview' | 'code' | 'blueprint';
type DeviceWidth = 'full' | 'tablet' | 'mobile';

const DEVICE_CYCLE: DeviceWidth[] = ['full', 'tablet', 'mobile'];
const DEVICE_WIDTHS: Record<DeviceWidth, string> = { full: '100%', tablet: '768px', mobile: '375px' };
const DEVICE_LABELS: Record<DeviceWidth, string> = { full: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' };

const DEMO_AUTHOR = {
  id: 'user_alice',
  name: 'Alice Kim',
  avatarUrl: '/catpfp.jpg',
  color: '#8B5CF6',
};

export function PreviewPanel({ branchId, accentColor }: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
  const [device, setDevice] = useState<DeviceWidth>('full');
  const [refreshKey, setRefreshKey] = useState(0);
  const [commentMode, setCommentMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [thumbnailMode, setThumbnailMode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const setPanelSide = useUIStore((s) => s.setPanelSide);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const branch = useProjectStore((s) => s.project?.branches.find((b) => b.id === branchId));
  const updateBranch = useProjectStore((s) => s.updateBranch);
  const addComment = useProjectStore((s) => s.addComment);
  const addReply = useProjectStore((s) => s.addReply);
  const latestCheckpoint = branch?.checkpoints[branch.checkpoints.length - 1];
  const latestFiles = latestCheckpoint?.files;
  const latestCode =
    latestFiles?.find((f) => f.path === 'index.html')?.content ??
    latestCheckpoint?.codeSnapshot ??
    '';
  const pinnedComments = (branch?.comments ?? []).filter((c) => c.x !== undefined && c.y !== undefined);
  const currentScrollY = branch?.previewScrollY ?? 0;

  // Resolve active file — fall back to index.html or first file; if path not in list, reset
  const activeFile =
    latestFiles?.find((f) => f.path === activeFilePath) ??
    latestFiles?.find((f) => f.path === 'index.html') ??
    latestFiles?.[0] ??
    null;
  const activeFileContent = activeFile?.content ?? latestCode;
  const activeFileLanguage = activeFile?.language ?? 'html';

  useEffect(() => { setRefreshKey((k) => k + 1); }, [latestCode]);
  useEffect(() => { setPanelSide(activeTab === 'preview' ? 'preview' : 'code'); }, [activeTab, setPanelSide]);

  // Exit comment mode when switching tabs
  useEffect(() => {
    if (activeTab !== 'preview') { setCommentMode(false); setPendingPin(null); }
  }, [activeTab]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!commentMode) return;
    if ((e.target as HTMLElement).closest('[data-pin]')) return;
    const rect = overlayRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ x, y });
    setActiveCommentId(null);
  };

  const handlePinComment = (content: string) => {
    if (!pendingPin || !content.trim()) return;
    addComment(branchId, content, DEMO_AUTHOR, pendingPin);
    setPendingPin(null);
  };

  return (
    <div className="flex flex-col h-full bg-surface-1">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-4 border-b border-line flex-shrink-0 h-12">
        <div className="flex items-center gap-1">
          {(['preview', 'code', 'blueprint'] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
                activeTab === tab ? 'text-ink-primary bg-surface-2' : 'text-ink-muted hover:text-ink-secondary'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'preview' && (
          <div className="flex items-center gap-1">
            {/* Device toggle */}
            <button
              onClick={() => setDevice((d) => DEVICE_CYCLE[(DEVICE_CYCLE.indexOf(d) + 1) % DEVICE_CYCLE.length])}
              title={`${DEVICE_LABELS[device]} — click to switch`}
              className={clsx(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                device !== 'full' ? 'text-accent-violet bg-accent-violet/10' : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-2'
              )}
            >
              <MonitorSmartphone size={14} />
            </button>
            <div className="w-px h-4 bg-line mx-0.5" />
            {/* Thumbnail selector */}
            <button
              onClick={() => setThumbnailMode(true)}
              title="Set canvas thumbnail"
              className={clsx(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                thumbnailMode
                  ? 'text-accent-violet bg-accent-violet/10'
                  : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-2'
              )}
            >
              <Camera size={15} />
            </button>
            {/* Comment mode toggle */}
            <button
              onClick={() => { setCommentMode((v) => !v); setPendingPin(null); setActiveCommentId(null); }}
              title={commentMode ? 'Exit annotation mode' : 'Annotate preview'}
              className={clsx(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                commentMode ? 'bg-accent-violet text-white' : 'text-ink-muted hover:text-ink-secondary'
              )}
            >
              <MessageCircle size={15} />
            </button>
            <button
              onClick={() => {
                if (!iframeRef.current || !latestCode) return;
                iframeRef.current.srcdoc = '';
                requestAnimationFrame(() => { if (iframeRef.current) iframeRef.current.srcdoc = latestCode; });
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
              title="Refresh preview"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' ? (
          <div className="w-full h-full overflow-hidden bg-surface-0 p-2 flex items-stretch justify-center">
            <div
              ref={previewContainerRef}
              className="h-full bg-white rounded-lg overflow-hidden shadow-float relative transition-all duration-200"
              style={{ width: DEVICE_WIDTHS[device], maxWidth: '100%' }}
            >
              {latestCode ? (
                <iframe
                  key={refreshKey}
                  ref={iframeRef}
                  srcDoc={latestCode}
                  className="w-full h-full border-none"
                  title="Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <p className="text-sm">No preview available</p>
                </div>
              )}

              {/* Comment overlay */}
              <div
                ref={overlayRef}
                onClick={handleOverlayClick}
                className={clsx(
                  'absolute inset-0',
                  commentMode ? 'cursor-crosshair' : 'pointer-events-none'
                )}
              >
                {/* Existing pinned comments */}
                {pinnedComments.map((comment) => (
                  <CommentPin
                    key={comment.id}
                    comment={comment}
                    active={activeCommentId === comment.id}
                    commentMode={commentMode}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCommentId(activeCommentId === comment.id ? null : comment.id);
                      setPendingPin(null);
                    }}
                    onClose={() => setActiveCommentId(null)}
                    onReply={(content) => addReply(branchId, comment.id, content, DEMO_AUTHOR)}
                  />
                ))}

                {/* Pending (new) pin */}
                {pendingPin && (
                  <NewCommentPin
                    x={pendingPin.x}
                    y={pendingPin.y}
                    onSubmit={handlePinComment}
                    onCancel={() => setPendingPin(null)}
                  />
                )}
              </div>

              {/* Comment mode banner */}
              {commentMode && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent-violet text-white text-xs font-medium shadow-lg pointer-events-none select-none">
                  Click anywhere to leave a comment
                </div>
              )}

              {/* Thumbnail selection overlay */}
              {thumbnailMode && (
                <ThumbnailSelector
                  containerHeight={previewContainerRef.current?.clientHeight ?? 600}
                  initialY={currentScrollY}
                  onConfirm={(y) => {
                    updateBranch(branchId, { previewScrollY: y });
                    setThumbnailMode(false);
                  }}
                  onCancel={() => setThumbnailMode(false)}
                />
              )}
            </div>
          </div>
        ) : activeTab === 'code' ? (
          <div className="w-full h-full flex flex-col overflow-hidden">
            {/* File tabs — only shown when multiple files exist */}
            {latestFiles && latestFiles.length > 1 && (
              <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-line bg-surface-1 overflow-x-auto flex-shrink-0">
                {latestFiles.map((f) => {
                  const filename = f.path.split('/').pop() ?? f.path;
                  const isActive = f.path === (activeFile?.path ?? null);
                  return (
                    <button
                      key={f.path}
                      onClick={() => setActiveFilePath(f.path)}
                      title={f.path}
                      className={clsx(
                        'px-3 py-1 rounded-md text-xs font-mono transition-colors flex-shrink-0 whitespace-nowrap',
                        isActive
                          ? 'text-ink-primary bg-surface-2'
                          : 'text-ink-muted hover:text-ink-secondary hover:bg-surface-2/50'
                      )}
                    >
                      {filename}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-auto">
              {activeFileContent ? (
                <FullCodeViewer
                  code={activeFileContent}
                  language={activeFileLanguage}
                  className="rounded-none border-0 border-t border-line"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-ink-muted text-sm">
                  No code to display
                </div>
              )}
            </div>
          </div>
        ) : (
          <BlueprintPanel branchId={branchId} accentColor={accentColor} />
        )}
      </div>
    </div>
  );
}

// ── Thumbnail Selector ────────────────────────────────────────────────────────

function ThumbnailSelector({
  containerHeight,
  initialY,
  onConfirm,
  onCancel,
}: {
  containerHeight: number;
  initialY: number;
  onConfirm: (y: number) => void;
  onCancel: () => void;
}) {
  const frameRatio = 138 / 240;
  const frameH = containerHeight * frameRatio;
  const maxY = Math.max(0, containerHeight - frameH);

  const [frameY, setFrameY] = useState(Math.min(initialY, maxY));
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ mouseY: 0, startFrameY: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStartRef.current = { mouseY: e.clientY, startFrameY: frameY };
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      const delta = e.clientY - dragStartRef.current.mouseY;
      const next = Math.min(maxY, Math.max(0, dragStartRef.current.startFrameY + delta));
      setFrameY(next);
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, maxY]);

  return (
    <div className="absolute inset-0 z-30">
      {/* Dark overlay above the frame */}
      <div
        className="absolute inset-x-0 top-0 bg-black/50"
        style={{ height: frameY }}
      />
      {/* The draggable frame */}
      <div
        onMouseDown={handleMouseDown}
        className={clsx(
          'absolute inset-x-0 border-2 border-accent-violet rounded-sm',
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        style={{ top: frameY, height: frameH }}
      >
        {/* Grab handle indicator */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
          <div className="w-8 h-1 rounded-full bg-white/60" />
        </div>
      </div>
      {/* Dark overlay below the frame */}
      <div
        className="absolute inset-x-0 bottom-0 bg-black/50"
        style={{ top: frameY + frameH }}
      />
      {/* Confirm / Cancel buttons */}
      <div
        className="absolute flex gap-2 right-2"
        style={{ top: Math.min(frameY + frameH + 8, containerHeight - 36) }}
      >
        <button
          onClick={onCancel}
          className="w-7 h-7 rounded-lg bg-surface-1/90 backdrop-blur-sm border border-line flex items-center justify-center text-ink-muted hover:text-ink-primary transition-colors"
        >
          <X size={14} />
        </button>
        <button
          onClick={() => onConfirm(frameY)}
          className="w-7 h-7 rounded-lg bg-accent-violet text-white flex items-center justify-center hover:bg-accent-violet/90 transition-colors"
        >
          <Check size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Comment Pin ────────────────────────────────────────────────────────────────

function CommentPin({
  comment,
  active,
  commentMode,
  onClick,
  onClose,
  onReply,
}: {
  comment: Comment;
  active: boolean;
  commentMode: boolean;
  onClick: (e: React.MouseEvent) => void;
  onClose: () => void;
  onReply: (content: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const popoverRight = (comment.x ?? 0) > 60;
  const popoverBottom = (comment.y ?? 0) > 55;

  useEffect(() => { if (replyOpen) replyRef.current?.focus(); }, [replyOpen]);

  // Close reply input when popover closes
  useEffect(() => { if (!active) { setReplyOpen(false); setDraft(''); } }, [active]);

  const handleReply = () => {
    if (!draft.trim()) return;
    onReply(draft);
    setDraft('');
    setReplyOpen(false);
  };

  return (
    <div
      data-pin
      className="absolute"
      style={{ left: `${comment.x}%`, top: `${comment.y}%`, transform: 'translate(-50%, -100%)' }}
    >
      {/* Popover */}
      {active && (
        <div
          className={clsx(
            'absolute z-20 w-64 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden',
            popoverBottom ? 'bottom-full mb-2' : 'top-full mt-2',
            popoverRight ? 'right-0' : 'left-0'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
            <img src={comment.authorAvatarUrl} alt={comment.authorName} className="w-5 h-5 rounded-full flex-shrink-0 object-cover" />
            <span className="text-xs font-semibold flex-1 truncate" style={{ color: comment.authorColor }}>
              {comment.authorName.split(' ')[0]}
            </span>
            <span className="text-[10px] text-gray-400">{formatRelativeTime(comment.timestamp)}</span>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
              <X size={11} />
            </button>
          </div>

          {/* Content */}
          <p className="text-xs text-gray-700 leading-relaxed px-3 pb-2.5">{comment.content}</p>

          {/* Replies */}
          {(comment.replies ?? []).length > 0 && (
            <div className="border-t border-gray-100 px-3 pt-2 pb-1 space-y-2">
              {(comment.replies ?? []).map((reply) => (
                <div key={reply.id} className="flex gap-2">
                  <img src={reply.authorAvatarUrl} alt={reply.authorName} className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 object-cover" />
                  <div>
                    <span className="text-[10px] font-semibold" style={{ color: reply.authorColor }}>
                      {reply.authorName.split(' ')[0]}
                    </span>
                    <p className="text-[11px] text-gray-600 leading-snug">{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply area */}
          {replyOpen ? (
            <div className="border-t border-gray-100 px-3 pt-2 pb-2.5">
              <div className="flex gap-2 items-start">
                <img src={DEMO_AUTHOR.avatarUrl} alt={DEMO_AUTHOR.name} className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 object-cover" />
                <textarea
                  ref={replyRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply();
                    if (e.key === 'Escape') { setReplyOpen(false); setDraft(''); }
                  }}
                  placeholder="Reply…"
                  rows={2}
                  className="flex-1 text-xs text-gray-700 placeholder-gray-300 resize-none outline-none border border-gray-200 rounded-lg px-2 py-1.5 focus:border-violet-400 transition-colors leading-relaxed"
                />
              </div>
              <div className="flex justify-end gap-1.5 mt-1.5">
                <button
                  onClick={() => { setReplyOpen(false); setDraft(''); }}
                  className="text-[10px] text-gray-400 hover:text-gray-600 px-2 py-0.5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReply}
                  disabled={!draft.trim()}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-500 text-white text-[10px] font-semibold disabled:opacity-40 transition-opacity"
                >
                  <Send size={8} />
                  Reply
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-100 px-3 py-1.5">
              <button
                onClick={() => setReplyOpen(true)}
                className="text-[10px] text-gray-400 hover:text-gray-700 transition-colors"
              >
                Reply…
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pin bubble */}
      <button
        data-pin
        onClick={onClick}
        className={clsx(
          'rounded-full shadow-md transition-all select-none overflow-hidden border-2',
          active ? 'w-8 h-8 scale-110' : 'w-7 h-7 hover:scale-110',
          !commentMode && 'pointer-events-auto'
        )}
        style={{ borderColor: comment.authorColor }}
        title={comment.authorName}
      >
        <img src={comment.authorAvatarUrl} alt={comment.authorName} className="w-full h-full object-cover" />
      </button>
      {/* Tail */}
      <div
        className="w-0 h-0 mx-auto"
        style={{
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: `5px solid ${comment.authorColor}`,
        }}
      />
    </div>
  );
}

// ── New Comment Pin ────────────────────────────────────────────────────────────

function NewCommentPin({
  x,
  y,
  onSubmit,
  onCancel,
}: {
  x: number;
  y: number;
  onSubmit: (content: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverRight = x > 60;
  const popoverBottom = y > 55;

  useEffect(() => { textareaRef.current?.focus(); }, []);

  return (
    <div
      data-pin
      className="absolute"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -100%)' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Input popover */}
      <div
        className={clsx(
          'absolute z-20 w-60 bg-surface-1 border border-line rounded-xl overflow-hidden',
          popoverBottom ? 'bottom-full mb-2' : 'top-full mt-2',
          popoverRight ? 'right-0' : 'left-0'
        )}
      >
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b border-line">
          <img src={DEMO_AUTHOR.avatarUrl} alt={DEMO_AUTHOR.name} className="w-5 h-5 rounded-full flex-shrink-0" />
          <span className="text-xs font-semibold" style={{ color: DEMO_AUTHOR.color }}>{DEMO_AUTHOR.name.split(' ')[0]}</span>
          <button onClick={onCancel} className="ml-auto text-ink-muted hover:text-ink-primary transition-colors">
            <X size={11} />
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit(draft);
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Leave a comment…"
          rows={2}
          className="w-full px-3 py-2 text-xs text-ink-primary placeholder:text-ink-muted bg-surface-1 resize-none outline-none leading-relaxed"
        />
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="text-[10px] text-ink-muted">⌘ Enter to post</span>
          <button
            onClick={() => onSubmit(draft)}
            disabled={!draft.trim()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white text-[#0D0D12] text-[10px] font-semibold disabled:opacity-40 transition-opacity"
          >
            <Send size={9} />
            Post
          </button>
        </div>
      </div>

      {/* Ghost pin */}
      <div
        className="w-7 h-7 rounded-full shadow-md overflow-hidden border-2 opacity-80"
        style={{ borderColor: DEMO_AUTHOR.color }}
      >
        <img src={DEMO_AUTHOR.avatarUrl} alt={DEMO_AUTHOR.name} className="w-full h-full object-cover" />
      </div>
      <div
        className="w-0 h-0 mx-auto"
        style={{
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: `5px solid ${DEMO_AUTHOR.color}`,
        }}
      />
    </div>
  );
}
