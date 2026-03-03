import { useEffect, useRef } from 'react';
import { Sparkles, Trash2 } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { useChatStream } from '@/hooks/useChatStream';
import { useProjectStore } from '@/store/useProjectStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
  branchId: string;
  accentColor: string;
}

export function ChatPanel({ branchId, accentColor }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { threads, isStreaming, clearThread } = useChatStore();
  const { sendMessage, abort } = useChatStream(branchId);
  const getBranchById = useProjectStore((s) => s.getBranchById);

  const messages = threads[branchId] ?? [];
  const branch = getBranchById(branchId);
  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.content?.length]);

  return (
    <div className="flex flex-col w-[420px] flex-shrink-0 h-full bg-surface-1 border-r border-line">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-line flex-shrink-0 h-10">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-ink-muted" />
          <span className="text-sm font-semibold text-ink-primary">Vibe Chat</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-3 text-ink-muted border border-line">
            gemini-2.0-flash
          </span>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => clearThread(branchId)}
            disabled={isStreaming}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink-secondary hover:bg-surface-2 transition-colors disabled:opacity-40"
            title="Clear thread"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 scroll-smooth">
        {messages.length === 0 ? (
          <EmptyState branchName={branch?.name} />
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isLastAssistant={msg.id === lastAssistantId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onStop={abort}
        isStreaming={isStreaming}
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
