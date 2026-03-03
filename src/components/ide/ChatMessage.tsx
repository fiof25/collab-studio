import { memo } from 'react';
import { CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { ChatMessage as ChatMessageType } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  isLastAssistant: boolean;
}

function renderContent(content: string) {
  // Strip the html code block for display (we show a chip instead)
  return content.replace(/```html\n[\s\S]*?```/g, '').trim();
}

export const ChatMessage = memo(function ChatMessage({ message, isLastAssistant }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const displayContent = renderContent(message.content);

  return (
    <div className={clsx('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
      <div className={clsx('max-w-[85%] flex flex-col gap-1.5', isUser && 'items-end')}>
        <div
          className={clsx(
            'px-3 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
            isUser
              ? 'bg-surface-3 text-ink-primary rounded-tr-sm'
              : 'bg-surface-2 text-ink-secondary rounded-tl-sm'
          )}
        >
          {displayContent || (message.isStreaming ? '' : '…')}
          {message.isStreaming && isLastAssistant && (
            <span className="inline-block w-0.5 h-3.5 bg-violet-400 ml-0.5 align-middle animate-pulse" />
          )}
        </div>

        {message.codeGenerated && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 w-fit">
            <CheckCircle size={11} className="text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">Code updated</span>
          </div>
        )}
      </div>

    </div>
  );
});
