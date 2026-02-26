import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';
import { formatRelativeTime } from '@/utils/dateUtils';

// Demo author: Alice Kim (first collaborator)
const DEMO_AUTHOR = {
  id: 'user_alice',
  name: 'Alice Kim',
  avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=alice&backgroundColor=b6e3f4',
  color: '#8B5CF6',
};

interface CommentsModalProps {
  branchId: string;
}

export function CommentsModal({ branchId }: CommentsModalProps) {
  const { activeModal, closeModal } = useUIStore();
  const { getBranchById, addComment } = useProjectStore();
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const branch = getBranchById(branchId);
  const open = activeModal === 'comments';

  const handlePost = () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    setTimeout(() => {
      addComment(branchId, draft, DEMO_AUTHOR);
      setDraft('');
      setPosting(false);
    }, 300);
  };

  if (!branch) return null;

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title={`Comments · ${branch.name}`}
      size="sm"
    >
      <div className="flex flex-col gap-4">
        {/* Comment list */}
        <div className="max-h-72 overflow-y-auto space-y-4 pr-1">
          {branch.comments.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-6">
              No comments yet. Be the first to leave a note!
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {branch.comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-2.5"
                >
                  <img
                    src={comment.authorAvatarUrl}
                    alt={comment.authorName}
                    className="w-7 h-7 rounded-full flex-shrink-0 bg-surface-3"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: comment.authorColor }}
                      >
                        {comment.authorName}
                      </span>
                      <span className="text-2xs text-ink-muted">
                        {formatRelativeTime(comment.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-ink-secondary leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-line" />

        {/* Add comment */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <img
              src={DEMO_AUTHOR.avatarUrl}
              alt={DEMO_AUTHOR.name}
              className="w-7 h-7 rounded-full flex-shrink-0 bg-surface-3 mt-1"
            />
            <textarea
              className="flex-1 bg-surface-2 border border-line rounded-xl px-3 py-2 text-sm text-ink-primary placeholder-ink-muted resize-none focus:outline-none focus:border-accent-violet transition-colors leading-relaxed"
              placeholder="Add a comment..."
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost();
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xs text-ink-muted">⌘ Enter to post</span>
            <Button
              variant="primary"
              size="sm"
              icon={<Send size={12} />}
              onClick={handlePost}
              loading={posting}
              disabled={!draft.trim()}
            >
              Post
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
