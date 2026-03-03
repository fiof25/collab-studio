import { useCallback, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useChatStore } from '@/store/useChatStore';
import { useChatStream } from '@/hooks/useChatStream';
import { useProjectStore } from '@/store/useProjectStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
  branchId: string;
  accentColor: string;
}

export function ChatPanel({ branchId }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { threads, isStreaming, clearThread } = useChatStore();
  const { sendMessage, abort } = useChatStream(branchId);
  const { getBranchById, updateBranch } = useProjectStore();

  const handleRevert = useCallback(
    (code: string) => {
      const branch = getBranchById(branchId);
      if (!branch) return;
      updateBranch(branchId, {
        checkpoints: [
          ...branch.checkpoints,
          {
            id: `ckpt_${nanoid(6)}`,
            branchId,
            label: 'Restored version',
            timestamp: Date.now(),
            thumbnailUrl: '',
            codeSnapshot: code,
          },
        ],
      });
    },
    [branchId, getBranchById, updateBranch]
  );

  const messages = threads[branchId] ?? [];
  const branch = getBranchById(branchId);
  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.content?.length]);

  return (
    <div className="flex flex-col w-[420px] flex-shrink-0 h-full bg-surface-1 border-r border-line">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 scroll-smooth">
        {messages.length === 0 ? (
          <EmptyState branchName={branch?.name} />
        ) : (
          messages.map((msg, i) => {
            const revertCode =
              msg.role === 'user'
                ? messages.slice(i + 1).find((m) => m.role === 'assistant' && m.codeGenerated)?.codeGenerated
                : undefined;
            return (
              <ChatMessage
                key={msg.id}
                message={msg}
                isLastAssistant={msg.id === lastAssistantId}
                onRevert={handleRevert}
                revertCode={revertCode}
              />
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onStop={abort}
        isStreaming={isStreaming}
        onClear={messages.length > 0 ? () => clearThread(branchId) : undefined}
      />
    </div>
  );
}

function EmptyState({ branchName }: { branchName?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
      <Sparkles size={20} className="text-ink-muted" />
      <div>
        <p className="text-sm font-medium text-ink-secondary mb-1">
          {branchName ? `Vibe coding on "${branchName}"` : 'Start vibe coding'}
        </p>
        <p className="text-xs text-ink-muted leading-relaxed max-w-[240px]">
          Describe what you want to change and AI will update the prototype live.
        </p>
      </div>
    </div>
  );
}
