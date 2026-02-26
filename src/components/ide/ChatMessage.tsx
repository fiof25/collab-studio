import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Bot } from 'lucide-react';
import { CodeViewer } from './CodeViewer';
import type { ChatMessage as ChatMessageType } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        'flex gap-2.5',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-xl bg-surface-3 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot size={13} className="text-white" />
        </div>
      )}

      <div
        className={clsx(
          'max-w-[85%] flex flex-col gap-2',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={clsx(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-accent-violet text-white rounded-tr-sm'
              : 'bg-surface-2 text-ink-primary rounded-tl-sm border border-line'
          )}
        >
          {message.content}
          {message.isTyping && (
            <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 animate-typing-blink" />
          )}
        </div>

        {/* Code blocks */}
        {message.codeBlocks.map((block, i) => (
          <CodeViewer key={i} block={block} className="w-full max-w-md" />
        ))}
      </div>
    </motion.div>
  );
}
