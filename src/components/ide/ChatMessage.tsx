import { memo } from 'react';
import { RotateCcw, Code2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { ChatMessage as ChatMessageType } from '@/types/chat';
import { QuestionCard } from './QuestionCard';

interface ChatMessageProps {
  message: ChatMessageType;
  isLastAssistant: boolean;
  onRevert?: (code: string) => void;
  revertCode?: string;
  onQuestionAnswer?: (answer: string) => void;
}

function renderContent(content: string) {
  return content.replace(/```[\w+.-]+[ \t]*\r?\n[\s\S]*?```/g, '').trim();
}

export const ChatMessage = memo(function ChatMessage({ message, isLastAssistant, onRevert, revertCode, onQuestionAnswer }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const displayContent = renderContent(message.content);

  // Show building indicator when route is 'build', streaming, and no content yet
  const showBuildingIndicator = message.route === 'build' && message.isStreaming && !displayContent;

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
          {showBuildingIndicator ? (
            <BuildingIndicator />
          ) : message.isStreaming && !displayContent ? (
            <ThinkingDots />
          ) : (
            <>
              {displayContent || '…'}
              {isLastAssistant && message.isStreaming && (
                <span className="inline-block w-0.5 h-3.5 bg-white/40 ml-0.5 align-middle animate-pulse" />
              )}
            </>
          )}
        </div>

        {/* Question card */}
        {message.questions && !message.selectedAnswer && onQuestionAnswer && (
          <QuestionCard
            questions={message.questions}
            onAnswer={onQuestionAnswer}
            disabled={message.isStreaming}
          />
        )}
        {message.selectedAnswer && (
          <p className="text-xs text-ink-muted mt-1 px-3">You chose: {message.selectedAnswer}</p>
        )}

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

function BuildingIndicator() {
  return (
    <span className="inline-flex items-center gap-2 text-ink-muted">
      <Code2 size={13} className="animate-pulse" />
      <span className="text-xs">Building...</span>
      <span className="inline-flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-violet-400/60 animate-bounce"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: '900ms' }}
          />
        ))}
      </span>
    </span>
  );
}
