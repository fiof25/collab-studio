import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessagesSquare, MapPin, CheckCheck, CornerDownRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';
import { formatRelativeTime } from '@/utils/dateUtils';
import type { Comment } from '@/types/branch';

const PANEL_W = 300;

const DEMO_AUTHOR = {
  id: 'user_alice',
  name: 'Alice Kim',
  avatarUrl: '/catpfp.jpg',
  color: '#8B5CF6',
};

interface CommentsPanelProps {
  branchId: string;
}

export function CommentsPanel({ branchId }: CommentsPanelProps) {
  const { commentsPanelOpen, toggleCommentsPanel } = useUIStore();
  const { getBranchById, addComment, resolveComment, addReply } = useProjectStore();
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const branch = getBranchById(branchId);
  const allComments = branch?.comments ?? [];
  const open = allComments.filter((c) => !c.resolved);
  const resolved = allComments.filter((c) => c.resolved);
  const visible = showResolved ? allComments : open;

  useEffect(() => {
    if (commentsPanelOpen) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [allComments.length, commentsPanelOpen]);

  const handlePost = () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    setTimeout(() => {
      addComment(branchId, draft, DEMO_AUTHOR);
      setDraft('');
      setPosting(false);
    }, 250);
  };

  return (
    <AnimatePresence>
      {commentsPanelOpen && (
        <motion.div
          initial={{ x: PANEL_W, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: PANEL_W, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="fixed top-12 bottom-0 right-0 z-30 flex flex-col bg-surface-1 border-l border-line"
          style={{ width: PANEL_W }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessagesSquare size={13} className="text-ink-muted" />
              <span className="text-sm font-semibold text-ink-primary">Comments</span>
              {open.length > 0 && (
                <span className="text-xs text-ink-muted/60">{open.length} open</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {resolved.length > 0 && (
                <button
                  onClick={() => setShowResolved((v) => !v)}
                  className={clsx(
                    'text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                    showResolved
                      ? 'border-accent-violet text-accent-violet bg-accent-violet/10'
                      : 'border-line text-ink-muted hover:text-ink-secondary'
                  )}
                >
                  {showResolved ? 'Hide resolved' : `${resolved.length} resolved`}
                </button>
              )}
              <button
                onClick={toggleCommentsPanel}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-primary hover:bg-surface-2 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Comment list */}
          <div className="flex-1 overflow-y-auto py-2">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-ink-muted px-4 text-center">
                <MessagesSquare size={24} className="opacity-30" />
                <p className="text-sm">No comments yet.</p>
                <p className="text-xs opacity-60">Use the comment tool on the preview to pin feedback directly on the design.</p>
              </div>
            ) : (
              <div>
                {visible.map((comment) => (
                  <CommentRow
                    key={comment.id}
                    comment={comment}
                    branchId={branchId}
                    onResolve={() => resolveComment(branchId, comment.id)}
                    onReply={(content) => addReply(branchId, comment.id, content, DEMO_AUTHOR)}
                  />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Compose */}
          <div className="border-t border-line px-3 py-2.5 flex-shrink-0">
            <div className="flex gap-2.5 items-start">
              <img
                src={DEMO_AUTHOR.avatarUrl}
                alt={DEMO_AUTHOR.name}
                className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 object-cover"
              />
              <div className="flex-1 min-w-0">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost();
                    if (e.key === 'Escape') setDraft('');
                  }}
                  placeholder="Add a comment…"
                  rows={2}
                  className="w-full bg-surface-2 border border-line rounded-xl px-2.5 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted resize-none outline-none focus:border-accent-violet transition-colors leading-relaxed"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-ink-muted/50">⌘ Enter to post</span>
                  <button
                    onClick={handlePost}
                    disabled={!draft.trim() || posting}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent-violet text-white text-[10px] font-semibold disabled:opacity-40 transition-opacity"
                  >
                    <Send size={9} />
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Comment Row ────────────────────────────────────────────────────────────────

function CommentRow({
  comment,
  onResolve,
  onReply,
}: {
  comment: Comment;
  branchId: string;
  onResolve: () => void;
  onReply: (content: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isPinned = comment.x !== undefined;
  const isResolved = !!comment.resolved;

  useEffect(() => {
    if (replyOpen) textareaRef.current?.focus();
  }, [replyOpen]);

  const handleReply = () => {
    if (!draft.trim()) return;
    onReply(draft);
    setDraft('');
    setReplyOpen(false);
  };

  return (
    <div className={clsx('border-b border-line/50 last:border-0', isResolved && 'opacity-50')}>
      {/* Main comment */}
      <div className="flex gap-2.5 px-4 py-3 hover:bg-surface-2 transition-colors group">
        <img
          src={comment.authorAvatarUrl}
          alt={comment.authorName}
          className="w-7 h-7 rounded-full flex-shrink-0 object-cover mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-xs font-semibold" style={{ color: isResolved ? undefined : comment.authorColor }}>
              {comment.authorName.split(' ')[0]}
            </span>
            {isPinned && (
              <span className="flex items-center gap-0.5 text-[10px] text-ink-muted/50">
                <MapPin size={8} />
              </span>
            )}
            {isResolved && (
              <span className="text-[10px] text-green-500 flex items-center gap-0.5">
                <CheckCheck size={9} /> resolved
              </span>
            )}
            <span className="text-[10px] text-ink-muted ml-auto flex-shrink-0">
              {formatRelativeTime(comment.timestamp)}
            </span>
          </div>
          <p className={clsx('text-xs text-ink-secondary leading-relaxed', isResolved && 'line-through')}>
            {comment.content}
          </p>

          {/* Actions */}
          {!isResolved && (
            <div className="flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setReplyOpen((v) => !v)}
                className="text-[10px] text-ink-muted hover:text-ink-primary transition-colors flex items-center gap-0.5"
              >
                <CornerDownRight size={9} />
                Reply
              </button>
              <button
                onClick={onResolve}
                className="text-[10px] text-ink-muted hover:text-green-400 transition-colors flex items-center gap-0.5"
              >
                <CheckCheck size={9} />
                Resolve
              </button>
            </div>
          )}
          {isResolved && (
            <button
              onClick={onResolve}
              className="text-[10px] text-ink-muted hover:text-ink-primary mt-1 transition-colors"
            >
              Unresolve
            </button>
          )}
        </div>
      </div>

      {/* Replies */}
      {(comment.replies ?? []).map((reply) => (
        <div key={reply.id} className="flex gap-2 pl-9 pr-4 py-2 bg-surface-2/50">
          <img src={reply.authorAvatarUrl} alt={reply.authorName} className="w-5 h-5 rounded-full flex-shrink-0 object-cover mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 mb-0.5">
              <span className="text-[10px] font-semibold" style={{ color: reply.authorColor }}>
                {reply.authorName.split(' ')[0]}
              </span>
              <span className="text-[10px] text-ink-muted ml-auto">{formatRelativeTime(reply.timestamp)}</span>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">{reply.content}</p>
          </div>
        </div>
      ))}

      {/* Reply input */}
      <AnimatePresence>
        {replyOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 pl-9 pr-4 pb-2.5 pt-1">
              <img src={DEMO_AUTHOR.avatarUrl} alt={DEMO_AUTHOR.name} className="w-5 h-5 rounded-full flex-shrink-0 object-cover mt-0.5" />
              <div className="flex-1 min-w-0">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReply();
                    if (e.key === 'Escape') { setReplyOpen(false); setDraft(''); }
                  }}
                  placeholder="Reply…"
                  rows={2}
                  className="w-full bg-surface-2 border border-line rounded-lg px-2 py-1.5 text-xs text-ink-primary placeholder:text-ink-muted resize-none outline-none focus:border-accent-violet transition-colors leading-relaxed"
                />
                <div className="flex justify-end gap-1.5 mt-1">
                  <button
                    onClick={() => { setReplyOpen(false); setDraft(''); }}
                    className="text-[10px] text-ink-muted hover:text-ink-primary transition-colors px-2 py-0.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReply}
                    disabled={!draft.trim()}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent-violet text-white text-[10px] font-semibold disabled:opacity-40 transition-opacity"
                  >
                    <Send size={8} />
                    Reply
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
