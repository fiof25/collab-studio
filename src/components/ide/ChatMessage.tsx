import { memo } from 'react';
import { RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import type { ChatMessage as ChatMessageType } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  isLastAssistant: boolean;
  onRevert?: (code: string) => void;
  revertCode?: string;
}

function renderContent(content: string) {
  return content.replace(/```[\w+.-]+[ \t]*\r?\n[\s\S]*?```/g, '').trim();
}

function isWritingCode(content: string) {
  const openIdx = content.indexOf('```html');
  if (openIdx === -1) return false;
  const closeIdx = content.indexOf('```', openIdx + 7);
  return closeIdx === -1;
}

export const ChatMessage = memo(function ChatMessage({ message, isLastAssistant, onRevert, revertCode }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const writingCode = message.isStreaming && isWritingCode(message.content);
  const textBeforeCode = writingCode
    ? message.content.slice(0, message.content.indexOf('```html')).trim()
    : null;
  const displayContent = renderContent(message.content);

  const canRevert = isUser && !!revertCode && !!onRevert;

  return (
    <div className={clsx('group flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
      <div className={clsx('max-w-[85%] flex flex-col gap-1', isUser && 'items-end')}>
        <div
          className={clsx(
            'px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
            isUser
              ? 'bg-surface-3 text-ink-primary rounded-tr-sm'
              : 'bg-surface-2 text-ink-secondary rounded-tl-sm'
          )}
        >
          {message.isStreaming ? (
            <ThinkingDots />
          ) : (
            <>
              {displayContent || '…'}
              {isLastAssistant && writingCode && (
                <span className="inline-block w-0.5 h-3.5 bg-white/40 ml-0.5 align-middle animate-pulse" />
              )}
            </>
          )}
        </div>

        {canRevert && (
          <button
            onClick={() => onRevert!(revertCode!)}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink-secondary px-1 py-0.5"
            title="Revert to this version"
          >
            <RotateCcw size={10} />
            Revert
          </button>
        )}
      </div>
    </div>
  );
});

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-1 align-middle">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }}
        />
      ))}
    </span>
  );
}
