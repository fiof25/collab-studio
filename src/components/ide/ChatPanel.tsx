import { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Bot } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
  branchId: string;
  accentColor: string;
}

export function ChatPanel({ branchId, accentColor }: ChatPanelProps) {
  const thread = useChatStore((s) => s.threads[branchId]);
  const messages = thread?.messages ?? [];
  const isLoading = thread?.isLoading ?? false;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, messages[messages.length - 1]?.content]);

  return (
    <div className="flex flex-col h-full bg-surface-1">
      {/* Accent top border */}
      <div className="h-0.5 flex-shrink-0" style={{ background: accentColor }} />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
          </AnimatePresence>
        )}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <ThinkingIndicator />
        )}
      </div>

      <ChatInput branchId={branchId} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-violet to-accent-cyan flex items-center justify-center">
        <Bot size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink-primary mb-1">Start building</p>
        <p className="text-xs text-ink-muted max-w-[200px] leading-relaxed">
          Describe what you want to add or change, and the AI will build it for you.
        </p>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex gap-2.5 justify-start">
      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-accent-violet to-accent-cyan flex items-center justify-center flex-shrink-0">
        <Bot size={13} className="text-white" />
      </div>
      <div className="bg-surface-2 border border-line rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-ink-muted"
            style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}
